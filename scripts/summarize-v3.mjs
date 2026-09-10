import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assertV3, assertSame } from './eval-v3-contract.mjs';
import { sourceSnapshot } from './eval-resume.mjs';
import { summarize } from './eval-v3-summary.mjs';
try {
  if (!process.argv[2] || process.argv.length > 4) throw new Error('Usage: summarize-v3.mjs <directory> [blind-grades.json]');
  const directory = path.resolve(process.argv[2]);
  const read = async file => JSON.parse(await readFile(file, 'utf8'));
  const metadata = await read(path.join(directory, 'run.json')); assertV3(metadata);
  assertSame(metadata.frozenHashes, await sourceSnapshot(path.join(directory, 'frozen')));
  const cases = await read(path.join(directory, 'frozen/cases.json'));
  const records = [];
  for (const file of await readdir(path.join(directory, 'records'))) records.push(await read(path.join(directory, 'records', file)));
  const grades = process.argv[3] ? await read(path.resolve(process.argv[3])) : [];
  const result = summarize(metadata, records, cases, grades);
  await writeFile(path.join(directory, 'reviewed-summary.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  if (!result.evaluationPassed) process.exitCode = 1;
} catch(error) { console.error(error.message); process.exitCode = 1; }
