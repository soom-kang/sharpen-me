import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { legacyCases as cases } from '../evals/cases.mjs';
import { catalog } from '../scripts/catalog.mjs';
import { sha256, sourceSnapshot } from '../scripts/eval-resume.mjs';
import { buildEvaluationSummary, observationHash } from '../scripts/eval-summary.mjs';

const output = JSON.stringify({ decision: 'Synthetic grade fixture', findings: [], evidence: [], limitations: [], changes: [] });
const saveJson = (file, value) => writeFile(file, JSON.stringify(value));
const sampleId = 'codex--scope-repository-contract';
const editId = 'claude--refine-receipt-shared-calculation';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'refactor-me-summary-'));
  t.after(() => rm(root, { recursive: true }));
  const directory = path.join(root, 'eval-results', 'synthetic');
  await mkdir(path.join(root, 'evals'), { recursive: true });
  await mkdir(directory, { recursive: true });
  const fixtureBytes = await readFile(new URL('../evals/cases.mjs', import.meta.url));
  const config = { timeoutMs: 180_000, providers: { codex: { model: 'synthetic', effort: 'high' }, claude: { model: 'synthetic', effort: 'high' } } };
  await writeFile(path.join(root, 'evals/cases.mjs'), fixtureBytes);
  await saveJson(path.join(root, 'evals/config.json'), config);
  const run = { schemaVersion: 2, startedAt: 'synthetic', fixtureHash: sha256(fixtureBytes), config,
    versions: { codex: 'synthetic-1', claude: 'synthetic-1' }, plannedCalls: 32, skillHashes: {} };
  for (const { name } of catalog) {
    for (const source of [path.join(root, 'skills', name), path.join(directory, 'skills', name)]) {
      await mkdir(path.join(source, 'agents'), { recursive: true });
      await writeFile(path.join(source, 'SKILL.md'), `Synthetic skill ${name}`);
      await writeFile(path.join(source, 'NOTICE'), `Synthetic attribution ${name}`);
      await writeFile(path.join(source, 'agents/openai.yaml'), 'policy: synthetic\n');
    }
    run.skillHashes[name] = await sourceSnapshot(path.join(root, 'skills', name));
  }
  const observations = new Map();
  const grades = { codex: [], claude: [] };
  for (const provider of ['codex', 'claude']) for (const testCase of cases) {
    const id = `${provider}--${testCase.id}`;
    const checkResult = check => ({ purpose: check.purpose, passed: true, exitCode: check.expectedExitCode, timedOut: false });
    const observation = { schemaVersion: 2, id, provider, case: testCase.id, skill: testCase.skill,
      model: config.providers[provider], fixtureHash: run.fixtureHash, status: 'REVIEW_REQUIRED', reason: null,
      providerCalled: true, skillRead: true, actions: [{ kind: 'requested_skill_read', ...(provider === 'codex' ? { exitCode: 0 } : { success: true }) }], output,
      changedPaths: testCase.mutablePaths, forbiddenChanges: [],
      changedFiles: Object.fromEntries(testCase.mutablePaths.map(file => [file, 'Synthetic edited content'])),
      baselineChecks: (testCase.checks ?? []).filter(check => check.when === 'before-and-after').map(checkResult),
      afterChecks: (testCase.checks ?? []).map(checkResult) };
    observations.set(id, observation);
    grades[provider].push({ id, semantic: 'PASS', rationale: 'Synthetic evidence reviewed for gate testing.',
      missingFacts: [], unsupportedClaims: [], observationHash: observationHash(observation, run) });
  }
  const save = async () => {
    await saveJson(path.join(directory, 'run.json'), run);
    for (const observation of observations.values()) await saveJson(path.join(directory, `${observation.id}.json`), observation);
    for (const provider of ['codex', 'claude']) await saveJson(path.join(directory, `grades-${provider}.json`), grades[provider]);
  };
  const rebind = id => {
    const observation = observations.get(id);
    grades[observation.provider].find(grade => grade.id === id).observationHash = observationHash(observation, run);
  };
  await save();
  return { root, directory, run, observations, grades, save, rebind,
    summary: () => buildEvaluationSummary({ root, directory }) };
}

