import test from 'node:test';
import assert from 'node:assert/strict';
import { observe, sanitize, sanitizeObservation, parseResponse } from '../scripts/eval-observation.mjs';

const result = stdout => ({ stdout, stderr: '', code: 0, durationMs: 2 });
test('a provider self-declared success is not an evaluation pass', () => {
  const observed = observe('codex', result(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'All tests passed'}})), 'sharpen-clarify');
  assert.equal(observed.status, 'FAIL');
  assert.equal(observed.reason, 'SKILL_READ_NOT_OBSERVED');
});
test('timeout overrides otherwise successful partial output', () => {
  const observed = observe('claude', {...result('{"type":"result","subtype":"success","result":"done"}'),timedOut:true}, 'sharpen-clarify');
  assert.equal(observed.status, 'NOT_RUN');
  assert.equal(observed.reason, 'TIMEOUT');
});
test('authentication failures remain environmental observations', () => {
  const observed = observe('claude', result('{"type":"result","is_error":true,"errors":["OAuth token expired"]}'), 'sharpen-clarify');
  assert.equal(observed.reason, 'AUTH_ERROR');
});
test('saved observations remove fixture roots and credential-shaped values', () => {
  assert.equal(sanitize('/tmp/case/a secret sk-abcdefghijklmnop', '/tmp/case'), '<fixture>/a secret [redacted]');
});

test('credential formats are redacted without consuming labels, whitespace or quoted boundaries', () => {
  for (const [input, expected] of [
    ['Authorization: Bearer QA_HEADER', 'Authorization: Bearer [redacted]'],
    ['authorization:\tbeAreR\tQA_HEADER', 'authorization:\tbeAreR\t[redacted]'],
    ['Bearer: QA_LEGACY', 'Bearer: [redacted]'],
    ['token=QA_ASSIGNMENT', 'token=[redacted]'],
    ['API-Key = "QA_VALUE with spaces"', 'API-Key = "[redacted]"'],
    ["password: 'QA_VALUE with spaces'", "password: '[redacted]'"],
  ]) assert.equal(sanitize(input, '/fixture'), expected);
  const quoted = '{"API_KEY" : "QA_VALUE", "password":"가나다 \\"quote\\"", "token":"QA_TOKEN"}';
  assert.deepEqual(JSON.parse(sanitize(quoted, '/fixture')),
    { API_KEY: '[redacted]', password: '[redacted]', token: '[redacted]' });
  const normal = '{"summary":"Token counts, API key documentation and password policy.","home":"/Users/example"}';
  assert.deepEqual(JSON.parse(sanitize(normal, '/fixture')),
    { summary: 'Token counts, API key documentation and password policy.', home: '<user-home>' });
});

test('structured observation redaction preserves nested JSON types and does not mutate its input', () => {
  const unchanged = '가나다 "quoted text"\nToken counts and password policy.';
  const input = {
    providerCalled: true, output: 'token=QA_OUTPUT', durationMs: 3, optional: null,
    response: { decision: unchanged, findings: ['password: QA_FINDING', 'Authorization: Bearer QA_HEADER'] },
    usage: { token: 4, password: null, api_key: false },
    nested: [{ TOKEN: 'QA_STRUCTURED', 'api-key': '가나다 "QA_QUOTED"', unchanged }],
    data: Object.fromEntries([['__proto__', { password: 'QA_PROTOTYPE' }]]),
  };
  const cleaned = sanitizeObservation(input, '/fixture');
  assert.deepEqual(JSON.parse(JSON.stringify(cleaned)), {
    providerCalled: true, output: 'token=[redacted]', durationMs: 3, optional: null,
    response: { decision: unchanged, findings: ['password: [redacted]', 'Authorization: Bearer [redacted]'] },
    usage: { token: 4, password: null, api_key: false },
    nested: [{ TOKEN: '[redacted]', 'api-key': '[redacted]', unchanged }],
    data: Object.fromEntries([['__proto__', { password: '[redacted]' }]]),
  });
  assert.equal(input.output, 'token=QA_OUTPUT');
  assert.equal(input.nested[0].TOKEN, 'QA_STRUCTURED');
  assert.equal(Object.getPrototypeOf(cleaned.data), Object.prototype);
  assert.equal(Object.hasOwn(cleaned.data, '__proto__'), true);
});

