import { mkdir, mkdtemp, writeFile, readFile, cp, rm, readdir, lstat, realpath, rename, chmod } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { cases } from '../evals/additional-cases.mjs';
import { catalog } from './catalog.mjs';
import { run } from './process.mjs';
import { sourceSnapshot, sha256 } from './eval-resume.mjs';
import { sanitize } from './eval-observation.mjs';
import { dockerPreflight, dockerCheck } from './eval-docker.mjs';
import { observeV3, providerCommand, taskPrompt } from './eval-v3-observation.mjs';
import { schemaVersion, baseline, selectedProviders, idOf, matrixFor, parseArgs, assertV3, assertSame, seal, validateRecords, dispatchMatrix } from './eval-v3-contract.mjs';
import { summarize, blindPacket } from './eval-v3-summary.mjs';
import { readBaseline, validateBaselineSnapshot, validateRunIdentity } from './eval-baseline.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = async file => JSON.parse(await readFile(file, 'utf8'));
async function writeJSON(file, value) {
  const temporary = `${file}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2) + '\n');
  await rename(temporary, file);
}
async function inventory() {
  return { skills: await sourceSnapshot(path.join(root, 'skills')), runner: await sourceSnapshot(path.join(root, 'scripts')), fixtures: await sourceSnapshot(path.join(root, 'evals')) };
}
function contained(directory, relative) {
  const target = path.resolve(directory, relative);
  if (!relative || path.isAbsolute(relative) || !target.startsWith(`${directory}${path.sep}`)) throw new Error('Fixture path escapes workspace');
  return target;
}
async function fixtureSnapshot(directory, prefix = '') {
  const output = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) Object.assign(output, await fixtureSnapshot(full, relative));
    else if (entry.isFile()) output[relative] = sha256(await readFile(full));
    else output[relative] = 'UNSAFE_FILE';
  }
  return output;
}
export async function readChangedFiles(cwd, changedPaths, mutablePaths, unsafe) {
  const files = {};
  // A parent symlink can make lstat(file).isFile() true outside the fixture.
  // Never inspect changed contents once the snapshot contains an unsafe entry.
  if (unsafe) return files;
  for (const relative of changedPaths.filter(p => mutablePaths.includes(p))) {
    const target = contained(cwd, relative);
    try {
      const resolved = await realpath(target);
      if (!resolved.startsWith(`${cwd}${path.sep}`) || !(await lstat(target)).isFile()) throw new Error('UNSAFE_FIXTURE_PATH');
      files[relative] = await readFile(target, 'utf8');
    } catch (error) { if (error.code !== 'ENOENT') throw error; files[relative] = null; }
  }
  return files;
}
export async function versions(providers, execute = run) {
  const found = {};
  for (const name of providers) {
    const result = await execute([name, '--version'], { timeoutMs: 10_000 });
    if (result.code !== 0 || result.timedOut) throw new Error(`CLI_UNAVAILABLE: ${name}`);
    found[name] = result.stdout.trim();
  }
  return found;
}
async function preflight(providers) {
  if (process.version !== 'v24.20.0') throw new Error('Evaluation host must use Node 24.20.0');
  const probe = await realpath(await mkdtemp(path.join(os.tmpdir(), 'sharpen-isolation-')));
  try {
    await chmod(probe, 0o755);
    await writeFile(path.join(probe, 'probe.txt'), 'fixture');
    return { docker: await dockerPreflight(probe), cli: await versions(providers), node: process.version };
  } finally { await rm(probe, { recursive: true }); }
}
export async function freeze(directory, prepared) {
  const frozen = path.join(directory, 'frozen');
  for (const [version, files] of [['original', prepared.original], ['before', prepared.normalized]]) {
    for (const [file, bytes] of Object.entries(files)) {
      const target = contained(path.join(frozen, version, 'skills'), file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, bytes);
    }
  }
  await cp(path.join(root, 'skills'), path.join(frozen, 'after', 'skills'), { recursive: true });
  for (const folder of ['scripts', 'evals']) await cp(path.join(root, folder), path.join(frozen, folder), { recursive: true });
  await writeJSON(path.join(frozen, 'cases.json'), cases);
  await validateBaselineSnapshot(frozen, prepared.provenance);
  return sourceSnapshot(frozen);
}
async function loadArchive(directory, matrix, current, prepared) {
  const location = await realpath(path.resolve(root, directory));
  const results = await realpath(path.join(root, 'eval-results'));
  if (!location.startsWith(`${results}${path.sep}`) || !(await lstat(path.resolve(root, directory))).isDirectory()) throw new Error('Resume requires a local archive directory');
  const metadata = await json(path.join(location, 'run.json'));
  assertV3(metadata);
  selectedProviders(metadata.config);
  validateRunIdentity(metadata);
  assertSame(metadata.baselineNormalization, prepared.provenance);
  await validateBaselineSnapshot(path.join(location, 'frozen'), metadata.baselineNormalization);
  assertSame(metadata.config, await json(path.join(root, 'evals/config.json')));
  assertSame(metadata.workingInputs, current);
  assertSame(metadata.frozenHashes, await sourceSnapshot(path.join(location, 'frozen')));
  assertSame(metadata.matrix, matrix.map(item => ({ id: idOf(item), provider: item.provider, version: item.version, case: item.testCase.id, repeat: item.repeat })));
  const records = [];
  for (const name of await readdir(path.join(location, 'records'))) {
    if (!name.endsWith('.json')) throw new Error('Incomplete observation file requires investigation');
    records.push(await json(path.join(location, 'records', name)));
  }
  return { location, metadata, records: validateRecords(records, matrix, metadata.inputHash) };
}
export async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  const config = await json(path.join(root, 'evals/config.json'));
  const matrix = matrixFor(cases, config);
  // Schema rejection precedes inventory and any external process or write.
  if (options.resume) {
    const parent = await json(path.resolve(root, options.resume, 'run.json'));
    assertV3(parent); selectedProviders(parent.config);
  }
  const prepared = await readBaseline(root);
  const current = options.dryRun && !options.resume ? null : await inventory();
  const archive = options.resume ? await loadArchive(options.resume, matrix, current, prepared) : null;
  if (options.dryRun) {
    const calls = matrix.filter(item => !archive?.records.get(idOf(item))?.providerCalled).map(item => ({ id: idOf(item), provider: item.provider, version: item.version, case: item.testCase.id, repeat: item.repeat }));
    console.log(JSON.stringify({ schemaVersion, baseline, baselineNormalization: prepared.provenance, config, plannedCalls: matrix.length, plannedNewCalls: calls.length, historicalAttemptedCalls: config.historicalAttemptedCalls, maximumCumulativeCalls: config.historicalAttemptedCalls + config.maxCalls, calls }, null, 2)); return;
  }
  // No provider inference dispatch is permitted until Docker proves isolation.
  const environment = await preflight(selectedProviders(config));
  if (archive) assertSame(archive.metadata.environment, environment);
  const directory = archive?.location ?? path.join(root, 'eval-results', new Date().toISOString().replace(/[:.]/g, '-') + '-v3');
  let metadata = archive?.metadata;
  if (!metadata) {
    await mkdir(path.join(directory, 'records'), { recursive: true });
    const frozenHashes = await freeze(directory, prepared);
    assertSame(current, await inventory());
    const inputs = { baseline, baselineNormalization: prepared.provenance, config, workingInputs: current, frozenHashes, environment, casesHash: sha256(JSON.stringify(cases)) };
    metadata = { schemaVersion, startedAt: new Date().toISOString(), ...inputs, inputHash: sha256(JSON.stringify(inputs)),
      matrix: matrix.map(item => ({ id: idOf(item), provider: item.provider, version: item.version, case: item.testCase.id, repeat: item.repeat })) };
    await writeJSON(path.join(directory, 'run.json'), metadata);
  }
  const assertInputs = async () => {
    validateRunIdentity(metadata);
    assertSame(metadata.workingInputs, await inventory());
    assertSame(metadata.environment.cli, await versions(selectedProviders(config)));
    assertSame(metadata.frozenHashes, await sourceSnapshot(path.join(directory, 'frozen')));
  };
  const logFile = path.join(directory, 'dispatch.json');
  let dispatch = [];
  if (archive) {
    dispatch = await json(logFile);
    if (new Set(dispatch.map(d => d.id)).size !== dispatch.length || dispatch.some(d => !archive.records.get(d.id)?.providerCalled)) throw new Error('Incomplete dispatch evidence: do not automatically repeat an uncertain call');
    if (dispatch.length !== [...archive.records.values()].filter(r => r.providerCalled).length) throw new Error('Dispatch accounting mismatch');
  }
  // Queue writes across the two lanes so dispatch order is durable before spawn.
  let logWrite = Promise.resolve();
  async function markDispatch(item) {
    if (dispatch.length >= config.maxCalls || dispatch.some(d => d.id === idOf(item))) throw new Error('CALL_BUDGET_EXCEEDED');
    dispatch.push({ id: idOf(item), order: dispatch.length + 1, at: new Date().toISOString() });
    const state = structuredClone(dispatch);
    logWrite = logWrite.then(() => writeJSON(logFile, state)); await logWrite;
  }
  async function checks(testCase, cwd, phase) {
    const outcomes = [];
    for (const check of testCase.checks ?? []) {
      if (phase === 'before' && check.when !== 'before-and-after') continue;
      const result = await dockerCheck(environment.docker.id, cwd, check.argv);
      outcomes.push({ purpose: check.purpose, passed: result.code === check.expectedExitCode && !result.timedOut && !result.overflow,
        exitCode: result.code, timedOut: result.timedOut, output: sanitize(result.stdout + result.stderr, cwd) });
    }
    return outcomes;
  }
  async function evaluate(item) {
    const { provider, testCase, version } = item;
    const cwd = await realpath(await mkdtemp(path.join(os.tmpdir(), 'sharpen-me-eval-')));
    await chmod(cwd, 0o755);
    const observation = { providerCalled: false };
    try {
      for (const [relative, contents] of Object.entries(testCase.files)) {
        const target = contained(cwd, relative); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, contents);
      }
      const agentPath = provider === 'codex' ? '.agents' : '.claude';
      await cp(path.join(directory, 'frozen', version, 'skills'), path.join(cwd, agentPath, 'skills'), { recursive: true });
      const sources = {};
      for (const { name } of catalog) sources[name] = await readFile(path.join(cwd, agentPath, 'skills', name, 'SKILL.md'), 'utf8');
      observation.baselineChecks = await checks(testCase, cwd, 'before');
      if (observation.baselineChecks.some(c => !c.passed)) return { ...observation, status: 'NOT_RUN', reason: 'HARNESS_ERROR' };
      const before = await fixtureSnapshot(cwd);
      await assertInputs();
      await markDispatch(item); observation.providerCalled = true;
      const result = await run(providerCommand(provider, testCase, cwd, config), { cwd, input: taskPrompt(provider, testCase), timeoutMs: config.timeoutMs });
      Object.assign(observation, observeV3(provider, result, testCase, sources, config.providers[provider].model, cwd));
      const after = await fixtureSnapshot(cwd);
      observation.changedPaths = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(p => before[p] !== after[p]);
      observation.forbiddenChanges = observation.changedPaths.filter(p => !testCase.mutablePaths.includes(p));
      const unsafe = Object.values(after).includes('UNSAFE_FILE');
      observation.afterChecks = unsafe || observation.forbiddenChanges.length ? [] : await checks(testCase, cwd, 'after');
      observation.changedFiles = await readChangedFiles(cwd, observation.changedPaths, testCase.mutablePaths, unsafe);
      if (observation.status !== 'NOT_RUN' && (unsafe || observation.forbiddenChanges.length)) { observation.status = 'FAIL'; observation.reason = 'OUT_OF_SCOPE_WRITE'; }
      else if (observation.status === 'REVIEW_REQUIRED' && observation.afterChecks.some(c => !c.passed)) { observation.status = 'FAIL'; observation.reason = 'BEHAVIOR_CHECK_FAILED'; }
      else if (observation.status === 'REVIEW_REQUIRED' && testCase.mutablePaths.length && !observation.changedPaths.length) { observation.status = 'FAIL'; observation.reason = 'REQUESTED_EDIT_NOT_PERFORMED'; }
      await assertInputs();
    } catch (error) {
      observation.status = 'NOT_RUN'; observation.reason = error.message === 'DOCKER_ISOLATION_FAILED' ? error.message : 'HARNESS_ERROR';
      observation.detail = sanitize(error.message, cwd);
    } finally { await rm(cwd, { recursive: true }); }
    return JSON.parse(sanitize(JSON.stringify(observation), cwd));
  }
  const persist = async (item, result) => {
    const record = seal({ schemaVersion, id: idOf(item), provider: item.provider, version: item.version,
      case: item.testCase.id, repeat: item.repeat, inputHash: metadata.inputHash, ...result });
    await writeJSON(path.join(directory, 'records', `${record.id}.json`), record); return record;
  };
  const records = await dispatchMatrix(matrix, archive?.records ?? new Map(), evaluate, persist, assertInputs);
  await writeJSON(path.join(directory, 'blind-review.json'), blindPacket(records, cases));
  const summary = summarize(metadata, records, cases, []);
  await writeJSON(path.join(directory, 'summary.json'), summary);
  console.log(JSON.stringify({ directory, ...summary }, null, 2));
  if (!summary.evaluationPassed) process.exitCode = 1;
}