test('a complete, bound, current matrix opens the gate without writing reports', async t => {
  const f = await fixture(t);
  const before = await sourceSnapshot(f.directory);
  const summary = await f.summary();
  assert.equal(summary.releaseReady, true);
  assert.equal(summary.gradeValidation.boundGrades, 32);
  assert.equal(summary.attemptedCalls, 32);
  assert.equal(summary.cumulativeAttemptedCalls, 32);
  assert.deepEqual(await sourceSnapshot(f.directory), before);
});

test('final JSON can be reparsed, but trailing prose and other recorded failures remain failures', async t => {
  const f = await fixture(t);
  const record = f.observations.get(sampleId);
  record.status = 'FAIL'; record.reason = 'OUTPUT_CONTRACT_FAILED';
  record.output = `A prose preface.\n\n\`\`\`json\n${output}\n\`\`\``;
  f.rebind(sampleId); await f.save();
  assert.equal((await f.summary()).releaseReady, true);
  record.output += '\nTrailing prose'; f.rebind(sampleId); await f.save();
  assert.equal((await f.summary()).results.find(result => result.id === sampleId).structuralReason, 'OUTPUT_CONTRACT_FAILED');
  record.output = output; record.reason = 'UNRECOGNIZED_FAILURE'; f.rebind(sampleId); await f.save();
  assert.equal((await f.summary()).results.find(result => result.id === sampleId).structuralReason, 'UNRECOGNIZED_FAILURE');
});

test('a PASS semantic grade never waives missing skill-read evidence', async t => {
  const f = await fixture(t);
  const record = f.observations.get(sampleId);
  record.skillRead = false; record.status = 'FAIL'; record.reason = 'SKILL_READ_NOT_OBSERVED';
  f.rebind(sampleId); await f.save();
  let summary = await f.summary();
  assert.equal(summary.releaseReady, false);
  assert.equal(summary.results.find(result => result.id === sampleId).semantic, 'PASS');
  assert.equal(summary.results.find(result => result.id === sampleId).status, 'FAIL');
  record.skillRead = true; f.rebind(sampleId); await f.save();
  summary = await f.summary();
  assert.equal(summary.results.find(result => result.id === sampleId).structuralReason, 'SKILL_READ_NOT_OBSERVED');
  record.status = 'REVIEW_REQUIRED'; record.reason = null; record.actions = []; f.rebind(sampleId); await f.save();
  assert.equal((await f.summary()).releaseReady, false);
});

test('failures and uncertainty block release; every planned call must be dispatched', async t => {
  const f = await fixture(t);
  const id = 'claude--scope-repository-contract';
  const record = f.observations.get(id);
  record.status = 'FAIL'; record.reason = 'SKILL_READ_NOT_OBSERVED'; record.skillRead = false;
  f.rebind(id); await f.save();
  const summary = await f.summary();
  assert.equal(summary.releaseReady, false);
  assert.equal(summary.results.find(result => result.id === id).status, 'FAIL');
  record.status = 'NOT_RUN'; record.reason = 'QUOTA_OR_BUDGET'; f.rebind(id); await f.save();
  assert.equal((await f.summary()).releaseReady, false);
  record.providerCalled = false; f.rebind(id); await f.save();
  assert.ok((await f.summary()).releaseBlockers.includes('UNDISPATCHED_MATRIX_RECORDS'));
  record.providerCalled = true; record.status = 'REVIEW_REQUIRED'; record.reason = null; record.skillRead = true;
  f.grades.claude.find(grade => grade.id === id).semantic = 'UNCLEAR'; f.rebind(id); await f.save();
  assert.equal((await f.summary()).releaseReady, false);
});

