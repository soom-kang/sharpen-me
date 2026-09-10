import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  parseEvaluationArgs, matrixId, selectResumeRecords, assertFrozenInputs,
  priorAttemptCount, inheritRecord, inheritGrades, sourceSnapshot, loadResume, sha256,
} from '../scripts/eval-resume.mjs';

const matrix = ['codex', 'claude'].flatMap(provider => Array.from({ length: 16 }, (_, index) =>
  ({ provider, testCase: { id: `case-${index}` } })));
const records = matrix.map((item, index) => ({
  schemaVersion: 2, id: matrixId(item), provider: item.provider, case: item.testCase.id,
  status: index < 7 ? 'REVIEW_REQUIRED' : index < 16 ? 'NOT_RUN' : 'FAIL',
  ...(index >= 7 && index < 16 ? { reason: 'QUOTA_OR_BUDGET' } : {}),
  providerCalled: index < 8 || index >= 16,
}));

test('resume requires an explicit argument and can be inspected without execution', () => {
  assert.deepEqual(parseEvaluationArgs([]), { dryRun: false, resumeDirectory: null, recheckDirectory: null, skills: [] });
  assert.deepEqual(parseEvaluationArgs(['--resume', 'eval-results/prior', '--dry-run']), { dryRun: true, resumeDirectory: 'eval-results/prior', recheckDirectory: null, skills: [] });
  for (const args of [['--resume'], ['--resume', '--dry-run'], ['--retry'], ['--resume', 'a', '--resume', 'b']]) {
    assert.throws(() => parseEvaluationArgs(args), /Usage/);
  }
});

test('quota continuation selects the interrupted call and eight uncalled records, never completed cases', () => {
  const plan = selectResumeRecords(records, matrix);
  assert.equal(plan.selectedIds.length, 9);
  assert.equal(plan.selectedIds[0], records[7].id);
  assert.equal(records[7].providerCalled, true);
  assert.equal(records[8].providerCalled, false);
  assert.ok(plan.selectedIds.every(id => id.startsWith('codex--')));
  assert.ok(records.filter(record => record.status !== 'NOT_RUN').every(record => !plan.selectedIds.includes(record.id)));
});

test('PASS, FAIL, REVIEW_REQUIRED and non-quota failures are not eligible', () => {
  const changed = structuredClone(records);
  changed[7] = { ...changed[7], status: 'PASS' };
  changed[8] = { ...changed[8], status: 'FAIL' };
  changed[9] = { ...changed[9], status: 'REVIEW_REQUIRED' };
  changed[10].reason = 'AUTH_ERROR';
  changed[11].reason = 'TIMEOUT';
  const plan = selectResumeRecords(changed, matrix);
  assert.equal(plan.selectedIds.length, 4);
  for (let index = 7; index <= 11; index += 1) assert.ok(!plan.selectedIds.includes(changed[index].id));
});

test('incomplete, duplicate and mismatched record matrices are rejected', () => {
  assert.throws(() => selectResumeRecords(records.slice(1), matrix), /complete prior matrix/);
  assert.throws(() => selectResumeRecords([...records, records[0]], matrix), /duplicate/);
  const altered = structuredClone(records);
  altered[0].provider = 'claude';
  assert.throws(() => selectResumeRecords(altered, matrix), /identity mismatch/);
});

const parent = {
  schemaVersion: 2, fixtureHash: 'fixture-hash', config: { timeoutMs: 180_000, providers: { codex: { model: 'm', effort: 'high' } } },
  skillHashes: { replacement: { 'SKILL.md': 'skill-hash' } },
};
const current = () => ({ ...structuredClone(parent), currentSkillHashes: structuredClone(parent.skillHashes) });

test('resume rejects fixture, configuration and source drift', () => {
  assert.doesNotThrow(() => assertFrozenInputs(parent, current()));
  for (const field of ['fixtureHash', 'config', 'skillHashes']) {
    const changed = current();
    changed[field] = 'changed';
    assert.throws(() => assertFrozenInputs(parent, changed), new RegExp(field + ' mismatch'));
  }
  const changed = current();
  changed.currentSkillHashes.replacement['SKILL.md'] = 'edited';
  assert.throws(() => assertFrozenInputs(parent, changed), /current skill sources mismatch/);
});

test('continuation accounting retains the consumed quota call, then counts only new dispatches', () => {
  assert.equal(priorAttemptCount({ attemptedCalls: 24 }, records), 24);
  const { selectedIds } = selectResumeRecords(records, matrix);
  const selected = new Set(selectedIds);
  const continued = records.map(record => selected.has(record.id)
    ? { ...record, status: 'REVIEW_REQUIRED', providerCalled: true, inherited: false, attemptedThisRun: true }
    : inheritRecord(record, 'original-run'));
  assert.equal(continued.filter(record => record.attemptedThisRun).length, 9);
  assert.equal(continued.filter(record => record.providerCalled).length, 32);
  assert.equal(priorAttemptCount({ attemptedCalls: 9, cumulativeAttemptedCalls: 33 }, continued), 33);
  assert.throws(() => priorAttemptCount({ attemptedCalls: 23 }, records), /accounting/);
  assert.equal(records[7].status, 'NOT_RUN', 'the original quota failure remains unchanged');
});

