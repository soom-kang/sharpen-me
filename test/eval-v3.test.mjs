import test from 'node:test';
import assert from 'node:assert/strict';
import { cases } from '../evals/additional-cases.mjs';
import { readFile } from 'node:fs/promises';
import { matrixFor, idOf, assertV3, assertSame, seal, validateRecords, dispatchMatrix, parseArgs, selectedProviders } from '../scripts/eval-v3-contract.mjs';
import { observeV3, taskPrompt, providerCommand, modelEvidence } from '../scripts/eval-v3-observation.mjs';
import { blindPacket, summarize, blindId } from '../scripts/eval-v3-summary.mjs';
import { containerCommand, dockerCheck, dockerPreflight } from '../scripts/eval-docker.mjs';
import { sha256 } from '../scripts/eval-resume.mjs';
const config = JSON.parse(await readFile(new URL('../evals/config.json', import.meta.url)));
const matrix = matrixFor(cases, config);
const normal = cases[0];
const result = text => ({ stdout: JSON.stringify({type:'item.completed',item:{type:'agent_message',text}})+'\n'+JSON.stringify({type:'turn.completed',usage:{input_tokens:3,output_tokens:2}}), stderr:'', code:0, durationMs:4 });
const read = text => JSON.stringify({type:'item.completed',item:{type:'command_execution',command:`cat .agents/skills/${normal.skill}/SKILL.md`,exit_code:0,aggregated_output:text}})+'\n';
const identity = item => ({schemaVersion:3,id:idOf(item),provider:item.provider,version:item.version,case:item.testCase.id,repeat:item.repeat,inputHash:'frozen'});

test('renamed 48-case expectations retain their approved hash and category balance', () => {
  assert.equal(sha256(JSON.stringify(cases)), '8eccbb25a9d41cabc84d61fecc8bb03d549c93366b0333f39479d639b8511a77');
  assert.equal(matrix.length,288);
  assert.equal(cases.filter(c=>c.language==='ko').length,8);
  assert.equal(cases.filter(c=>c.language==='en').length,8);
  for (const provider of selectedProviders(config)) {
    const lane=matrix.filter(m=>m.provider===provider);
    assert.equal(lane.length,288);
    for(let i=0;i<lane.length;i+=2) {
      assert.equal(lane[i].testCase.id,lane[i+1].testCase.id);
      assert.notEqual(lane[i].version,lane[i+1].version);
    }
    assert.equal(lane.filter((_,i)=>i%2===0).filter(m=>m.version==='before').length,72);
  }
  assert.throws(()=>matrixFor([...cases,cases[0]],config),/Duplicate/);
});

test('implicit task prompts contain no skill name, installation path or answer key',()=>{
  for(const c of cases.filter(c=>c.invocation==='implicit')) for(const provider of ['codex','claude']) {
    const prompt=taskPrompt(provider,c);
    assert.doesNotMatch(prompt,/sharpen-(clarify|review|challenge|assess|refine|cold-review|brief|dedupe)|\.agents|\.claude|expectedSkills|mustNot/);
  }
});

test('natural responses need no JSON; JSON retains type checks and additional fields',()=>{
  const source='---\nname: example\n---\nSource.';
  const run=result('A concise finding.');run.stdout=read(source)+run.stdout;
  const text=observeV3('codex',run,{...normal,output:'text'},{[normal.skill]:source},'gpt-6-astra');
  assert.equal(text.status,'REVIEW_REQUIRED');assert.equal(text.response,null);
  assert.equal(observeV3('codex',run,normal,{[normal.skill]:source},'gpt-6-astra').reason,'OUTPUT_CONTRACT_FAILED');
  const json={decision:'done',findings:[],evidence:[],limitations:[],changes:[],extra:42};
  const valid=result(JSON.stringify(json));valid.stdout=read(source)+valid.stdout;
  assert.equal(observeV3('codex',valid,normal,{[normal.skill]:source},'gpt-6-astra').response.extra,42);
  json.findings=[2];const invalid=result(JSON.stringify(json));invalid.stdout=read(source)+invalid.stdout;
  assert.equal(observeV3('codex',invalid,normal,{[normal.skill]:source},'gpt-6-astra').reason,'OUTPUT_CONTRACT_FAILED');
});