test('a missing result, unknown ID, or duplicate observation cannot satisfy the matrix', async t => {
  const f = await fixture(t);
  await rm(path.join(f.directory, `${sampleId}.json`));
  assert.equal((await f.summary()).releaseReady, false);
  await f.save();
  await saveJson(path.join(f.directory, 'codex--unknown.json'), { ...f.observations.get(sampleId), id: 'codex--unknown' });
  assert.equal((await f.summary()).observationValidation.valid, false);
  await rm(path.join(f.directory, 'codex--unknown.json'));
  await saveJson(path.join(f.directory, 'codex--duplicate.json'), f.observations.get(sampleId));
  assert.equal((await f.summary()).releaseReady, false);
});

test('grade fields, provider, IDs, duplicates, and PASS with missing facts are validated', async t => {
  const f = await fixture(t);
  const original = structuredClone(f.grades.codex);
  const mutations = [
    grades => { delete grades[0].observationHash; },
    grades => { grades[0].semantic = 'APPROVED'; },
    grades => { grades[0].rationale = ' '; },
    grades => { grades[0].unsupportedClaims = [3]; },
    grades => { grades[0].missingFacts = ['A required fact was missed']; },
    grades => { grades[0].id = 'codex--unknown'; },
    grades => { grades[0] = structuredClone(f.grades.claude[0]); },
    grades => { grades.push(structuredClone(grades[0])); },
  ];
  for (const mutate of mutations) {
    f.grades.codex = structuredClone(original); mutate(f.grades.codex); await f.save();
    const summary = await f.summary();
    assert.equal(summary.releaseReady, false);
    assert.equal(summary.gradeValidation.valid, false);
  }
});

test('missing, failed, and unclear skill grades all block release', async t => {
  const f = await fixture(t);
  const index = f.grades.codex.findIndex(grade => grade.id === sampleId);
  const grade = f.grades.codex[index];
  for (const semantic of ['FAIL', 'UNCLEAR']) {
    grade.semantic = semantic; await f.save();
    assert.equal((await f.summary()).releaseReady, false);
  }
  f.grades.codex.splice(index, 1); await f.save();
  assert.ok((await f.summary()).releaseBlockers.includes('SEMANTIC_REVIEW_INCOMPLETE'));
});

test('grades bind output, actual changed files, checks, and source inputs but not inheritance bookkeeping', async t => {
  const f = await fixture(t);
  const record = f.observations.get(editId);
  const original = structuredClone(record);
  const hash = observationHash(record, f.run);
  assert.equal(observationHash({ ...record, inherited: true, inheritedFrom: 'parent', attemptedThisRun: false,
    priorObservation: { run: 'prior' }, usage: { output_tokens: 2 }, durationMs: 1 }, f.run), hash);
  assert.equal(observationHash(Object.fromEntries(Object.entries(record).reverse()), f.run), hash);
  for (const mutate of [r => { r.output += ' '; }, r => { r.changedFiles['src/receipt.mjs'] += ' changed'; },
    r => { r.afterChecks[0].exitCode = 1; }]) {
    f.observations.set(editId, structuredClone(original)); mutate(f.observations.get(editId)); await f.save();
    const summary = await f.summary();
    assert.equal(summary.releaseReady, false);
    assert.ok(summary.gradeValidation.errors.some(error => error === `Grade evidence hash mismatch: ${editId}`));
  }
  const changedRun = structuredClone(f.run);
  changedRun.skillHashes['rm-refine'].NOTICE = sha256('changed attribution');
  assert.notEqual(observationHash(original, changedRun), hash);
});

test('current fixture, configuration and whole skill sources must match run inputs', async t => {
  const f = await fixture(t);
  const files = ['evals/cases.mjs', 'evals/config.json', 'skills/rm-review/agents/openai.yaml', 'skills/rm-review/NOTICE'];
  for (const relative of files) {
    const file = path.join(f.root, relative), original = await readFile(file);
    await writeFile(file, relative.endsWith('.json') ? JSON.stringify({ changed: true }) : 'Changed after evaluation');
    const summary = await f.summary();
    assert.equal(summary.releaseReady, false, relative);
    assert.equal(summary.inputValidation.valid, false, relative);
    await writeFile(file, original);
  }
  await mkdir(path.join(f.root, 'skills/rm-review/references'));
  await writeFile(path.join(f.root, 'skills/rm-review/references/new.md'), 'New required resource');
  assert.equal((await f.summary()).inputValidation.checks.currentSkillSources, false);
});

