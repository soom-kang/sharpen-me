import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  parseEvaluationArgs, assertRecheckInputs, selectRecheckIds, loadRecheck,
  matrixId, sourceSnapshot, sha256, inheritGrades, selectResumeRecords,
} from '../scripts/eval-resume.mjs';

const catalog = Array.from({ length: 8 }, (_, index) => ({ name: `rm-skill-${index}` }));
const matrix = ['codex', 'claude'].flatMap(provider => catalog.flatMap(({ name }) =>
  ['normal', 'edge'].map(kind => ({ provider, testCase: { id: `${name}-${kind}`, skill: name } }))));
const records = matrix.map((item, index) => ({ schemaVersion: 2, id: matrixId(item), provider: item.provider,
  case: item.testCase.id, status: ['PASS', 'FAIL', 'REVIEW_REQUIRED'][index % 3], providerCalled: true }));
const parent = { schemaVersion: 2, fixtureHash: 'fixed-fixture', config: { timeoutMs: 180_000, providers: {
  codex: { model: 'codex-model', effort: 'high' }, claude: { model: 'claude-model', effort: 'high' },
} }, skillHashes: Object.fromEntries(catalog.map(item => [item.name, { 'SKILL.md': 'old-skill-hash' }])) };

function changedInput(selected) {
  const input = { ...structuredClone(parent), currentSkillHashes: structuredClone(parent.skillHashes) };
  for (const name of selected) input.currentSkillHashes[name]['SKILL.md'] = `new-${name}`;
  return input;
}

test('recheck is explicit, requires unique selected names, and cannot be combined with quota resume', () => {
  assert.deepEqual(parseEvaluationArgs(['--recheck', 'eval-results/prior', '--skill', 'rm-review', '--skill', 'rm-brief', '--dry-run']), {
    dryRun: true, resumeDirectory: null, recheckDirectory: 'eval-results/prior', skills: ['rm-review', 'rm-brief'],
  });
  for (const args of [
    ['--recheck', 'prior'], ['--skill', 'rm-review'],
    ['--resume', 'prior', '--recheck', 'prior', '--skill', 'rm-review'],
    ['--recheck', 'prior', '--skill', 'rm-review', '--skill', 'rm-review'],
    ['--recheck', 'prior', '--skill', '../escape'],
  ]) assert.throws(() => parseEvaluationArgs(args), /Usage/);
});

test('four changed skills select exactly 16 cases and inherit only unselected skills', () => {
  const selected = catalog.slice(0, 4).map(item => item.name);
  const input = changedInput(selected);
  const changes = assertRecheckInputs(parent, input, selected, catalog);
  const ids = selectRecheckIds(matrix, selected);
  assert.equal(ids.length, 16);
  assert.equal(new Set(ids).size, 16);
  assert.ok(ids.every(id => selected.some(name => id.includes(`--${name}-`))));
  assert.deepEqual(Object.keys(changes), selected);
  assert.deepEqual(changes[selected[0]].changedFiles, [{ path: 'SKILL.md', beforeHash: 'old-skill-hash', afterHash: `new-${selected[0]}` }]);
  const { byId } = selectResumeRecords(records, matrix);
  const grades = records.map(record => ({ id: record.id, semantic: 'PASS' }));
  const inherited = inheritGrades(grades, ids, byId);
  assert.equal(inherited.length, 16);
  assert.ok(inherited.every(grade => !ids.includes(grade.id)));
});

test('each explicitly selected skill must differ and no unselected source may drift', () => {
  assert.throws(() => assertRecheckInputs(parent, changedInput([]), ['rm-skill-0'], catalog), /has not changed/);
  assert.throws(() => assertRecheckInputs(parent, changedInput(['rm-skill-0', 'rm-skill-1']), ['rm-skill-0'], catalog), /Unselected skill changed/);
  assert.throws(() => assertRecheckInputs(parent, changedInput([]), ['unknown'], catalog), /catalog skill names/);
  assert.throws(() => assertRecheckInputs(parent, changedInput(['rm-skill-0']), ['rm-skill-0', 'rm-skill-0'], catalog), /unique/);
});

test('recheck does not waive frozen fixture, model or archived-source checks', () => {
  for (const field of ['fixtureHash', 'config', 'skillHashes']) {
    const input = changedInput(['rm-skill-0']);
    input[field] = 'drift';
    assert.throws(() => assertRecheckInputs(parent, input, ['rm-skill-0'], catalog), new RegExp(field + ' mismatch'));
  }
});