test('semantic similarity and a path mention cannot prove source loading; mismatch stops',()=>{
  const c={...normal,invocation:'implicit',expectedSkills:[normal.skill],output:'text'};
  const observed=observeV3('codex',result(`I used ${normal.skill} and found a bug.`),c,{[normal.skill]:'Full instructions'},'gpt-6-astra');
  assert.equal(observed.selection,'UNCLEAR');assert.equal(observed.status,'UNCLEAR');
  const wrong=result('Answer');wrong.stdout+='\n'+JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'Answer',model:'gpt-other'}});
  assert.equal(observeV3('codex',wrong,c,{[normal.skill]:'Full instructions'},'gpt-6-astra').reason,'MODEL_MISMATCH');
  const quota={...result(''),code:1,stderr:'429 quota exceeded'};
  assert.equal(observeV3('codex',quota,c,{},'gpt-6-astra').reason,'QUOTA_OR_BUDGET');
  assert.equal(observeV3('codex',{...quota,timedOut:true},c,{},'gpt-6-astra').reason,'TIMEOUT');
});

test('provider commands pin equal medium effort without fallback or nested agents',()=>{
  for(const provider of ['codex','claude']) {
    const argv=providerCommand(provider,normal,'/fixture',config);
    assert.ok(argv.includes(config.providers[provider].model));
    assert.ok(argv.some(arg=>arg.includes('medium')));assert.ok(!argv.includes('--fallback-model'));
  }
});

test('v2 archives, duplicate IDs, source/evidence drift cannot enter v3',()=>{
  assert.throws(()=>assertV3({schemaVersion:2}),{code:'UNSUPPORTED_EVALUATION_SCHEMA'});
  assert.throws(()=>assertSame({source:'a'},{source:'b'}),/DRIFT/);
  const record=seal({...identity(matrix[0]),providerCalled:true,status:'NOT_RUN',reason:'TIMEOUT'});
  assert.equal(validateRecords([record],matrix,'frozen').size,1);
  assert.throws(()=>validateRecords([record,record],matrix,'frozen'),/duplicate/);
  assert.throws(()=>validateRecords([{...record,output:'changed'}],matrix,'frozen'),/drift/);
  assert.throws(()=>validateRecords([record],matrix,'other'),/mismatch/);
  assert.throws(()=>parseArgs(['--recheck','prior']),/separate agreement/);
});

test('scheduler stops on quota, preserves attempts and resumes only never-called slots',async()=>{
  const small=matrix.slice(0,8),calls=[],prior=new Map();
  const persist=async(item,result)=>seal({...identity(item),...result});
  const records=await dispatchMatrix(small,prior,async item=>{calls.push(idOf(item));return {providerCalled:true,status:'NOT_RUN',reason:'QUOTA_OR_BUDGET'};},persist,async()=>{});
  assert.ok(calls.length>=1&&calls.length<=2);
  assert.equal(records.length,8);
  for(const r of records)prior.set(r.id,r);
  const second=[];
  const resumed=await dispatchMatrix(small,prior,async item=>{second.push(idOf(item));return {providerCalled:true,status:'REVIEW_REQUIRED'};},persist,async()=>{});
  assert.ok(second.every(id=>!calls.includes(id)));
  assert.equal(calls.length+second.length,8);
  for(const record of records.filter(r=>r.providerCalled)) assert.deepEqual(resumed.find(r=>r.id===record.id),record);
});

test('scheduler enforces per-provider serial execution and no call after isolation failure',async()=>{
  const active={codex:0,claude:0};let peak=0;
  const persist=async(item,result)=>seal({...identity(item),...result});
  await dispatchMatrix(matrixFor(cases,{...config,selectedProviders:['codex','claude'],maxCalls:576}).slice(0,12),new Map(),async item=>{
    assert.equal(++active[item.provider],1);peak=Math.max(peak,active.codex+active.claude);
    await new Promise(resolve=>setTimeout(resolve,2));active[item.provider]--;
    return {providerCalled:true,status:'REVIEW_REQUIRED'};
  },persist,async()=>{});
  assert.equal(peak,2);
  let calls=0;
  const stopped=await dispatchMatrix(matrix.slice(0,4),new Map(),async()=>{calls++;},persist,async()=>{throw new Error('DOCKER_ISOLATION_FAILED');});
  assert.equal(calls,0);assert.ok(stopped.every(r=>r.status==='NOT_RUN'));
});