test('tampered or symlinked archived sources cannot be trusted through declared hashes', async t => {
  const f = await fixture(t);
  const frozen = path.join(f.directory, 'skills/rm-review/NOTICE');
  const original = await readFile(frozen);
  await writeFile(frozen, 'Tampered frozen attribution');
  assert.equal((await f.summary()).inputValidation.checks.skillSnapshot, false);
  await rm(frozen); await symlink(path.join(f.root, 'skills/rm-review/NOTICE'), frozen);
  assert.equal((await f.summary()).inputValidation.checks.skillSnapshot, false);
  await rm(frozen); await writeFile(frozen, original);
  assert.equal((await f.summary()).inputValidation.checks.skillSnapshot, true);
});

test('whole-source snapshots include a prototype-named file as an ordinary own property', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'refactor-me-source-'));
  t.after(() => rm(directory, { recursive: true }));
  await writeFile(path.join(directory, '__proto__'), 'Must be hashed');
  const hashes = await sourceSnapshot(directory);
  assert.deepEqual(Object.keys(hashes), ['__proto__']);
  assert.equal(Object.getPrototypeOf(hashes), Object.prototype);
  assert.equal(hashes.__proto__, sha256('Must be hashed'));
});

test('observation input identity, completed dispatch and exact required checks are mandatory', async t => {
  const f = await fixture(t);
  const original = structuredClone(f.observations.get(editId));
  const mutations = [
    r => { r.fixtureHash = sha256('another fixture'); },
    r => { r.model = { model: 'another-model', effort: 'high' }; },
    r => { r.skill = 'rm-scope'; },
    r => { r.providerCalled = false; },
    r => { r.status = 'UNKNOWN'; },
    r => { delete r.baselineChecks; },
    r => { r.baselineChecks[0].passed = false; },
    r => { r.afterChecks = []; },
    r => { r.afterChecks[0].exitCode = 1; },
    r => { r.changedPaths = []; r.changedFiles = {}; },
    r => { r.changedPaths.push('test/receipt.test.mjs'); },
    r => { r.changedFiles = {}; },
  ];
  for (const mutate of mutations) {
    f.observations.set(editId, structuredClone(original)); mutate(f.observations.get(editId)); f.rebind(editId); await f.save();
    assert.equal((await f.summary()).releaseReady, false);
  }
});

test('invalid observation provenance blocks release', async t => {
  const f = await fixture(t);
  const id = 'codex--scope-repository-contract';
  const original = structuredClone(f.observations.get(id));
  for (const mutate of [r => { r.model.model = 'unmatched'; }, r => { r.status = 'UNKNOWN'; }, r => { delete r.afterChecks; }]) {
    f.observations.set(id, structuredClone(original)); mutate(f.observations.get(id)); f.rebind(id); await f.save();
    const summary = await f.summary();
    assert.equal(summary.releaseReady, false);
    assert.equal(summary.observationValidation.valid, false);
  }
});

async function recheckFixture(t) {
  const f = await fixture(t);
  const parentRun = structuredClone(f.run);
  const archive = path.join(f.directory, 'prior-records');
  await mkdir(archive);
  const parentBytes = JSON.stringify(parentRun);
  await writeFile(path.join(archive, 'run.json'), parentBytes);
  await saveJson(path.join(archive, 'summary.json'), { schemaVersion: 2, attemptedCalls: 32, cumulativeAttemptedCalls: 32 });
  for (const record of f.observations.values()) await saveJson(path.join(archive, `${record.id}.json`), record);
  const name = 'rm-review';
  for (const dir of [path.join(f.root, 'skills', name), path.join(f.directory, 'skills', name)]) {
    await writeFile(path.join(dir, 'SKILL.md'), 'Revised synthetic skill');
  }
  f.run.skillHashes[name] = await sourceSnapshot(path.join(f.root, 'skills', name));
  Object.assign(f.run, { startedAt: 'recheck', explicitRecheck: true, recheckedSkills: [name],
    priorAttemptedCalls: 32, plannedNewCalls: 4, parentRun: { id: parentRun.startedAt, runHash: sha256(parentBytes) },
    sourceChanges: { [name]: { beforeHashes: parentRun.skillHashes[name], afterHashes: f.run.skillHashes[name],
      changedFiles: [{ path: 'SKILL.md', beforeHash: parentRun.skillHashes[name]['SKILL.md'], afterHash: f.run.skillHashes[name]['SKILL.md'] }] } } });
  for (const record of f.observations.values()) {
    const selected = record.skill === name;
    Object.assign(record, { inherited: !selected, attemptedThisRun: selected });
    if (!selected) record.inheritedFrom = parentRun.startedAt;
    else f.rebind(record.id);
  }
  await f.save();
  return f;
}

