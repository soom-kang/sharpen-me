import test from 'node:test';
import assert from 'node:assert/strict';
import { observe, sanitize, parseResponse } from '../scripts/eval-observation.mjs';

const result = stdout => ({ stdout, stderr: '', code: 0, durationMs: 2 });
test('a provider self-declared success is not an evaluation pass', () => {
  const observed = observe('codex', result(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'All tests passed'}})), 'rm-scope');
  assert.equal(observed.status, 'FAIL');
  assert.equal(observed.reason, 'SKILL_READ_NOT_OBSERVED');
});
test('timeout overrides otherwise successful partial output', () => {
  const observed = observe('claude', {...result('{"type":"result","subtype":"success","result":"done"}'),timedOut:true}, 'rm-scope');
  assert.equal(observed.status, 'NOT_RUN');
  assert.equal(observed.reason, 'TIMEOUT');
});
test('authentication failures remain environmental observations', () => {
  const observed = observe('claude', result('{"type":"result","is_error":true,"errors":["OAuth token expired"]}'), 'rm-scope');
  assert.equal(observed.reason, 'AUTH_ERROR');
});
test('saved observations remove fixture roots and credential-shaped values', () => {
  assert.equal(sanitize('/tmp/case/a secret sk-abcdefghijklmnop', '/tmp/case'), '<fixture>/a secret [redacted]');
});

const skill = '---\nname: rm-scope\n---\nRead the relevant contract.';
const reply = JSON.stringify({decision:'ready',findings:[],evidence:[],limitations:[],changes:[]});
test('the host permits prose followed by a final observation JSON', () => {
  assert.equal(parseResponse(`Read check and supporting context.\n\n\`\`\`json\n${reply}\n\`\`\``).decision, 'ready');
  assert.throws(() => parseResponse(`${reply}\nUnstructured trailing conclusion.`));
});
test('Claude failed read is not credited as loading a skill', () => {
  const events = [
    {type:'assistant',message:{content:[{type:'tool_use',name:'Read',id:'r1',input:{file_path:'/fixture/rm-scope/SKILL.md'}}]}},
    {type:'user',message:{content:[{type:'tool_result',tool_use_id:'r1',is_error:true,content:'denied'}]}},
    {type:'result',subtype:'success',result:reply},
  ];
  assert.equal(observe('claude', result(events.map(JSON.stringify).join('\n')), 'rm-scope', skill).reason, 'SKILL_READ_NOT_OBSERVED');
});
test('actual full content plus valid host JSON requires semantic review', () => {
  const events = [
    {type:'item.completed',item:{type:'command_execution',command:'cat .agents/skills/rm-scope/SKILL.md',exit_code:0,aggregated_output:skill}},
    {type:'item.completed',item:{type:'agent_message',text:reply}},
  ];
  assert.equal(observe('codex', result(events.map(JSON.stringify).join('\n')), 'rm-scope', skill).status, 'REVIEW_REQUIRED');
  events[1].item.text = 'not JSON';
  assert.equal(observe('codex', result(events.map(JSON.stringify).join('\n')), 'rm-scope', skill).reason, 'OUTPUT_CONTRACT_FAILED');
});

test('numbered Claude reads preserve source indentation and still reject altered content', () => {
  const indented = `${skill}\n\n- Parent\n  - Child\n\n\`\`\`js\n  return true;\n\`\`\``;
  const numbered = indented.split('\n').map((line, index) => `  ${index + 1}→${line}`).join('\n');
  const events = [
    {type:'assistant',message:{content:[{type:'tool_use',name:'Read',id:'r1',input:{file_path:'/fixture/rm-scope/SKILL.md'}}]}},
    {type:'user',message:{content:[{type:'tool_result',tool_use_id:'r1',content:numbered}]}},
    {type:'result',subtype:'success',result:reply},
  ];
  assert.equal(observe('claude', result(events.map(JSON.stringify).join('\n')), 'rm-scope', indented).skillRead, true);
  events[1].message.content[0].content = numbered.replace('  - Child', ' - Child');
  assert.equal(observe('claude', result(events.map(JSON.stringify).join('\n')), 'rm-scope', indented).skillRead, false);
});

test('successful completion is not a quota failure merely because stderr mentions budget', () => {
  const events = [
    {type:'item.completed',item:{type:'command_execution',command:'cat .agents/skills/rm-scope/SKILL.md',exit_code:0,aggregated_output:skill}},
    {type:'item.completed',item:{type:'agent_message',text:reply}},
    {type:'turn.completed',usage:{input_tokens:1,output_tokens:1}},
  ];
  const completed = { ...result(events.map(JSON.stringify).join('\n')), stderr: 'warning: budget information unavailable' };
  const observed = observe('codex', completed, 'rm-scope', skill);
  assert.equal(observed.status, 'REVIEW_REQUIRED');
  assert.equal(observed.processExitCode, 0);
  assert.equal(observed.providerCompleted, true);
  const failed = observe('codex', { ...completed, code: 1 }, 'rm-scope', skill);
  assert.equal(failed.reason, 'QUOTA_OR_BUDGET');
});
