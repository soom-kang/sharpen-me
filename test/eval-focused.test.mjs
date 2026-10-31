import test from 'node:test';
import assert from 'node:assert/strict';
import { focusedMatrix } from '../scripts/evaluate-focused.mjs';
import { idOf } from '../scripts/eval-v3-contract.mjs';
import { taskPrompt } from '../scripts/eval-v3-observation.mjs';
import * as beta7 from '../evals/focused-beta7.mjs';
import * as next from '../evals/focused-next.mjs';

test('the beta.7 plan keeps its 32 skill-arm slots in the original order',()=>{
  const matrix=focusedMatrix(beta7.plan,beta7.cases);
  assert.equal(matrix.length,32);
  assert(matrix.every(item=>item.version==='after'&&beta7.cases.includes(item.testCase)));
  assert.deepEqual(matrix.slice(0,2).map(idOf),['codex--after--a1-risk-mechanical--r1','claude--after--a1-risk-mechanical--r1']);
});

test('control slots reuse the prompt without skills and expect no Skill access',()=>{
  const matrix=focusedMatrix(next.plan,next.cases);
  assert.equal(matrix.length,next.plan.maxCalls);
  assert.equal(new Set(matrix.map(idOf)).size,matrix.length);
  const control=matrix.filter(item=>item.version==='control');
  assert.equal(control.length,next.plan.control.length*2);
  for(const {testCase} of control) {
    const original=next.cases.find(c=>c.id===testCase.id);
    assert.equal(testCase.prompt,original.prompt);assert.deepEqual(testCase.expected,original.expected);
    assert.equal(testCase.invocation,'implicit');assert.deepEqual(testCase.expectedSkills,[]);
    for(const provider of ['codex','claude'])assert.doesNotMatch(taskPrompt(provider,testCase),/sharpen-|\.agents|\.claude/);
  }
  // The pilot's first four calls cover both arms and both providers.
  assert.deepEqual(matrix.slice(0,next.plan.pilotCalls).map(item=>`${item.provider}/${item.version}`),
    ['codex/after','claude/after','codex/control','claude/control']);
  for(let i=0;i<matrix.length;i+=2)assert.deepEqual(matrix.slice(i,i+2).map(item=>item.provider),['codex','claude']);
});

test('negative selection cases expect no skill and every reused beta.7 case still exists',()=>{
  assert(next.cases.every(Boolean));
  for(const c of next.cases.filter(c=>c.category==='selection'&&c.skill==='none'))assert.deepEqual(c.expectedSkills,[]);
  for(const id of ['d5-ownership-unknown','r2-plan-premise','r5-settled-cleanup'])
    assert.equal(next.cases.find(c=>c.id===id),beta7.cases.find(c=>c.id===id));
});