test('inherited records retain the evidence and grades exclude retried IDs', () => {
  const inherited = inheritRecord(records[0], 'parent-run');
  assert.equal(inherited.providerCalled, true);
  assert.equal(inherited.attemptedThisRun, false);
  assert.equal(inherited.inheritedFrom, 'parent-run');
  assert.equal(records[0].inherited, undefined);
  const { selectedIds, byId } = selectResumeRecords(records, matrix);
  const grades = [{ id: records[0].id, semantic: 'PASS' }, { id: records[7].id, semantic: 'NOT_RUN' }];
  assert.deepEqual(inheritGrades(grades, selectedIds, byId), [grades[0]]);
  assert.throws(() => inheritGrades([{ id: 'unknown' }], selectedIds, byId), /Unknown/);
});

async function archivedFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sharpen-me-resume-'));
  const directory = path.join(root, 'eval-results', 'original');
  await mkdir(path.join(directory, 'skills', 'replacement'), { recursive: true });
  await mkdir(path.join(root, 'skills', 'replacement'), { recursive: true });
  const source = '---\nname: replacement\n---\nSynthetic skill.\n';
  await writeFile(path.join(directory, 'skills', 'replacement', 'SKILL.md'), source);
  await writeFile(path.join(root, 'skills', 'replacement', 'SKILL.md'), source);
  const metadata = { ...structuredClone(parent), plannedCalls: 32, startedAt: 'original',
    skillHashes: { replacement: { 'SKILL.md': sha256(source) } } };
  await writeFile(path.join(directory, 'run.json'), JSON.stringify(metadata));
  await writeFile(path.join(directory, 'summary.json'), JSON.stringify({ schemaVersion: 2, plannedCalls: 32, attemptedCalls: 24 }));
  for (const record of records) await writeFile(path.join(directory, `${record.id}.json`), JSON.stringify(record));
  await writeFile(path.join(directory, 'grades-codex.json'), JSON.stringify([{ id: records[0].id, semantic: 'PASS' }]));
  return { root, directory, metadata, options: { root, directory, fixtureHash: metadata.fixtureHash,
    config: metadata.config, catalog: [{ name: 'replacement' }], matrix } };
}

test('archive loading validates frozen bytes and preserves original evidence without writes', async () => {
  const fixture = await archivedFixture();
  try {
    const before = await sourceSnapshot(fixture.directory);
    const loaded = await loadResume(fixture.options);
    assert.equal(loaded.selectedIds.length, 9);
    assert.equal(loaded.priorAttemptedCalls, 24);
    assert.equal(loaded.parentRun.id, 'original');
    assert.equal(loaded.parentRun.runHash, sha256(await readFile(path.join(fixture.directory, 'run.json'))));
    assert.equal(loaded.grades[0].inherited.length, 1);
    assert.deepEqual(await sourceSnapshot(fixture.directory), before);
    await writeFile(path.join(fixture.directory, 'skills', 'replacement', 'SKILL.md'), 'tampered');
    await assert.rejects(loadResume(fixture.options), /skillHashes mismatch/);
  } finally { await rm(fixture.root, { recursive: true }); }
});

test('current source edits and symlinked frozen files cannot silently enter a continuation', async () => {
  const fixture = await archivedFixture();
  try {
    const file = path.join(fixture.root, 'skills', 'replacement', 'SKILL.md');
    const original = await readFile(file);
    await writeFile(file, 'changed after the first run');
    await assert.rejects(loadResume(fixture.options), /current skill sources mismatch/);
    await writeFile(file, original);
    const frozen = path.join(fixture.directory, 'skills', 'replacement', 'SKILL.md');
    await rm(frozen);
    await symlink(file, frozen);
    await assert.rejects(loadResume(fixture.options), /symlinks or special files/);
  } finally { await rm(fixture.root, { recursive: true }); }
});

test('a v2 run cannot resume an older summary or observation', async () => {
  const fixture = await archivedFixture();
  try {
    for (const name of ['summary.json', `${records[0].id}.json`]) {
      const file = path.join(fixture.directory, name);
      const original = await readFile(file);
      const record = JSON.parse(original);
      delete record.schemaVersion;
      await writeFile(file, JSON.stringify(record));
      const before = await sourceSnapshot(fixture.directory);
      await assert.rejects(loadResume(fixture.options), { code: 'UNSUPPORTED_EVALUATION_SCHEMA' });
      assert.deepEqual(await sourceSnapshot(fixture.directory), before);
      await writeFile(file, original);
    }
  } finally { await rm(fixture.root, { recursive: true }); }
});
