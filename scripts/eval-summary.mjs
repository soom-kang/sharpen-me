import { readFile, readdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { legacyCases as cases } from '../evals/cases.mjs';
import { catalog } from './catalog.mjs';
import { schemaVersion, assertEvaluationSchema } from './eval-contract.mjs';
import { parseResponse } from './eval-observation.mjs';
import { sha256, sourceSnapshot, priorAttemptCount } from './eval-resume.mjs';

const providers = ['codex', 'claude'];
const matrix = providers.flatMap(provider => cases.map(testCase =>
  ({ id: `${provider}--${testCase.id}`, provider, testCase })));
const expected = new Map(matrix.map(item => [item.id, item]));
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const strings = value => Array.isArray(value) && value.every(item => typeof item === 'string');
const nonemptyStrings = value => strings(value) && value.every(item => item.trim());
const sorted = value => Array.isArray(value) ? value.toSorted() : null;
const canonical = value => Array.isArray(value) ? value.map(canonical) : isObject(value)
  ? Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => [key, canonical(value[key])])) : value;

// Bind a review to evidence and frozen inputs. Continuation bookkeeping is excluded.
export function observationHash(observation, run) {
  const fields = ['schemaVersion', 'id', 'provider', 'case', 'skill', 'model', 'fixtureHash', 'providerCalled',
    'status', 'reason', 'processExitCode', 'providerCompleted', 'output', 'skillRead', 'actions', 'changedPaths', 'changedFiles',
    'forbiddenChanges', 'baselineChecks', 'afterChecks'];
  const evidence = Object.fromEntries(fields.map(key => [key, observation[key]]));
  const inputs = { schemaVersion: run.schemaVersion, fixtureHash: run.fixtureHash, config: run.config,
    skillHashes: run.skillHashes?.[observation.skill] };
  return sha256(JSON.stringify(canonical({ version: schemaVersion, inputs, evidence })));
}

async function regularFile(file) {
  if (!(await lstat(file)).isFile()) throw new Error('Expected a regular evaluation file');
  return readFile(file);
}
const jsonFile = async file => JSON.parse(await regularFile(file));

async function skillHashes(directory) {
  if (!(await lstat(directory)).isDirectory() ||
      !isDeepStrictEqual((await readdir(directory)).sort(), catalog.map(item => item.name).sort())) throw new Error('Skill directory inventory mismatch');
  const hashes = {};
  for (const { name } of catalog) hashes[name] = await sourceSnapshot(path.join(directory, name));
  return hashes;
}

async function validateInputs(root, directory, run) {
  const checks = {};
  const check = async (name, read, recorded) => {
    try { checks[name] = isDeepStrictEqual(await read(), recorded); }
    catch { checks[name] = false; }
  };
  await check('fixture', async () => sha256(await regularFile(path.join(root, 'evals/cases.mjs'))), run.fixtureHash);
  await check('config', () => jsonFile(path.join(root, 'evals/config.json')), run.config);
  await check('skillSnapshot', () => skillHashes(path.join(directory, 'skills')), run.skillHashes);
  await check('currentSkillSources', () => skillHashes(path.join(root, 'skills')), run.skillHashes);
  return { valid: Object.values(checks).every(Boolean), checks,
    errors: Object.entries(checks).filter(([, valid]) => !valid).map(([name]) => `${name} differs from the run or cannot be verified`) };
}

function checksComplete(recorded, required) {
  return Array.isArray(recorded) && recorded.length === required.length && recorded.every((check, index) =>
    isObject(check) && check.purpose === required[index].purpose && typeof check.passed === 'boolean' &&
    (check.exitCode === null || Number.isInteger(check.exitCode)) && typeof check.timedOut === 'boolean');
}
const checksPass = (recorded, required) => recorded.every((check, index) => check.passed === true &&
  check.exitCode === required[index].expectedExitCode && check.timedOut === false);