const image=`sha256:${'a'.repeat(64)}`;
test('Docker boundary pins image, nonroot, read-only mount, no network and no elevated Node permission',()=>{
  const command=containerCommand(image,'/tmp/fixture',['node','--test','check.mjs'],'sharpen-eval-test');
  for(const arg of ['none','--read-only','65534:65534','ALL','no-new-privileges','--memory','--cpus','--pids-limit','--test-isolation=none'])assert.ok(command.includes(arg));
  assert.ok(command.includes('type=bind,src=/tmp/fixture,dst=/fixture,readonly'));
  assert.ok(!command.some(arg=>/allow-(fs-write|child-process|worker)|docker.sock/.test(arg)));
  assert.throws(()=>containerCommand('node:latest','/tmp/x',['node','-v'],'x'),/frozen/);
  assert.throws(()=>containerCommand(image,'/tmp/x',['sh','-c','anything'],'x'),/Only Node/);
});

test('Docker timeout removes only its own container and preflight failure has no fallback',async()=>{
  const commands=[];
  await dockerCheck(image,'/tmp/fixture',['node','-v'],async argv=>{commands.push(argv);return {code:null,timedOut:true};});
  assert.equal(commands.length,2);assert.deepEqual(commands[1],['docker','rm','-f',commands[0][commands[0].indexOf('--name')+1]]);
  await assert.rejects(dockerPreflight('/tmp/fixture',async()=>({code:1,stdout:''})),/UNAVAILABLE/);
});

test('blind review hides version identity and binds grades to evidence; unrun blocks release',()=>{
  const record=seal({...identity(matrix[0]),providerCalled:true,status:'REVIEW_REQUIRED',providerCompleted:true,processExitCode:0,output:JSON.stringify({decision:'done',findings:[],evidence:[],limitations:[],changes:[]}),skillRead:true,loadingEvidence:[{skill:matrix[0].testCase.skill,fullSourceObserved:true}],forbiddenChanges:[],baselineChecks:[],afterChecks:[]});
  const packet=blindPacket([record],cases);
  assert.equal(packet.length,1);
  assert.ok(!('version' in packet[0])&&!('provider' in packet[0])&&!('id' in packet[0]));
  const grade={blindId:blindId(record),evidenceHash:record.evidenceHash,semantic:'PASS',rationale:'Evidence supports the required facts.',missingFacts:[],unsupportedClaims:[],scopeViolations:[]};
  const metadata={schemaVersion:3,config,inputHash:'frozen'};
  const summary=summarize(metadata,[record],cases,[grade]);
  assert.equal(summary.attemptedCalls,1);assert.equal(summary.counts.PASS,1);assert.equal(summary.counts.NOT_RUN,287);assert.equal(summary.releaseReady,false);
  assert.throws(()=>summarize(metadata,[record],cases,[{...grade,evidenceHash:'drift'}]),/drift/);
  assert.throws(()=>summarize(metadata,[record],cases,[{...grade,unsupportedClaims:['invented']}]),/contradicts/);
});


test('changed-file collection never follows an unsafe parent outside the fixture',async t=>{
  const {mkdtemp,mkdir,writeFile,symlink,rm,realpath}=await import('node:fs/promises');
  const os=await import('node:os'),path=await import('node:path');
  const {readChangedFiles}=await import('../scripts/eval-v3.mjs');
  const root=await realpath(await mkdtemp(path.join(os.tmpdir(),'sharpen-changed-files-')));
  t.after(()=>rm(root,{recursive:true}));
  const fixture=path.join(root,'fixture');await mkdir(fixture);
  await mkdir(path.join(root,'outside'));await writeFile(path.join(root,'outside','note.txt'),'not fixture data');
  await symlink(path.join(root,'outside'),path.join(fixture,'docs'));
  assert.deepEqual(await readChangedFiles(fixture,['docs/note.txt'],['docs/note.txt'],true),{});
  await assert.rejects(readChangedFiles(fixture,['docs/note.txt'],['docs/note.txt'],false),/UNSAFE_FIXTURE_PATH/);
  await writeFile(path.join(fixture,'safe.txt'),'allowed');
  assert.deepEqual(await readChangedFiles(fixture,['safe.txt','deleted.txt'],['safe.txt','deleted.txt'],false),{'safe.txt':'allowed','deleted.txt':null});
});

