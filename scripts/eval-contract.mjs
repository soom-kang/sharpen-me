export const schemaVersion = 2;

export class EvaluationSchemaError extends Error {
  constructor(label) {
    super(`${label} must use evaluation schemaVersion ${schemaVersion}. Start a new evaluation; older records are preserved and cannot be converted or continued.`);
    this.code = 'UNSUPPORTED_EVALUATION_SCHEMA';
  }
}

export function assertEvaluationSchema(value, label = 'Evaluation record') {
  if (!value || value.schemaVersion !== schemaVersion ||
      ['arm', 'upstream', 'baselineHashes', 'replacementHashes'].some(key => Object.hasOwn(value, key))) {
    throw new EvaluationSchemaError(label);
  }
}

export function failureReport(error) {
  return { schemaVersion, releaseReady: false,
    releaseBlockers: [error.code === 'UNSUPPORTED_EVALUATION_SCHEMA' ? error.code : 'SUMMARY_VALIDATION_FAILED'],
    completedRecords: 0, attemptedCalls: 0, counts: {},
    error: error.code === 'UNSUPPORTED_EVALUATION_SCHEMA' ? error.message :
      'Evaluation inputs could not be read or validated. No release approval was produced.' };
}