function structuralResult(observation, item, run) {
  const fail = reason => ({ structural: 'FAIL', structuralReason: reason });
  if (!['PASS', 'FAIL', 'REVIEW_REQUIRED', 'NOT_RUN'].includes(observation.status)) return fail('INVALID_OBSERVATION_STATUS');
  if (observation.status === 'NOT_RUN') return { structural: 'NOT_RUN', structuralReason: observation.reason ?? 'NOT_RUN' };
  if (observation.providerCalled !== true) return { structural: 'NOT_RUN', structuralReason: 'PROVIDER_NOT_CALLED' };
  if (observation.fixtureHash !== run.fixtureHash || !isDeepStrictEqual(observation.model, run.config?.providers?.[item.provider]) ||
      observation.skill !== item.testCase.skill) return fail('OBSERVATION_INPUT_MISMATCH');
  if ((observation.processExitCode !== undefined && observation.processExitCode !== 0) || observation.providerCompleted === false) return fail('PROVIDER_EXECUTION_FAILED');
  // Only the historical final-JSON parser failure is eligible for correction.
  const successfulRead = Array.isArray(observation.actions) && observation.actions.some(action =>
    action?.kind === 'requested_skill_read' && (item.provider === 'codex' ? action.exitCode === 0 : action.success === true));
  if (observation.reason === 'SKILL_READ_NOT_OBSERVED' || observation.skillRead !== true || !successfulRead) return fail('SKILL_READ_NOT_OBSERVED');
  if (observation.status === 'FAIL' && observation.reason !== 'OUTPUT_CONTRACT_FAILED') return fail(observation.reason ?? 'RECORDED_FAILURE');
  if (observation.reason && observation.reason !== 'OUTPUT_CONTRACT_FAILED') return fail(observation.reason);
  if (!strings(observation.changedPaths) || new Set(observation.changedPaths).size !== observation.changedPaths.length ||
      !strings(observation.forbiddenChanges)) return fail('MISSING_CHANGE_EVIDENCE');
  if (observation.forbiddenChanges.length || observation.changedPaths.some(file => !item.testCase.mutablePaths.includes(file))) return fail('OUT_OF_SCOPE_WRITE');
  const checks = item.testCase.checks ?? [];
  const baselineChecks = checks.filter(check => check.when === 'before-and-after');
  if (!checksComplete(observation.baselineChecks, baselineChecks)) return fail('MISSING_BASELINE_CHECK_EVIDENCE');
  if (!checksPass(observation.baselineChecks, baselineChecks)) return fail('FIXTURE_BASELINE_FAILED');
  if (!checksComplete(observation.afterChecks, checks)) return fail('MISSING_BEHAVIOR_CHECK_EVIDENCE');
  if (!checksPass(observation.afterChecks, checks)) return fail('BEHAVIOR_CHECK_FAILED');
  if (item.testCase.mutablePaths.length && !observation.changedPaths.length) return fail('REQUESTED_EDIT_NOT_PERFORMED');
  if (!isObject(observation.changedFiles) || !isDeepStrictEqual(Object.keys(observation.changedFiles).sort(), sorted(observation.changedPaths)) ||
      Object.values(observation.changedFiles).some(value => value !== null && typeof value !== 'string')) return fail('MISSING_CHANGED_FILE_EVIDENCE');
  try { parseResponse(observation.output); }
  catch { return fail('OUTPUT_CONTRACT_FAILED'); }
  return { structural: 'PASS', structuralReason: null };
}

function validateGrade(grade, provider, observations, run) {
  if (!isObject(grade) || typeof grade.id !== 'string' || !expected.has(grade.id)) return 'Unknown or invalid grade identity';
  if (expected.get(grade.id).provider !== provider) return `Grade provider mismatch: ${grade.id}`;
  if (!observations.has(grade.id)) return `Grade has no observation: ${grade.id}`;
  if (!isDeepStrictEqual(Object.keys(grade).sort(), ['id', 'semantic', 'rationale', 'missingFacts', 'unsupportedClaims', 'observationHash'].sort()) ||
      !['PASS', 'FAIL', 'UNCLEAR'].includes(grade.semantic) || typeof grade.rationale !== 'string' || !grade.rationale.trim() ||
      !nonemptyStrings(grade.missingFacts) || !nonemptyStrings(grade.unsupportedClaims)) return `Invalid grade schema: ${grade.id}`;
  if (grade.semantic === 'PASS' && grade.missingFacts.length) return `PASS grade lists missing facts: ${grade.id}`;
  if (typeof grade.observationHash !== 'string' || !/^[a-f0-9]{64}$/.test(grade.observationHash) ||
      grade.observationHash !== observationHash(observations.get(grade.id), run)) return `Grade evidence hash mismatch: ${grade.id}`;
  return null;
}

