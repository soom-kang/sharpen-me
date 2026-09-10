import { readFile, readdir, lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { schemaVersion, assertEvaluationSchema } from './eval-contract.mjs';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const matrixId = ({ provider, testCase }) => `${provider}--${testCase.id}`;

export function parseEvaluationArgs(args) {
  const options = { dryRun: false, resumeDirectory: null, recheckDirectory: null, skills: [] };
  const usage = 'Usage: evaluate.mjs [--dry-run] [--resume <run-directory> | --recheck <run-directory> --skill <name> ...]';
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--dry-run' && !options.dryRun) options.dryRun = true;
    else if (args[index] === '--resume' && !options.resumeDirectory && args[index + 1] && !args[index + 1].startsWith('--')) {
      options.resumeDirectory = args[++index];
    } else if (args[index] === '--recheck' && !options.recheckDirectory && args[index + 1] && !args[index + 1].startsWith('--')) {
      options.recheckDirectory = args[++index];
    } else if (args[index] === '--skill' && args[index + 1] && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(args[index + 1])) {
      const name = args[++index];
      if (options.skills.includes(name)) throw new Error(usage);
      options.skills.push(name);
    } else throw new Error(usage);
  }
  if (options.resumeDirectory && options.recheckDirectory) throw new Error(usage);
  if (Boolean(options.recheckDirectory) !== Boolean(options.skills.length)) throw new Error(usage);
  return options;
}

async function regularFile(file) {
  if (!(await lstat(file)).isFile()) throw new Error(`Expected a regular archived file: ${file}`);
  return readFile(file);
}

export async function sourceSnapshot(directory, prefix = '') {
  if (!(await lstat(directory)).isDirectory()) throw new Error(`Expected a real source directory: ${directory}`);
  const found = [];
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...Object.entries(await sourceSnapshot(full, relative)));
    else if (entry.isFile()) found.push([relative, sha256(await regularFile(full))]);
    else throw new Error(`Frozen source cannot contain symlinks or special files: ${relative}`);
  }
  return Object.fromEntries(found);
}

function assertArchiveInputs(parent, current) {
  assertEvaluationSchema(parent, 'Parent run');
  assertEvaluationSchema(current, 'Current inputs');
  for (const field of ['fixtureHash', 'config', 'skillHashes']) {
    if (!isDeepStrictEqual(parent[field], current[field])) throw new Error(`Resume ${field} mismatch; start a separately authorized evaluation instead`);
  }
  if (parent.config?.timeoutMs !== 180_000) throw new Error('Resume requires the original 180-second timeout');
}

export function assertFrozenInputs(parent, current) {
  assertArchiveInputs(parent, current);
  if (!isDeepStrictEqual(parent.skillHashes, current.currentSkillHashes)) {
    throw new Error('Resume current skill sources mismatch the frozen skill sources');
  }
}

export function assertRecheckInputs(parent, current, skills, catalog) {
  assertArchiveInputs(parent, current);
  const known = new Set(catalog.map(item => item.name));
  if (!skills.length || new Set(skills).size !== skills.length || skills.some(name => !known.has(name))) {
    throw new Error('Recheck requires unique, explicitly selected catalog skill names');
  }
  const selected = new Set(skills);
  const sourceChanges = {};
  for (const { name } of catalog) {
    const beforeHashes = parent.skillHashes[name];
    const afterHashes = current.currentSkillHashes[name];
    if (!beforeHashes || !afterHashes) throw new Error(`Recheck skill inventory mismatch: ${name}`);
    const differs = !isDeepStrictEqual(beforeHashes, afterHashes);
    if (selected.has(name) && !differs) throw new Error(`Selected recheck skill has not changed: ${name}`);
    if (!selected.has(name) && differs) throw new Error(`Unselected skill changed: ${name}`);
    if (selected.has(name)) {
      const changedFiles = [...new Set([...Object.keys(beforeHashes), ...Object.keys(afterHashes)])].sort()
        .filter(file => beforeHashes[file] !== afterHashes[file])
        .map(file => ({ path: file, beforeHash: beforeHashes[file] ?? null, afterHash: afterHashes[file] ?? null }));
      sourceChanges[name] = { changedFiles, beforeHashes, afterHashes };
    }
  }
  return sourceChanges;
}

export function selectRecheckIds(matrix, skills) {
  const selected = new Set(skills);
  const items = matrix.filter(item => selected.has(item.testCase.skill));
  for (const skill of skills) {
    const matching = items.filter(item => item.testCase.skill === skill);
    if (matching.length !== 4 || new Set(matching.map(item => item.provider)).size !== 2 ||
        new Set(matching.map(item => item.testCase.id)).size !== 2) {
      throw new Error(`Recheck requires two cases across two providers for ${skill}`);
    }
  }
  return items.map(matrixId);
}

