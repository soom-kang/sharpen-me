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
import { dispatchMatrix, idOf } from '../scripts/eval-v3-contract.mjs';
import { createProviderDispatch } from '../scripts/eval-v3.mjs';

test('case inputs, prompts, checks and expected facts survive the format change', () => {
  assert.equal(cases.length, 16);
  assert.ok(cases.every(item => !Object.hasOwn(item, 'baseline')));
  // Approved renamed identities; the baseline tests independently check unchanged task semantics.
  assert.equal(sha256(JSON.stringify(cases)), 'bc62378b93e74bbd40bb50f8a43530c424f94104cf539428a20e5900ad101c72');
});

test('a version stamp cannot make mixed or older records eligible', () => {
  for (const value of [null, {}, { schemaVersion: 1 }, { schemaVersion: '2' },
    { schemaVersion: 3 }, { schemaVersion: 2, arm: 'old' }, { schemaVersion: 2, baselineHashes: {} }]) {
    assert.throws(() => assertEvaluationSchema(value), { code: 'UNSUPPORTED_EVALUATION_SCHEMA' });
  }
  assert.doesNotThrow(() => assertEvaluationSchema({ schemaVersion: 2 }));
});

async function isolatedCLI(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sharpen-me-contract-'));
  t.after(() => rm(root, { recursive: true }));
  for (const directory of ['scripts', 'evals']) {
    await cp(fileURLToPath(new URL(`../${directory}`, import.meta.url)), path.join(root, directory), { recursive: true });
  }
  const gitDir = fileURLToPath(new URL('../.git', import.meta.url));
  const guard = path.join(root, 'no-external-work.mjs');
  await writeFile(guard, `import cp from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { writeFileSync } from 'node:fs';
const deny = () => { writeFileSync(${JSON.stringify(path.join(root, 'unexpected-call'))}, 'attempted'); throw new Error('External work forbidden in this test'); };
globalThis.fetch = deny;
const custom = Symbol.for('nodejs.util.promisify.custom');
cp.spawn = deny;
const execFile = cp.execFile;
cp.execFile = (file, args, ...rest) => {
  if (file !== 'git' || !['ls-tree', 'cat-file'].includes(args[0])) return deny();
  return execFile(file, args, ...rest);
};
cp.execFile[custom] = (file, args, options) => new Promise((resolve, reject) => {
  cp.execFile(file, args, options, (error, stdout, stderr) => error ? reject(error) : resolve({stdout, stderr}));
});
syncBuiltinESMExports();
`);
  const invoke = (script, args = [], envOverrides = {}) => spawnSync(process.execPath,
    ['--import', guard, path.join(root, 'scripts', script), ...args],
    { cwd: root, encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '', GIT_DIR: gitDir, ...envOverrides } });
  return { root, invoke };
}