async function validateRunMetadata(run, observations, directory) {
  const errors = [];
  if (run.plannedCalls !== matrix.length) errors.push('Run matrix size mismatch');
  if (!isObject(run.versions) || providers.some(provider => typeof run.versions[provider] !== 'string' || !run.versions[provider].trim())) errors.push('Missing recorded provider versions');
  for (const field of ['explicitResume', 'explicitRecheck']) if (run[field] !== undefined && typeof run[field] !== 'boolean') errors.push(`Invalid ${field}`);
  if (run.explicitResume && run.explicitRecheck) errors.push('Resume and recheck cannot both be active');
  const prior = run.priorAttemptedCalls ?? 0;
  if (!Number.isInteger(prior) || prior < 0) errors.push('Invalid prior attempted-call count');
  const continuation = run.explicitResume === true || run.explicitRecheck === true;
  if (!continuation && prior !== 0) errors.push('Prior attempted calls require continuation provenance');
  const selectedSkills = run.recheckedSkills ?? [];
  if (!strings(selectedSkills) || new Set(selectedSkills).size !== selectedSkills.length ||
      selectedSkills.some(skill => !catalog.some(item => item.name === skill))) errors.push('Invalid rechecked skill inventory');
  else if (run.explicitRecheck) {
    if (!selectedSkills.length || !isObject(run.sourceChanges) || !isDeepStrictEqual(Object.keys(run.sourceChanges).sort(), sorted(selectedSkills))) errors.push('Missing recheck source changes');
    else for (const name of selectedSkills) {
      const change = run.sourceChanges[name];
      if (!isObject(change) || !isObject(change.beforeHashes) || !isObject(change.afterHashes) ||
          isDeepStrictEqual(change.beforeHashes, change.afterHashes) || !isDeepStrictEqual(change.afterHashes, run.skillHashes?.[name])) {
        errors.push(`Invalid recheck source hashes: ${name}`); continue;
      }
      const changedFiles = [...new Set([...Object.keys(change.beforeHashes), ...Object.keys(change.afterHashes)])].sort()
        .filter(file => change.beforeHashes[file] !== change.afterHashes[file])
        .map(file => ({ path: file, beforeHash: change.beforeHashes[file] ?? null, afterHash: change.afterHashes[file] ?? null }));
      if (!isDeepStrictEqual(change.changedFiles, changedFiles)) errors.push(`Invalid recheck file changes: ${name}`);
    }
  } else if (selectedSkills.length || run.sourceChanges != null) errors.push('Recheck metadata requires explicitRecheck');
  const ownRecords = observations.filter(record => !record.inherited);
  if (run.plannedNewCalls !== undefined && (!Number.isInteger(run.plannedNewCalls) || run.plannedNewCalls < 0 ||
    (observations.length === matrix.length && run.plannedNewCalls !== ownRecords.length))) errors.push('New record accounting mismatch');
  for (const record of observations) {
    if (typeof record.providerCalled !== 'boolean' || (record.inherited !== undefined && typeof record.inherited !== 'boolean') ||
        (record.attemptedThisRun !== undefined && typeof record.attemptedThisRun !== 'boolean')) {
      errors.push(`Invalid call accounting: ${record.id}`); continue;
    }
    const inherited = record.inherited ?? false;
    const attempted = record.attemptedThisRun ?? (!inherited && record.providerCalled);
    if (attempted !== (!inherited && record.providerCalled) || (inherited && (!continuation || record.inheritedFrom !== run.parentRun?.id))) errors.push(`Inconsistent call accounting: ${record.id}`);
    if (run.explicitRecheck && strings(selectedSkills)) {
      const selected = selectedSkills.includes(expected.get(record.id)?.testCase.skill);
      if (inherited === selected) errors.push(`Incorrect recheck inheritance: ${record.id}`);
    }
  }
  if (continuation) {
    try {
      const archivedRunBytes = await regularFile(path.join(directory, 'prior-records/run.json'));
      const archivedRun = JSON.parse(archivedRunBytes);
      assertEvaluationSchema(archivedRun, 'Archived parent run');
      const archivedSummary = await jsonFile(path.join(directory, 'prior-records/summary.json'));
      assertEvaluationSchema(archivedSummary, 'Archived parent summary');
      const archivedRecords = await Promise.all(matrix.map(item => jsonFile(path.join(directory, 'prior-records', `${item.id}.json`))));
      if (run.parentRun?.runHash !== sha256(archivedRunBytes) || run.parentRun?.id !== archivedRun.startedAt ||
          prior !== priorAttemptCount(archivedSummary, archivedRecords)) errors.push('Continuation provenance or prior call count mismatch');
      if (prior !== (archivedRun.priorAttemptedCalls ?? 0) + archivedSummary.attemptedCalls) errors.push('Archived cumulative call count mismatch');
      for (const field of ['schemaVersion', 'fixtureHash', 'config', 'versions', ...(run.explicitResume ? ['skillHashes'] : [])]) {
        if (!isDeepStrictEqual(run[field], archivedRun[field])) errors.push(`Continuation ${field} mismatch`);
      }
      const archivedById = new Map();
      for (let index = 0; index < matrix.length; index++) {
        const previous = archivedRecords[index], item = matrix[index];
        assertEvaluationSchema(previous, 'Archived parent observation');
        if (previous.id !== item.id || previous.provider !== item.provider || previous.case !== item.testCase.id) {
          errors.push('Archived observation identity mismatch'); continue;
        }
        archivedById.set(previous.id, previous);
      }
      for (const observation of observations.filter(record => record.inherited)) {
        const previous = archivedById.get(observation.id);
        if (!previous || observationHash(observation, run) !== observationHash(previous, archivedRun)) errors.push(`Inherited evidence differs from parent: ${observation.id}`);
      }
      if (run.explicitRecheck && isObject(run.sourceChanges) && strings(selectedSkills)) for (const name of selectedSkills) {
        if (!isDeepStrictEqual(run.sourceChanges[name]?.beforeHashes, archivedRun.skillHashes?.[name])) errors.push(`Recheck before-source mismatch: ${name}`);
      }
    } catch (error) {
      if (error.code === 'UNSUPPORTED_EVALUATION_SCHEMA') throw error;
      errors.push('Continuation archive cannot be verified');
    }
  }
  return { valid: errors.length === 0, errors };
}

