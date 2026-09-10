import { isDeepStrictEqual } from 'node:util';
import { sha256 } from './eval-resume.mjs';
export const schemaVersion = 3;
export const baseline = '09bb9761294f0189a59e119e2b0db1c3db502370';
export const idOf = ({provider, version, testCase, repeat}) => `${provider}--${version}--${testCase.id}--r${repeat}`;
export function assertV3(value) {
  if (value?.schemaVersion !== schemaVersion || ['arm', 'baselineHashes', 'replacementHashes', 'skillHashes'].some(k => Object.hasOwn(value, k))) {
    throw Object.assign(new Error('v3 requires a separate archive; older or mixed records cannot be converted or resumed'), { code: 'UNSUPPORTED_EVALUATION_SCHEMA' });
  }
}
export function selectedProviders(config) {
  const selected = config.selectedProviders;
  if (config.contractRevision !== 2 || config.modelPolicy !== 'primary_response_only') {
    throw Object.assign(new Error('Evaluation policy differs; preserve the old archive and start a separately authorized run'), { code: 'UNSUPPORTED_EVALUATION_POLICY' });
  }
  if (!Array.isArray(selected) || !selected.length || new Set(selected).size !== selected.length ||
      selected.some(p => !['codex','claude'].includes(p) || !config.providers?.[p])) throw new Error('Invalid provider selection');
  if (!Number.isInteger(config.repeats) || config.repeats < 1 || !Number.isInteger(config.maxCalls) || config.maxCalls < 1 ||
      !Number.isInteger(config.historicalAttemptedCalls) || config.historicalAttemptedCalls < 0) throw new Error('Invalid evaluation budget');
  return selected;
}
export function matrixFor(cases, config) {
  if (new Set(cases.map(c => c.id)).size !== cases.length) throw new Error('Duplicate case ID');
  const providers = selectedProviders(config);
  const matrix = [];
  for (let repeat = 1; repeat <= config.repeats; repeat++) {
    cases.forEach((testCase, index) => {
      for (const provider of providers) {
        const versions = (index + repeat + (provider === 'claude' ? 1 : 0)) % 2 ? ['before', 'after'] : ['after', 'before'];
        for (const version of versions) matrix.push({ provider, version, testCase, repeat });
      }
    });
  }
  if (matrix.length !== config.maxCalls || new Set(matrix.map(idOf)).size !== matrix.length) throw new Error('Declared matrix and call budget mismatch');
  return matrix;
}
export function parseArgs(args) {
  const options = { dryRun: false, resume: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run' && !options.dryRun) options.dryRun = true;
    else if (args[i] === '--resume' && !options.resume && args[i+1] && !args[i+1].startsWith('--')) options.resume = args[++i];
    else throw new Error('Usage: evaluate.mjs [--dry-run] [--resume <v3-directory>]; rechecking attempted calls needs separate agreement');
  }
  return options;
}
export function validateRecords(records, matrix, inputHash) {
  const byId = new Map(), expected = new Map(matrix.map(m => [idOf(m), m]));
  for (const record of records) {
    assertV3(record);
    const item = expected.get(record.id);
    if (!item || byId.has(record.id)) throw new Error('Unknown or duplicate observation ID');
    if (record.provider !== item.provider || record.version !== item.version || record.case !== item.testCase.id || record.repeat !== item.repeat || record.inputHash !== inputHash) throw new Error('Observation identity or frozen input mismatch');
    if (typeof record.providerCalled !== 'boolean' || !['NOT_RUN','REVIEW_REQUIRED','PASS','FAIL','UNCLEAR'].includes(record.status)) throw new Error('Invalid observation status');
    if (!record.providerCalled && record.status !== 'NOT_RUN') throw new Error('Uncalled observation cannot count as evidence');
    const { evidenceHash, ...evidence } = record;
    if (evidenceHash !== sha256(JSON.stringify(evidence))) throw new Error('Observation evidence drift');
    byId.set(record.id, record);
  }
  return byId;
}
export function assertSame(expected, actual) {
  if (!isDeepStrictEqual(expected, actual)) throw new Error('FROZEN_INPUT_DRIFT');
}
export const seal = record => ({ ...record, evidenceHash: sha256(JSON.stringify(record)) });
export const stoppingReasons = new Set(['AUTH_ERROR','QUOTA_OR_BUDGET','MODEL_MISMATCH','MODEL_UNVERIFIED','HARNESS_ERROR','DOCKER_ISOLATION_FAILED','FROZEN_INPUT_DRIFT']);
// One lane per provider; attempted calls are terminal, including quota/timeouts.
export async function dispatchMatrix(matrix, prior, execute, persist, assertInputs) {
  let halt = null;
  const records = new Map(prior);
  await Promise.all([...new Set(matrix.map(m => m.provider))].map(async provider => {
    for (const item of matrix.filter(m => m.provider === provider)) {
      const previous = records.get(idOf(item));
      if (previous?.providerCalled) continue;
      let result;
      if (!halt) {
        try { await assertInputs(); result = await execute(item); }
        catch { halt = 'HARNESS_ERROR'; }
      }
      if (!result) result = { status: 'NOT_RUN', reason: halt, providerCalled: false };
      if (stoppingReasons.has(result.reason)) halt = result.reason;
      const record = await persist(item, result);
      records.set(idOf(item), record);
    }
  }));
  return [...records.values()];
}