export function selectResumeRecords(records, matrix) {
  const expected = new Map(matrix.map(item => [matrixId(item), item]));
  const byId = new Map();
  for (const record of records) {
    assertEvaluationSchema(record, 'Archived observation');
    const item = expected.get(record.id);
    if (!item || byId.has(record.id)) throw new Error(`Unknown or duplicate evaluation record: ${record.id}`);
    if (record.provider !== item.provider || record.case !== item.testCase.id) {
      throw new Error(`Evaluation record identity mismatch: ${record.id}`);
    }
    if (!['PASS', 'FAIL', 'REVIEW_REQUIRED', 'NOT_RUN'].includes(record.status) || typeof record.providerCalled !== 'boolean') {
      throw new Error(`Incomplete evaluation record: ${record.id}`);
    }
    byId.set(record.id, record);
  }
  if (byId.size !== expected.size) throw new Error('Resume requires a complete prior matrix, including uncalled records');
  const selectedIds = matrix.map(matrixId).filter(id => {
    const record = byId.get(id);
    return record.status === 'NOT_RUN' && record.reason === 'QUOTA_OR_BUDGET';
  });
  return { byId, selectedIds };
}

export function priorAttemptCount(summary, records) {
  const ownAttempts = records.filter(record => record.attemptedThisRun ?? (!record.inherited && record.providerCalled)).length;
  if (!Number.isInteger(summary.attemptedCalls) || summary.attemptedCalls !== ownAttempts) {
    throw new Error('Prior attempted-call accounting does not match its records');
  }
  const cumulative = summary.cumulativeAttemptedCalls ?? summary.attemptedCalls;
  if (!Number.isInteger(cumulative) || cumulative < ownAttempts) throw new Error('Invalid prior cumulative attempted-call count');
  return cumulative;
}

export function inheritRecord(record, parentId) {
  return { ...record, inherited: true, attemptedThisRun: false, inheritedFrom: parentId };
}

export function inheritGrades(grades, selectedIds, byId) {
  if (!Array.isArray(grades)) throw new Error('Archived grades must be an array');
  const selected = new Set(selectedIds);
  const seen = new Set();
  return grades.filter(grade => {
    if (!byId.has(grade.id) || seen.has(grade.id)) throw new Error(`Unknown or duplicate archived grade: ${grade.id}`);
    seen.add(grade.id);
    return !selected.has(grade.id);
  });
}

async function loadContinuation({ root, directory, fixtureHash, config, catalog, matrix, recheckSkills = null }) {
  const resultsRoot = await realpath(path.join(root, 'eval-results'));
  const requested = path.resolve(root, directory);
  if (!(await lstat(requested)).isDirectory()) throw new Error('Resume target must be a real run directory');
  const parentDirectory = await realpath(requested);
  if (!parentDirectory.startsWith(`${resultsRoot}${path.sep}`)) throw new Error('Resume target must be inside this project\'s eval-results');
  const runBytes = await regularFile(path.join(parentDirectory, 'run.json'));
  const parent = JSON.parse(runBytes);
  assertEvaluationSchema(parent, 'Parent run');
  const summary = JSON.parse(await regularFile(path.join(parentDirectory, 'summary.json')));
  assertEvaluationSchema(summary, 'Parent summary');
  if (parent.plannedCalls !== matrix.length || summary.plannedCalls !== matrix.length) throw new Error('Resume matrix size mismatch');
  const skillDirectory = path.join(parentDirectory, 'skills');
  if (!(await lstat(skillDirectory)).isDirectory()) throw new Error('Resume source snapshot must be a real directory');
  const skillHashes = {}, currentSkillHashes = {};
  if (!isDeepStrictEqual((await readdir(skillDirectory)).sort(), catalog.map(item => item.name).sort())) throw new Error('Frozen skill inventory mismatch');
  for (const { name } of catalog) {
    skillHashes[name] = await sourceSnapshot(path.join(skillDirectory, name));
    currentSkillHashes[name] = await sourceSnapshot(path.join(root, 'skills', name));
  }
  const current = { schemaVersion, fixtureHash, config, skillHashes, currentSkillHashes };
  const sourceChanges = recheckSkills ? assertRecheckInputs(parent, current, recheckSkills, catalog) : null;
  if (!recheckSkills) assertFrozenInputs(parent, current);
  const records = [];
  for (const item of matrix) records.push(JSON.parse(await regularFile(path.join(parentDirectory, `${matrixId(item)}.json`))));
  const validated = selectResumeRecords(records, matrix);
  const byId = validated.byId;
  const selectedIds = recheckSkills ? selectRecheckIds(matrix, recheckSkills) : validated.selectedIds;
  if (!selectedIds.length) throw new Error('No quota-interrupted NOT_RUN records are eligible for explicit resume');
  const priorAttemptedCalls = priorAttemptCount(summary, records);
  const grades = [];
  for (const provider of new Set(matrix.map(item => item.provider))) {
    const file = `grades-${provider}.json`;
    try {
      const contents = await regularFile(path.join(parentDirectory, file));
      grades.push({ file, contents, inherited: inheritGrades(JSON.parse(contents), selectedIds, byId) });
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return { parent, parentDirectory, skillDirectory, records, byId, selectedIds, grades, priorAttemptedCalls,
    sourceChanges, targetSkillHashes: recheckSkills ? currentSkillHashes : skillHashes,
    parentRun: { id: parent.startedAt, directory: path.relative(root, parentDirectory), runHash: sha256(runBytes) } };
}

export const loadResume = options => loadContinuation({ ...options, recheckSkills: null });
export async function loadRecheck(options) {
  if (!Array.isArray(options.skills) || !options.skills.length) throw new Error('Recheck requires explicitly selected skills');
  return loadContinuation({ ...options, recheckSkills: options.skills });
}