test('known-pattern redaction leaves unrelated fields intact and rejects cyclic observations', () => {
  assert.deepEqual(sanitizeObservation({ session_cookie: 'QA_UNSUPPORTED', monkey: 'QA_ORDINARY' }),
    { session_cookie: 'QA_UNSUPPORTED', monkey: 'QA_ORDINARY' });
  const cycle = {};
  cycle.self = cycle;
  assert.throws(() => sanitizeObservation(cycle, '/fixture'), /Observation must be acyclic/);
});

const skill = '---\nname: sharpen-clarify\n---\nRead the relevant contract.';
const reply = JSON.stringify({decision:'ready',findings:[],evidence:[],limitations:[],changes:[]});
test('the host permits prose followed by a final observation JSON', () => {
  assert.equal(parseResponse(`Read check and supporting context.\n\n\`\`\`json\n${reply}\n\`\`\``).decision, 'ready');
  assert.throws(() => parseResponse(`${reply}\nUnstructured trailing conclusion.`));
});
test('Claude failed read is not credited as loading a skill', () => {
  const events = [
    {type:'assistant',message:{content:[{type:'tool_use',name:'Read',id:'r1',input:{file_path:'/fixture/sharpen-clarify/SKILL.md'}}]}},
    {type:'user',message:{content:[{type:'tool_result',tool_use_id:'r1',is_error:true,content:'denied'}]}},
    {type:'result',subtype:'success',result:reply},
  ];
  assert.equal(observe('claude', result(events.map(JSON.stringify).join('\n')), 'sharpen-clarify', skill).reason, 'SKILL_READ_NOT_OBSERVED');
});
test('actual full content plus valid host JSON requires semantic review', () => {
  const events = [
    {type:'item.completed',item:{type:'command_execution',command:'cat .agents/skills/sharpen-clarify/SKILL.md',exit_code:0,aggregated_output:skill}},
    {type:'item.completed',item:{type:'agent_message',text:reply}},
  ];
  assert.equal(observe('codex', result(events.map(JSON.stringify).join('\n')), 'sharpen-clarify', skill).status, 'REVIEW_REQUIRED');
  events[1].item.text = 'not JSON';
  assert.equal(observe('codex', result(events.map(JSON.stringify).join('\n')), 'sharpen-clarify', skill).reason, 'OUTPUT_CONTRACT_FAILED');
});

test('numbered Claude reads preserve source indentation and still reject altered content', () => {
  const indented = `${skill}\n\n- Parent\n  - Child\n\n\`\`\`js\n  return true;\n\`\`\``;
  const numbered = indented.split('\n').map((line, index) => `  ${index + 1}→${line}`).join('\n');
  const events = [
    {type:'assistant',message:{content:[{type:'tool_use',name:'Read',id:'r1',input:{file_path:'/fixture/sharpen-clarify/SKILL.md'}}]}},
    {type:'user',message:{content:[{type:'tool_result',tool_use_id:'r1',content:numbered}]}},
    {type:'result',subtype:'success',result:reply},
  ];
  assert.equal(observe('claude', result(events.map(JSON.stringify).join('\n')), 'sharpen-clarify', indented).skillRead, true);
  events[1].message.content[0].content = numbered.replace('  - Child', ' - Child');
  assert.equal(observe('claude', result(events.map(JSON.stringify).join('\n')), 'sharpen-clarify', indented).skillRead, false);
});

test('successful completion is not a quota failure merely because stderr mentions budget', () => {
  const events = [
    {type:'item.completed',item:{type:'command_execution',command:'cat .agents/skills/sharpen-clarify/SKILL.md',exit_code:0,aggregated_output:skill}},
    {type:'item.completed',item:{type:'agent_message',text:reply}},
    {type:'turn.completed',usage:{input_tokens:1,output_tokens:1}},
  ];
  const completed = { ...result(events.map(JSON.stringify).join('\n')), stderr: 'warning: budget information unavailable' };
  const observed = observe('codex', completed, 'sharpen-clarify', skill);
  assert.equal(observed.status, 'REVIEW_REQUIRED');
  assert.equal(observed.processExitCode, 0);
  assert.equal(observed.providerCompleted, true);
  const failed = observe('codex', { ...completed, code: 1 }, 'sharpen-clarify', skill);
  assert.equal(failed.reason, 'QUOTA_OR_BUDGET');
});