export async function buildEvaluationSummary({ root, directory }) {
  const run = await jsonFile(path.join(directory, 'run.json'));
  assertEvaluationSchema(run, 'Run');
  const inputValidation = await validateInputs(root, directory, run);
  const observationErrors = [];
  const observations = new Map();
  for (const file of (await readdir(directory)).filter(file => /^(?:codex|claude)--.*\.json$/.test(file)).sort()) {
    try {
      const observation = await jsonFile(path.join(directory, file));
      assertEvaluationSchema(observation, 'Observation');
      const item = expected.get(observation?.id);
      if (!item || observation.provider !== item.provider || observation.case !== item.testCase.id ||
          file !== `${observation.id}.json` || observations.has(observation.id)) {
        observationErrors.push(`Invalid, unknown, or duplicate observation: ${file}`); continue;
      }
      observations.set(observation.id, observation);
    } catch (error) {
      if (error.code === 'UNSUPPORTED_EVALUATION_SCHEMA') throw error;
      observationErrors.push(`Unreadable observation: ${file}`);
    }
  }
  const gradeErrors = [];
  const grades = new Map();
  const seenGrades = new Set();
  for (const provider of providers) {
    let entries;
    try { entries = await jsonFile(path.join(directory, `grades-${provider}.json`)); }
    catch (error) { if (error.code === 'ENOENT') continue; gradeErrors.push(`Unreadable ${provider} grades`); continue; }
    if (!Array.isArray(entries)) { gradeErrors.push(`Invalid ${provider} grade collection`); continue; }
    for (const grade of entries) {
      const error = validateGrade(grade, provider, observations, run);
      if (error) gradeErrors.push(error);
      if (seenGrades.has(grade?.id)) gradeErrors.push(`Duplicate grade: ${grade?.id}`);
      else if (!error) grades.set(grade.id, grade);
      seenGrades.add(grade?.id);
    }
  }
  const runValidation = await validateRunMetadata(run, [...observations.values()], directory);
  const results = [...observations.values()].map(observation => {
    const item = expected.get(observation.id);
    const structural = structuralResult(observation, item, run);
    const grade = grades.get(observation.id);
    const status = structural.structural !== 'PASS' ? structural.structural :
      !grade || grade.semantic === 'UNCLEAR' ? 'REVIEW_REQUIRED' : grade.semantic;
    return { schemaVersion, id: observation.id, provider: observation.provider, case: observation.case,
      status, ...structural, semantic: grade?.semantic ?? 'UNREVIEWED', observationHash: observationHash(observation, run),
      rationale: grade?.rationale ?? null, missingFacts: grade?.missingFacts ?? [], unsupportedClaims: grade?.unsupportedClaims ?? [],
      providerCalled: observation.providerCalled, inherited: observation.inherited ?? false,
      attemptedThisRun: observation.attemptedThisRun ?? (!observation.inherited && observation.providerCalled),
      durationMs: observation.durationMs ?? null, usage: observation.usage ?? null,
      changedPaths: observation.changedPaths ?? [], baselineChecks: observation.baselineChecks ?? [], afterChecks: observation.afterChecks ?? [] };
  });
  const invalidEvidence = new Set(['INVALID_OBSERVATION_STATUS', 'OBSERVATION_INPUT_MISMATCH', 'MISSING_CHANGE_EVIDENCE',
    'MISSING_BASELINE_CHECK_EVIDENCE', 'FIXTURE_BASELINE_FAILED', 'MISSING_BEHAVIOR_CHECK_EVIDENCE', 'MISSING_CHANGED_FILE_EVIDENCE']);
  for (const result of results) if (invalidEvidence.has(result.structuralReason)) observationErrors.push(`Invalid observation evidence: ${result.id}: ${result.structuralReason}`);
  const releaseBlockers = [];
  if (!inputValidation.valid) releaseBlockers.push('CURRENT_OR_FROZEN_INPUT_MISMATCH');
  if (!runValidation.valid) releaseBlockers.push('RUN_METADATA_INVALID');
  if (observationErrors.length) releaseBlockers.push('OBSERVATION_MATRIX_INVALID');
  if (gradeErrors.length) releaseBlockers.push('GRADE_METADATA_INVALID');
  if (results.length !== matrix.length) releaseBlockers.push('MATRIX_INCOMPLETE');
  if (results.some(result => result.providerCalled !== true)) releaseBlockers.push('UNDISPATCHED_MATRIX_RECORDS');
  if (results.some(result => result.structural === 'PASS' && result.semantic === 'UNREVIEWED')) releaseBlockers.push('SEMANTIC_REVIEW_INCOMPLETE');
  if (results.some(result => result.status !== 'PASS')) releaseBlockers.push('SKILLS_NOT_PASSED');
  const attemptedCalls = results.filter(result => result.attemptedThisRun === true).length;
  return { schemaVersion, fixtureHash: run.fixtureHash, skillHashes: run.skillHashes,
    config: run.config, versions: run.versions, plannedCalls: matrix.length, plannedNewCalls: run.plannedNewCalls ?? matrix.length,
    completedRecords: results.length, attemptedCalls, cumulativeAttemptedCalls: (run.priorAttemptedCalls ?? 0) + attemptedCalls,
    inheritedRecords: results.filter(result => result.inherited === true).length,
    explicitResume: run.explicitResume ?? false, explicitRecheck: run.explicitRecheck ?? false,
    recheckedSkills: run.recheckedSkills ?? [], sourceChanges: run.sourceChanges ?? null,
    automaticSelectionMeasured: false, releaseReady: releaseBlockers.length === 0, releaseBlockers,
    inputValidation, runValidation, observationValidation: { valid: observationErrors.length === 0, errors: observationErrors },
    gradeValidation: { valid: gradeErrors.length === 0, errors: gradeErrors, boundGrades: grades.size },
    counts: results.reduce((out, result) => ({ ...out, [`${result.provider}:${result.status}`]: (out[`${result.provider}:${result.status}`] ?? 0) + 1 }), {}),
    notes: ['Semantic grades use frozen expected facts and observed files; the grader can see implementation names.',
      'Grades are bound to observation evidence and frozen inputs. Incidental unsupported claims remain explicit; material claims require semantic review.',
      'The host requires a final JSON object, allowing a prose preface. Only that parse is rechecked; missing skill-read evidence remains a structural failure.',
      'releaseReady requires all 32 planned calls dispatched and passed, completed valid outputs graded, and matching current/frozen inputs. Failed, unrun, or unclear cases block release.'],
    results };
}
