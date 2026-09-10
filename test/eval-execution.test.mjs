import test from 'node:test';
import assert from 'node:assert/strict';
import { boundedEvidence, executionEvidence } from '../scripts/eval-execution.mjs';
import { structuralStatus } from '../scripts/eval-v3-summary.mjs';

test('command and result are paired, sanitized and bounded without splitting UTF-8', () => {
  const evidence = executionEvidence('codex', [{type:'init', account:'private'}, {type:'item.completed',item:{type:'command_execution',
    command:'node /tmp/fixture/check.mjs',aggregated_output:'token=synthetic-test-value\n/Users/example/private\n'+'가'.repeat(4000),exit_code:0}}], '/tmp/fixture');
  assert.equal(evidence.length,1);
  assert.equal(evidence[0].command.text,'node <fixture>/check.mjs');
  assert.equal(evidence[0].success,true);
  assert.ok(evidence[0].output.truncated);
  assert.ok(Buffer.byteLength(evidence[0].output.text)<=8192);
  assert.doesNotMatch(evidence[0].output.text,/synthetic-test-value|\/Users\/example|\uFFFD/);
  assert.equal(boundedEvidence('x'.repeat(8193),'/fixture').text.length,8192);
});

test('Claude command results require a matching tool ID and retain missing results', () => {
  const events=[{type:'assistant',message:{content:[{type:'tool_use',name:'Bash',id:'a',input:{command:'node check.mjs'}},
    {type:'tool_use',name:'Bash',id:'b',input:{command:'node later.mjs'}}]}},
    {type:'user',message:{content:[{type:'tool_result',tool_use_id:'unrelated',content:'ignore'},
      {type:'tool_result',tool_use_id:'a',content:'check failed',is_error:true}]}}];
  const evidence=executionEvidence('claude',events,'/fixture');
  assert.equal(evidence.length,2);
  assert.equal(evidence[0].output.text,'check failed');
  assert.equal(evidence[0].success,false);
  assert.equal(evidence[1].output.missing,true);
});

test('missing or truncated execution evidence cannot support a passing structural result', () => {
  const base={providerCalled:true,status:'REVIEW_REQUIRED',providerCompleted:true,processExitCode:0};
  for(const output of [undefined,'x'.repeat(8193)]) {
    const evidence=executionEvidence('codex',[{type:'item.completed',item:{type:'command_execution',command:'node check.mjs',aggregated_output:output,exit_code:0}}],'/fixture');
    assert.equal(structuralStatus({...base,executionEvidence:evidence},{}),'UNCLEAR');
  }
});