test('changed file evidence includes additions and removals with both before and after hashes', () => {
  const before = structuredClone(parent);
  before.skillHashes['rm-skill-0']['old.md'] = 'old-reference';
  const input = { ...structuredClone(before), currentSkillHashes: structuredClone(before.skillHashes) };
  delete input.currentSkillHashes['rm-skill-0']['old.md'];
  input.currentSkillHashes['rm-skill-0']['new.md'] = 'new-reference';
  const changes = assertRecheckInputs(before, input, ['rm-skill-0'], catalog)['rm-skill-0'];
  assert.deepEqual(changes.changedFiles, [
    { path: 'new.md', beforeHash: null, afterHash: 'new-reference' },
    { path: 'old.md', beforeHash: 'old-reference', afterHash: null },
  ]);
});

test('recheck fails when a skill does not have two cases for both providers', () => {
  const incomplete = matrix.filter(item => !(item.provider === 'claude' && item.testCase.skill === 'rm-skill-0'));
  assert.throws(() => selectRecheckIds(incomplete, ['rm-skill-0']), /two cases across two providers/);
});

async function archivedFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'refactor-me-recheck-'));
  const directory = path.join(root, 'eval-results', 'completed');
  await mkdir(path.join(directory, 'skills'), { recursive: true });
  const metadata = { ...structuredClone(parent), plannedCalls: 32, startedAt: 'completed' };
  for (const { name } of catalog) {
    const content = `---\nname: ${name}\n---\nOriginal synthetic procedure.\n`;
    await mkdir(path.join(directory, 'skills', name));
    await mkdir(path.join(root, 'skills', name), { recursive: true });
    await writeFile(path.join(directory, 'skills', name, 'SKILL.md'), content);
    await writeFile(path.join(root, 'skills', name, 'SKILL.md'), content);
    metadata.skillHashes[name] = { 'SKILL.md': sha256(content) };
  }
  await writeFile(path.join(directory, 'run.json'), JSON.stringify(metadata));
  await writeFile(path.join(directory, 'summary.json'), JSON.stringify({ schemaVersion: 2, plannedCalls: 32, attemptedCalls: 32, cumulativeAttemptedCalls: 33 }));
  for (const record of records) await writeFile(path.join(directory, `${record.id}.json`), JSON.stringify(record));
  await writeFile(path.join(directory, 'grades-codex.json'), JSON.stringify(records.filter(record => record.provider === 'codex').map(record => ({ id: record.id, semantic: 'PASS' }))));
  const skills = catalog.slice(0, 4).map(item => item.name);
  for (const name of skills) await writeFile(path.join(root, 'skills', name, 'SKILL.md'), `---\nname: ${name}\n---\nRevised synthetic procedure.\n`);
  return { root, directory, metadata, options: { root, directory, fixtureHash: metadata.fixtureHash,
    config: metadata.config, catalog, matrix, skills } };
}

test('recheck loads all parent records, preserves their bytes, and targets current skill sources only', async () => {
  const fixture = await archivedFixture();
  try {
    const original = await sourceSnapshot(fixture.directory);
    const loaded = await loadRecheck(fixture.options);
    assert.equal(loaded.selectedIds.length, 16);
    assert.equal(loaded.priorAttemptedCalls, 33);
    assert.equal(loaded.records.length, 32);
    assert.equal(loaded.grades[0].inherited.length, 8);
    assert.notEqual(loaded.targetSkillHashes['rm-skill-0']['SKILL.md'], fixture.metadata.skillHashes['rm-skill-0']['SKILL.md']);
    assert.deepEqual(loaded.targetSkillHashes['rm-skill-7'], fixture.metadata.skillHashes['rm-skill-7']);
    assert.deepEqual(await sourceSnapshot(fixture.directory), original);
    await assert.rejects(loadRecheck({ ...fixture.options, skills: [] }), /explicitly selected skills/);
    await rm(path.join(fixture.directory, `${records[0].id}.json`));
    await assert.rejects(loadRecheck(fixture.options), /ENOENT/);
  } finally { await rm(fixture.root, { recursive: true }); }
});

test('an in-progress archive without a final summary cannot be rechecked', async () => {
  const fixture = await archivedFixture();
  try {
    await rm(path.join(fixture.directory, 'summary.json'));
    await assert.rejects(loadRecheck(fixture.options), /ENOENT/);
    const file = path.join(fixture.directory, 'run.json');
    assert.equal(JSON.parse(await readFile(file)).startedAt, 'completed');
  } finally { await rm(fixture.root, { recursive: true }); }
});
