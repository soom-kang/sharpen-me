import { parseResponse } from './eval-observation.mjs';
import { sha256 } from './eval-resume.mjs';
import { assertV3, selectedProviders, matrixFor, idOf, validateRecords } from './eval-v3-contract.mjs';
export const blindId = record => sha256(`blind:${record.inputHash}:${record.id}`).slice(0, 24);
export function blindPacket(records, cases) {
  const byCase = new Map(cases.map(c => [c.id, c]));
  return records.filter(r => r.providerCalled).map(record => {
    const testCase = byCase.get(record.case);
    return { blindId: blindId(record), evidenceHash: record.evidenceHash, task: testCase.prompt,
      expected: testCase.expected, outputMode: testCase.output, output: record.output ?? '',
      response: record.response ?? null, loadingEvidence: record.loadingEvidence ?? [],
      baselineChecks: record.baselineChecks ?? [], afterChecks: record.afterChecks ?? [],
      changedFiles: record.changedFiles ?? {}, forbiddenChanges: record.forbiddenChanges ?? [],
      execution: { status: record.status, reason: record.reason, providerCompleted: record.providerCompleted },
      // Grader fills these fields, without a provider/version/case/repetition label.
      grade: { semantic: 'UNCLEAR', rationale: '', missingFacts: [], unsupportedClaims: [], scopeViolations: [] } };
  }).sort((a,b) => a.blindId.localeCompare(b.blindId));
}
export function structuralStatus(record, testCase) {
  if (!record || !record.providerCalled) return 'NOT_RUN';
  if (record.status !== 'REVIEW_REQUIRED') return record.status === 'PASS' ? 'UNCLEAR' : record.status;
  if (!record.providerCompleted || record.processExitCode !== 0) return 'NOT_RUN';
  if (!record.output?.trim()) return 'FAIL';
  if (testCase.output === 'json') { try { parseResponse(record.output); } catch { return 'FAIL'; } }
  if (testCase.invocation === 'explicit' && (!record.skillRead || !record.loadingEvidence?.some(e => e.skill === testCase.skill && e.fullSourceObserved))) return 'UNCLEAR';
  if (testCase.invocation === 'implicit' && record.selection !== 'PASS') return record.selection === 'FAIL' ? 'FAIL' : 'UNCLEAR';
  if (!Array.isArray(record.forbiddenChanges) || record.forbiddenChanges.length) return 'FAIL';
  for (const [phase, field] of [['before','baselineChecks'],['after','afterChecks']]) {
    const expected = (testCase.checks ?? []).filter(c => phase === 'after' || c.when === 'before-and-after');
    const actual = record[field];
    if (!Array.isArray(actual) || actual.length !== expected.length) return 'UNCLEAR';
    if (actual.some((c,i) => c.purpose !== expected[i].purpose || c.exitCode !== expected[i].expectedExitCode || !c.passed || c.timedOut)) return 'FAIL';
  }
  if (testCase.mutablePaths.length && (!record.changedPaths?.length || !record.changedPaths.every(p => testCase.mutablePaths.includes(p)) ||
      !record.changedPaths.every(p => Object.hasOwn(record.changedFiles ?? {},p)))) return 'FAIL';
  return 'REVIEW_REQUIRED';
}
export function summarize(metadata, records, cases, grades) {
  assertV3(metadata);
  const matrix = matrixFor(cases, metadata.config);
  const indexed = validateRecords(records, matrix, metadata.inputHash);
  const byBlind = new Map(records.map(r => [blindId(r), r]));
  const gradeMap = new Map();
  if (!Array.isArray(grades)) throw new Error('Grades must be an array');
  for (const grade of grades) {
    const record = byBlind.get(grade.blindId);
    if (!record || gradeMap.has(grade.blindId)) throw new Error('Unknown or duplicate blind grade');
    if (grade.evidenceHash !== record.evidenceHash) throw new Error('Grade evidence drift');
    if (!['PASS','FAIL','UNCLEAR','NOT_RUN'].includes(grade.semantic) || typeof grade.rationale !== 'string' || !grade.rationale.trim() ||
        ['missingFacts','unsupportedClaims','scopeViolations'].some(k => !Array.isArray(grade[k]) || grade[k].some(v => typeof v !== 'string'))) throw new Error('Invalid semantic grade');
    if (grade.semantic === 'PASS' && [grade.missingFacts,grade.unsupportedClaims,grade.scopeViolations].some(a => a.length)) throw new Error('PASS contradicts reported defects');
    gradeMap.set(grade.blindId, grade);
  }
  const rows = [];
  const counts = { PASS: 0, FAIL: 0, UNCLEAR: 0, NOT_RUN: 0 };
  for (const item of matrix) {
    const record = indexed.get(idOf(item));
    const grade = record && gradeMap.get(blindId(record));
    const structural = structuralStatus(record, item.testCase);
    const status = structural === 'REVIEW_REQUIRED' ? grade?.semantic ?? 'UNCLEAR' : structural;
    counts[status]++;
    rows.push({ skill: item.testCase.skill, provider: item.provider, version: item.version, repeat: item.repeat,
      category: item.testCase.category, status, selection: !record?.providerCalled || record.status === 'NOT_RUN' ? 'NOT_RUN' : record.selection ?? 'NOT_RUN',
      scopeViolations: (record?.forbiddenChanges?.length ?? 0) + (grade?.scopeViolations.length ?? 0),
      durationMs: record?.durationMs ?? null, usage: record?.usage ?? null, modelEvidence: record?.modelEvidence ?? 'NOT_RUN' });
  }
  const benchmarks = [];
  for (const skill of [...new Set(cases.map(c => c.skill))]) for (const provider of selectedProviders(metadata.config)) for (const version of ['before','after']) {
    const selected = rows.filter(r => r.skill === skill && r.provider === provider && r.version === version);
    const count = values => values.reduce((out,r) => { out[r.status]++; return out; }, {PASS:0,FAIL:0,UNCLEAR:0,NOT_RUN:0});
    const durations = selected.map(r => r.durationMs).filter(v => Number.isFinite(v));
    const usage = {};
    for (const row of selected) for (const [key,value] of Object.entries(row.usage ?? {})) if (typeof value === 'number') usage[key] = (usage[key] ?? 0) + value;
    benchmarks.push({ skill, provider, version, behavior: count(selected.filter(r => ['behavior','regression'].includes(r.category))),
      defaultOutput: count(selected.filter(r => r.category === 'default-output')),
      selection: selected.filter(r => r.category === 'selection').reduce((out,r) => { out[r.selection]++; return out; }, {PASS:0,FAIL:0,UNCLEAR:0,NOT_RUN:0}),
      scopeViolations: selected.reduce((n,r) => n + r.scopeViolations, 0),
      timeMs: durations.length ? { count: durations.length, min: Math.min(...durations), max: Math.max(...durations), total: durations.reduce((a,b)=>a+b,0) } : null,
      usage, repeats: Array.from({length:metadata.config.repeats}, (_,i) => ({repeat:i+1,...count(selected.filter(r=>r.repeat===i+1))})) });
  }
  const attemptedCalls = records.filter(r => r.providerCalled).length;
  const after = rows.filter(r => r.version === 'after');
  const unresolved = counts.UNCLEAR + counts.NOT_RUN;
  const selectionRegressions = benchmarks.filter(b => b.version === 'after' && b.selection.PASS < benchmarks.find(a => a.skill === b.skill && a.provider === b.provider && a.version === 'before').selection.PASS).map(b => ({skill:b.skill,provider:b.provider}));
  const providers = selectedProviders(metadata.config);
  const evaluationPassed = attemptedCalls === matrix.length && unresolved === 0 && after.every(r => r.status === 'PASS') && !selectionRegressions.length;
  const deferredProviders = ['codex','claude'].filter(p => !providers.includes(p));
  return { schemaVersion: 3, selectedProviders: providers, deferredProviders, evaluationPassed,
    historicalAttemptedCalls: metadata.config.historicalAttemptedCalls,
    cumulativeAttemptedCalls: metadata.config.historicalAttemptedCalls + attemptedCalls,
    modelPolicy: metadata.config.modelPolicy,
    modelEvidenceCounts: rows.reduce((out,r) => { out[r.modelEvidence] = (out[r.modelEvidence] ?? 0) + 1; return out; }, {}),
    plannedCalls: matrix.length, attemptedCalls, counts,
    releaseReady: evaluationPassed && deferredProviders.length === 0, selectionRegressions,
    benchmarks, limitation: 'Three repetitions per case are descriptive observations, not a general win rate. Provider-reported model identity may be unavailable; inspect modelEvidence.' };
}