test('explicit recheck preserves metadata and inherited grade hashes with exact attempt accounting', async t => {
  const f = await recheckFixture(t);
  const summary = await f.summary();
  assert.equal(summary.releaseReady, true, JSON.stringify(summary.releaseBlockers));
  assert.equal(summary.explicitRecheck, true);
  assert.deepEqual(summary.recheckedSkills, ['rm-review']);
  assert.deepEqual(summary.sourceChanges, f.run.sourceChanges);
  assert.equal(summary.attemptedCalls, 4);
  assert.equal(summary.inheritedRecords, 28);
  assert.equal(summary.cumulativeAttemptedCalls, 36);
});

test('recheck bookkeeping, selected sources and prior attempt counts cannot be forged independently', async t => {
  const f = await recheckFixture(t);
  const record = f.observations.get(sampleId);
  record.attemptedThisRun = true; await f.save();
  assert.equal((await f.summary()).runValidation.valid, false);
  record.attemptedThisRun = false; f.run.priorAttemptedCalls = 31; await f.save();
  assert.equal((await f.summary()).runValidation.valid, false);
  f.run.priorAttemptedCalls = 32; f.run.sourceChanges['rm-review'].changedFiles = []; await f.save();
  assert.equal((await f.summary()).runValidation.valid, false);
});

test('an inherited observation cannot acquire new evidence without a dispatched recheck', async t => {
  const f = await recheckFixture(t);
  f.observations.get(sampleId).output += ' ';
  f.rebind(sampleId); await f.save();
  const summary = await f.summary();
  assert.equal(summary.gradeValidation.valid, true, 'the new grade hash alone is not provenance');
  assert.equal(summary.releaseReady, false);
  assert.ok(summary.runValidation.errors.includes(`Inherited evidence differs from parent: ${sampleId}`));
});

test('a current run cannot aggregate older observations or parent provenance', async t => {
  const f = await recheckFixture(t);
  for (const relative of [`${sampleId}.json`, 'prior-records/run.json', 'prior-records/summary.json', `prior-records/${sampleId}.json`]) {
    const file = path.join(f.directory, relative);
    const original = await readFile(file);
    const record = JSON.parse(original);
    record.schemaVersion = 1;
    await saveJson(file, record);
    const before = await sourceSnapshot(f.directory);
    await assert.rejects(f.summary(), { code: 'UNSUPPORTED_EVALUATION_SCHEMA' });
    assert.deepEqual(await sourceSnapshot(f.directory), before);
    await writeFile(file, original);
  }
});

test('CLI rejects unreadable metadata without overwriting the archive', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'refactor-me-summary-cli-'));
  t.after(() => rm(directory, { recursive: true }));
  await writeFile(path.join(directory, 'run.json'), 'not JSON');
  await saveJson(path.join(directory, 'reviewed-summary.json'), { releaseReady: true });
  const script = fileURLToPath(new URL('../scripts/summarize-eval.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [script, directory], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.deepEqual(JSON.parse(await readFile(path.join(directory, 'reviewed-summary.json'))), { releaseReady: true });
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.releaseReady, false);
  assert.deepEqual(summary.releaseBlockers, ['SUMMARY_VALIDATION_FAILED']);
});
