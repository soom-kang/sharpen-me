import { writeFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEvaluationSummary } from './eval-summary.mjs';
import { failureReport } from './eval-contract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = process.argv[2];
if (!directory || process.argv.length !== 3) throw new Error('Usage: node scripts/summarize-eval.mjs <local-run-directory>');
if (!(await lstat(directory)).isDirectory()) throw new Error('Expected a real run directory');
let summary;
try { summary = await buildEvaluationSummary({ root, directory: path.resolve(directory) }); }
catch (error) {
  // A rejected format must not overwrite evidence in an older archive.
  console.log(JSON.stringify(failureReport(error), null, 2));
  process.exit(1);
}
const destination = path.join(directory, 'reviewed-summary.json');
try { if (!(await lstat(destination)).isFile()) throw new Error('Summary destination must be a regular file'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
await writeFile(destination, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ schemaVersion: summary.schemaVersion, completedRecords: summary.completedRecords, attemptedCalls: summary.attemptedCalls,
  releaseReady: summary.releaseReady, releaseBlockers: summary.releaseBlockers, counts: summary.counts }, null, 2));
if (!summary.releaseReady) process.exitCode = 1;