test('primary Claude model is checked separately from aggregate and nested models',()=>{
  const events=[{type:'assistant',message:{model:'claude-opus-5',content:[]}},
    {type:'assistant',parent_tool_use_id:'child',message:{model:'claude-haiku-4-5-20251001'}},
    {type:'result',modelUsage:{'claude-opus-5':{inputTokens:10},'claude-haiku-4-5-20251001':{inputTokens:3,outputTokens:1}}}];
  const evidence=modelEvidence('claude',events,'claude-opus-5');
  assert.equal(evidence.primaryModelMismatch,false);
  assert.deepEqual(evidence.primaryResponseModels,['claude-opus-5']);
  assert.deepEqual(evidence.usageModels,['claude-opus-5','claude-haiku-4-5-20251001']);
  assert.equal(evidence.usageByModel['claude-haiku-4-5-20251001'].inputTokens,3);
  events[0].message.model='claude-other';
  assert.equal(modelEvidence('claude',events,'claude-opus-5').primaryModelMismatch,true);
  const usageOnly=modelEvidence('claude',[events[2]],'claude-opus-5');
  assert.equal(usageOnly.modelEvidence,'explicit_cli_argument_only');
  assert.deepEqual(usageOnly.primaryResponseModels,[]);
});

test('Codex only trusts structured agent-message model identity, never prose or unrelated events',()=>{
  const events=[{type:'item.completed',item:{type:'agent_message',text:'I am gpt-other'}},{type:'tool',model:'tool-model'},{model:'unclassified'}];
  assert.equal(modelEvidence('codex',events,'gpt-6-astra').modelEvidence,'explicit_cli_argument_only');
  events[0].item.model='gpt-6-astra';
  assert.equal(modelEvidence('codex',events,'gpt-6-astra').primaryModelMismatch,false);
  events[0].item.model='gpt-other';
  assert.equal(modelEvidence('codex',events,'gpt-6-astra').primaryModelMismatch,true);
});

test('Codex-only CLI preflight never needs an installed Claude CLI',async()=>{
  const {versions}=await import('../scripts/eval-v3.mjs');const calls=[];
  const actual=await versions(selectedProviders(config),async argv=>{
    calls.push(argv);assert.equal(argv[0],'codex');return {code:0,stdout:'codex-test'};
  });
  assert.deepEqual(calls,[['codex','--version']]);assert.deepEqual(actual,{codex:'codex-test'});
  const old={...config};delete old.selectedProviders;delete old.modelPolicy;delete old.contractRevision;
  assert.throws(()=>selectedProviders(old),{code:'UNSUPPORTED_EVALUATION_POLICY'});
  assert.throws(()=>selectedProviders({...config,selectedProviders:['codex','codex']}),/selection/);
});

test('a complete selected-provider evaluation does not certify a deferred provider',()=>{
  const subset=[{...normal,category:'behavior'}];
  const single={...config,repeats:1,maxCalls:2};
  const items=matrixFor(subset,single);
  const records=items.map(item=>seal({...identity(item),providerCalled:true,status:'REVIEW_REQUIRED',providerCompleted:true,processExitCode:0,
    output:JSON.stringify({decision:'done',findings:[],evidence:[],limitations:[],changes:[]}),skillRead:true,
    loadingEvidence:[{skill:normal.skill,fullSourceObserved:true}],forbiddenChanges:[],baselineChecks:[],afterChecks:[]}));
  const grades=records.map(r=>({blindId:blindId(r),evidenceHash:r.evidenceHash,semantic:'PASS',rationale:'Synthetic complete evidence.',missingFacts:[],unsupportedClaims:[],scopeViolations:[]}));
  const summary=summarize({schemaVersion:3,config:single,inputHash:'frozen'},records,subset,grades);
  assert.equal(summary.evaluationPassed,true);assert.equal(summary.releaseReady,false);
  assert.deepEqual(summary.deferredProviders,['claude']);assert.equal(summary.cumulativeAttemptedCalls,292);
});