test('dry run lists 576 unique invocations with only local Git reads, no provider calls, downloads or writes', async t => {
  const { root, invoke } = await isolatedCLI(t);
  const before = await sourceSnapshot(root);
  const result = invoke('evaluate.mjs', ['--dry-run']);
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.equal(plan.schemaVersion, 3);
  assert.equal(plan.plannedCalls, 576);
  assert.equal(plan.plannedNewCalls, 576);
  assert.equal(new Set(plan.calls.map(call => call.id)).size, 576);
  assert.equal(plan.calls.filter(call => call.provider === 'claude').length, 288);
  for (const provider of ['codex', 'claude']) {
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

for (const revision of [2, 3]) test(`contract ${revision} archives are rejected without modifying their saved results`, async t => {
  const { root, invoke } = await isolatedCLI(t);
  const archive = path.join(root, 'eval-results', 'old-policy');
  await mkdir(archive, { recursive: true });
  const config = JSON.parse(await readFile(new URL('../evals/config.json', import.meta.url)));
  await writeFile(path.join(archive, 'run.json'), JSON.stringify({ schemaVersion: 3, config: { ...config, contractRevision: revision } }));
  await writeFile(path.join(archive, 'reviewed-summary.json'), '{"historical":true}\n');
  const before = await sourceSnapshot(root);
  for (const [script, args] of [['evaluate.mjs', ['--resume', archive, '--dry-run']], ['summarize-v3.mjs', [archive]]]) {
    const result = invoke(script, args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /policy differs/);
    assert.deepEqual(await sourceSnapshot(root), before);
  }
});

test('missing baseline fails before provider or Docker preflight', async t => {
  const { root, invoke } = await isolatedCLI(t);
  const result = invoke('evaluate.mjs', [], { GIT_DIR: path.join(root, 'missing-git') });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /BASELINE_UNAVAILABLE/);
  assert.ok(!(await readdir(root)).includes('unexpected-call'));
  assert.ok(!(await readdir(root)).includes('eval-results'));
});

test('new-contract resume validates normalized baseline and current inputs before continuing', async t => {
  const { root, invoke } = await isolatedCLI(t);
  const { readBaseline } = await import('../scripts/eval-baseline.mjs');
  const { freeze } = await import('../scripts/eval-v3.mjs');
  const { matrixFor, idOf } = await import('../scripts/eval-v3-contract.mjs');
  const { cases: allCases } = await import('../evals/additional-cases.mjs');
  const source = fileURLToPath(new URL('../', import.meta.url));
  await cp(path.join(source, 'skills'), path.join(root, 'skills'), { recursive: true });
  const prepared = await readBaseline(source);
  const archive = path.join(root, 'eval-results', 'new-policy');
  await mkdir(path.join(archive, 'records'), { recursive: true });
  const frozenHashes = await freeze(archive, prepared);
  const config = JSON.parse(await readFile(path.join(root, 'evals/config.json'), 'utf8'));
  const workingInputs = { skills: await sourceSnapshot(path.join(root, 'skills')),
    runner: await sourceSnapshot(path.join(root, 'scripts')), fixtures: await sourceSnapshot(path.join(root, 'evals')) };
  const inputs = { baseline: prepared.provenance.commit, baselineNormalization: prepared.provenance,
    config, workingInputs, frozenHashes, environment: {}, casesHash: sha256(JSON.stringify(allCases)) };
  const metadata = { schemaVersion: 3, ...inputs, inputHash: sha256(JSON.stringify(inputs)),
    matrix: matrixFor(allCases, config).map(item => ({ id: idOf(item), provider: item.provider, version: item.version, case: item.testCase.id, repeat: item.repeat })) };
  const runFile = path.join(archive, 'run.json');
  await writeFile(runFile, JSON.stringify(metadata));
  await writeFile(path.join(archive, 'reviewed-summary.json'), '{"previous":true}\n');
  const initial = await sourceSnapshot(root);
  const success = invoke('evaluate.mjs', ['--resume', archive, '--dry-run']);
  assert.equal(success.status, 0, success.stderr);
  assert.equal(JSON.parse(success.stdout).plannedNewCalls, 576);
  assert.deepEqual(await sourceSnapshot(root), initial);
  const summarized = invoke('summarize-v3.mjs', [archive]);
  assert.equal(summarized.status, 1, summarized.stderr);
  assert.equal(JSON.parse(summarized.stdout).counts.NOT_RUN, 576);
  assert.equal(JSON.parse(summarized.stdout).releaseReady, false);
  const bad = structuredClone(metadata); bad.baselineNormalization.normalizedHashes['sharpen-clarify/SKILL.md'] = 'altered';
  await writeFile(runFile, JSON.stringify(bad));
  const changed = await sourceSnapshot(root);
  for (const [script, args] of [['evaluate.mjs', ['--resume', archive, '--dry-run']], ['summarize-v3.mjs', [archive]]]) {
    const result = invoke(script, args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /FROZEN_INPUT_DRIFT/);
    assert.deepEqual(await sourceSnapshot(root), changed);
  }
  await writeFile(runFile, JSON.stringify(metadata));
  await writeFile(path.join(root, 'skills/sharpen-clarify/SKILL.md'), 'changed');
  const currentDrift = invoke('evaluate.mjs', ['--resume', archive, '--dry-run']);
  assert.equal(currentDrift.status, 1);
  assert.match(currentDrift.stderr, /FROZEN_INPUT_DRIFT/);
  const summaryDrift = invoke('summarize-v3.mjs', [archive]);
  assert.equal(summaryDrift.status, 1);
  assert.match(summaryDrift.stderr, /FROZEN_INPUT_DRIFT/);
});

test('halt during input verification or fixture preparation prevents a new peer call', async () => {
  for (const phase of ['verification', 'preparation']) for (const reason of ['AUTH_ERROR', 'QUOTA_OR_BUDGET', 'DOCKER_ISOLATION_FAILED']) {
    const items = ['codex', 'claude'].map(provider => ({ provider, version: 'after', testCase: { id: phase }, repeat: 1 }));
    let release, stopped;
    const gate = new Promise(resolve => { release = resolve; });
    const stop = new Promise(resolve => { stopped = resolve; });
    const calls = [];
    let checks = 0;
    const running = dispatchMatrix(items, new Map(), async (item, control) => {
      if (phase === 'preparation' && item.provider === 'claude') await gate;
      const started = control.start(() => {
        calls.push(item.provider);
        return { providerCalled: true, status: 'NOT_RUN', reason };
      });
      return started?.result;
    }, async (item, result) => {
      if (item.provider === 'codex') stopped();
      return { id: idOf(item), ...result };
    }, async () => { if (++checks === 2 && phase === 'verification') await gate; });
    await stop;
    release();
    const records = await running;
    assert.deepEqual(calls, ['codex'], `${phase}: ${reason}`);
    assert.equal(records.find(r => r.id === idOf(items[1])).providerCalled, false);
  }
});

test('halt during durable journal write cancels only the unstarted peer reservation', async () => {
  const items = ['codex', 'claude'].map(provider => ({ provider, version: 'after', testCase: { id: 'journal-halt' }, repeat: 1 }));
  for (const failCancellation of [false, true]) {
    let writing, release, stopped;
    const peerWriting = new Promise(resolve => { writing = resolve; });
    const writeGate = new Promise(resolve => { release = resolve; });
    const stop = new Promise(resolve => { stopped = resolve; });
    const journal = [], writes = [], calls = [];
    let durable = [];
    const dispatch = createProviderDispatch(journal, 2, async state => {
      writes.push(state);
      if (writes.length === 2) { writing(); await writeGate; }
      if (failCancellation && writes.length === 3) throw new Error('Synthetic cancellation write failed');
      durable = state;
    });
    const running = dispatchMatrix(items, new Map(), async (item, control) => {
      const result = await dispatch(item, control, async () => {
        calls.push(item.provider);
        await peerWriting;
        return { providerCalled: true, status: 'NOT_RUN', reason: 'QUOTA_OR_BUDGET' };
      });
      return result;
    }, async (item, result) => {
      if (item.provider === 'codex') stopped();
      return { id: idOf(item), ...result };
    }, async () => {});
    await stop;
    release();
    const records = await running;
    assert.deepEqual(calls, ['codex']);
    assert.equal(records.find(r => r.id === idOf(items[1])).providerCalled, false);
    assert.equal(writes.length, 3);
    assert.deepEqual(journal.map(d => d.id), [idOf(items[0])]);
    assert.deepEqual(durable.map(d => d.id), failCancellation ? items.map(idOf) : [idOf(items[0])]);
    // Failed cancellation leaves a disk reservation with no called record;
    // the existing resume journal validation must continue to reject it.
    assert.equal(durable.some(d => !records.find(r => r.id === d.id)?.providerCalled), failCancellation);
  }
});

test('journal failure stops queued writes and never starts a provider', async () => {
  const items = ['codex', 'claude'].map(provider => ({ provider, version: 'after', testCase: { id: 'journal-error' }, repeat: 1 }));
  const journal = [];
  let writes = 0, calls = 0;
  const dispatch = createProviderDispatch(journal, 2, async () => { writes++; throw new Error('Synthetic journal failure'); });
  const records = await dispatchMatrix(items, new Map(), (item, control) => dispatch(item, control, () => { calls++; }),
    async (item, result) => ({ id: idOf(item), ...result }), async () => {});
  assert.equal(writes, 1);
  assert.equal(calls, 0);
  assert.equal(journal.length, 1);
  assert.ok(records.every(r => !r.providerCalled && r.reason === 'HARNESS_ERROR'));
});

test('a collection error after starting retains its attempt and resume never repeats it', async () => {
  const item = { provider: 'codex', version: 'after', testCase: { id: 'collection-error' }, repeat: 1 };
  const journal = [];
  const dispatch = createProviderDispatch(journal, 1, async () => {});
  const persist = async (slot, result) => ({ id: idOf(slot), ...result });
  const records = await dispatchMatrix([item], new Map(), async (slot, control) => {
    await dispatch(slot, control, () => Promise.resolve('Synthetic completed response'));
    throw new Error('Synthetic collection failure');
  }, persist, async () => {});
  assert.equal(records[0].providerCalled, true);
  assert.equal(records[0].status, 'NOT_RUN');
  assert.equal(records[0].reason, 'HARNESS_ERROR');
  assert.deepEqual(journal.map(d => d.id), records.map(r => r.id));
  const resumed = await dispatchMatrix([item], new Map(records.map(r => [r.id, r])),
    async () => { assert.fail('An attempted slot must never be repeated'); }, persist, async () => {});
  assert.deepEqual(resumed, records);
});

test('halt preserves already started peer results and serial journal writes allow concurrent inference', async () => {
  const items = ['codex', 'claude'].map(provider => ({ provider, version: 'after', testCase: { id: 'in-flight' }, repeat: 1 }));
  let bothStarted, releasePeer, stopped;
  const started = new Promise(resolve => { bothStarted = resolve; });
  const peer = new Promise(resolve => { releasePeer = resolve; });
  const stop = new Promise(resolve => { stopped = resolve; });
  const calls = [], journal = [], writes = [];
  const dispatch = createProviderDispatch(journal, 2, async state => { writes.push(state); });
  const running = dispatchMatrix(items, new Map(), (item, control) => dispatch(item, control, async () => {
    calls.push(item.provider);
    if (calls.length === 2) bothStarted();
    await started;
    if (item.provider === 'claude') await peer;
    return { providerCalled: true, status: item.provider === 'codex' ? 'NOT_RUN' : 'REVIEW_REQUIRED',
      reason: item.provider === 'codex' ? 'QUOTA_OR_BUDGET' : null };
  }), async (item, result) => {
    if (item.provider === 'codex') stopped();
    return { id: idOf(item), ...result };
  }, async () => {});
  await stop;
  releasePeer();
  const records = await running;
  assert.deepEqual(calls, ['codex', 'claude']);
  assert.deepEqual(writes.map(state => state.length), [1, 2]);
  assert.equal(records.find(r => r.id === idOf(items[1])).status, 'REVIEW_REQUIRED');
  assert.ok(records.every(r => r.providerCalled));
});

test('record persistence failure stops a peer waiting in input verification', async () => {
  const items = ['codex', 'claude'].map(provider => ({ provider, version: 'after', testCase: { id: 'persist-error' }, repeat: 1 }));
  let release, peerSaved;
  const gate = new Promise(resolve => { release = resolve; });
  const saved = new Promise(resolve => { peerSaved = resolve; });
  let checks = 0;
  const calls = [];
  const running = dispatchMatrix(items, new Map(), async (item, control) => control.start(() => {
    calls.push(item.provider);
    return { providerCalled: true, status: 'REVIEW_REQUIRED' };
  })?.result, async (item, result) => {
    if (item.provider === 'codex') throw new Error('Synthetic record write failure');
    assert.equal(result.providerCalled, false);
    peerSaved();
    return result;
  }, async () => { if (++checks === 2) await gate; });
  await assert.rejects(running, /Synthetic record write failure/);
  release();
  await saved;
  assert.deepEqual(calls, ['codex']);
});
