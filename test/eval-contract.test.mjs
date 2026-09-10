import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { legacyCases as cases } from '../evals/cases.mjs';
import { assertEvaluationSchema } from '../scripts/eval-contract.mjs';
import { sha256, sourceSnapshot } from '../scripts/eval-resume.mjs';

test('case inputs, prompts, checks and expected facts survive the format change', () => {
  assert.equal(cases.length, 16);
  assert.ok(cases.every(item => !Object.hasOwn(item, 'baseline')));
  // Captured from the original case data, excluding only the retired name field.
  assert.equal(sha256(JSON.stringify(cases)), 'fd23c8cbe6ed4c3ad5223dcb880c249979bdf94605aaadada23f03f7c16b1d47');
});

test('a version stamp cannot make mixed or older records eligible', () => {
  for (const value of [null, {}, { schemaVersion: 1 }, { schemaVersion: '2' },
    { schemaVersion: 3 }, { schemaVersion: 2, arm: 'old' }, { schemaVersion: 2, baselineHashes: {} }]) {
    assert.throws(() => assertEvaluationSchema(value), { code: 'UNSUPPORTED_EVALUATION_SCHEMA' });
  }
  assert.doesNotThrow(() => assertEvaluationSchema({ schemaVersion: 2 }));
});

async function isolatedCLI(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'refactor-me-contract-'));
  t.after(() => rm(root, { recursive: true }));
  for (const directory of ['scripts', 'evals']) {
    await cp(fileURLToPath(new URL(`../${directory}`, import.meta.url)), path.join(root, directory), { recursive: true });
  }
  const guard = path.join(root, 'no-external-work.mjs');
  await writeFile(guard, `import cp from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { writeFileSync } from 'node:fs';
const deny = () => { writeFileSync(${JSON.stringify(path.join(root, 'unexpected-call'))}, 'attempted'); throw new Error('External work forbidden in this test'); };
globalThis.fetch = deny;
cp.spawn = deny;
syncBuiltinESMExports();
`);
  const invoke = (script, args = []) => spawnSync(process.execPath,
    ['--import', guard, path.join(root, 'scripts', script), ...args],
    { cwd: root, encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' } });
  return { root, invoke };
}

test('dry run lists 288 unique invocations without process calls, downloads or writes', async t => {
  const { root, invoke } = await isolatedCLI(t);
  const before = await sourceSnapshot(root);
  const result = invoke('evaluate.mjs', ['--dry-run']);
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.equal(plan.schemaVersion, 3);
  assert.equal(plan.plannedCalls, 288);
  assert.equal(plan.plannedNewCalls, 288);
  assert.equal(new Set(plan.calls.map(call => call.id)).size, 288);
  assert.equal(plan.calls.filter(call => call.provider === 'claude').length, 0);
  for (const provider of ['codex']) {
    const calls = plan.calls.filter(call => call.provider === provider);
    assert.equal(calls.length, 288);
    assert.deepEqual(new Set(calls.map(call => call.case)), new Set((await import('../evals/additional-cases.mjs')).cases.map(item => item.id)));
    assert.ok(calls.every(call => call.id === `${provider}--${call.version}--${call.case}--r${call.repeat}`));
  }
  assert.deepEqual(await sourceSnapshot(root), before);
});

test('all CLIs reject older archives before writing or invoking providers', async t => {
  const { root, invoke } = await isolatedCLI(t);
  const archive = path.join(root, 'eval-results', 'old');
  await mkdir(archive, { recursive: true });
  for (const version of [undefined, 1, 2]) {
    await writeFile(path.join(archive, 'run.json'), JSON.stringify({ schemaVersion: version, plannedCalls: 64 }));
    await writeFile(path.join(archive, 'reviewed-summary.json'), '{"releaseReady":true,"historical":true}\n');
    const before = await sourceSnapshot(root);
    for (const [script, args] of [
      ['evaluate.mjs', ['--resume', archive, '--dry-run']],
      ['evaluate.mjs', ['--resume', archive]],
    ]) {
      const result = invoke(script, args);
      assert.equal(result.status, 1, result.stderr);
      const report = JSON.parse(result.stdout);
      assert.equal(report.releaseReady, false);
      assert.deepEqual(report.releaseBlockers, ['UNSUPPORTED_EVALUATION_SCHEMA']);
      assert.deepEqual(await sourceSnapshot(root), before);
    }
  }
});

test('v3 archives with the old model policy stay unchanged and cannot resume', async t => {
  const { root, invoke } = await isolatedCLI(t);
  const archive=path.join(root,'eval-results','prior-v3');
  await mkdir(archive,{recursive:true});
  await writeFile(path.join(archive,'run.json'),JSON.stringify({schemaVersion:3,config:{providers:{codex:{model:'gpt-6-astra'}},maxCalls:576}}));
  const before=await sourceSnapshot(root);
  const result=invoke('evaluate.mjs',['--resume',archive,'--dry-run']);
  assert.equal(result.status,1);
  assert.deepEqual(JSON.parse(result.stdout).releaseBlockers,['UNSUPPORTED_EVALUATION_POLICY']);
  assert.deepEqual(await sourceSnapshot(root),before);
});
