// Bounded single-version runs from a plan file (beta.7 by default); the
// historical 576-call runner and archives stay unchanged.
import { mkdir, mkdtemp, writeFile, readFile, cp, rm, readdir, realpath, rename, chmod, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { catalog } from './catalog.mjs';
import { root } from './verify.mjs';
import { run } from './process.mjs';
import { sourceSnapshot, sha256 } from './eval-resume.mjs';
import { sanitize, sanitizeObservation, parseEvents } from './eval-observation.mjs';
import { providerCommand, taskPrompt, observeV3 } from './eval-v3-observation.mjs';
import { idOf, seal, validateRecords, stoppingReasons } from './eval-v3-contract.mjs';
import { blindPacket, blindId, structuralStatus, combinedStatus } from './eval-v3-summary.mjs';
import { createProviderDispatch, readChangedFiles, versions } from './eval-v3.mjs';
import { dockerPreflight, dockerCheck } from './eval-docker.mjs';

let plan, cases, directory, frozen, matrix, config;
// A control item runs the same prompt without installed skills, so any
// observed Skill access is unexpected and the semantic grade decides the rest.
export function focusedMatrix(plan, cases) {
  const control = new Set(plan.control ?? []);
  return cases.flatMap(testCase => ['after', ...(control.has(testCase.id) ? ['control'] : [])].flatMap(version =>
    ['codex', 'claude'].map(provider => ({ provider, version, repeat: 1,
      testCase: version === 'control' ? { ...testCase, invocation: 'implicit', expectedSkills: [] } : testCase }))));
}
async function configure(planFile) {
  ({ plan, cases } = await import(pathToFileURL(path.resolve(root, planFile)).href));
  directory = path.join(root, 'eval-results', plan.id);
  frozen = path.join(directory, 'frozen');
  matrix = focusedMatrix(plan, cases);
  config = { providers: plan.providers, timeoutMs: plan.timeoutMs };
}
const json = async file => JSON.parse(await readFile(file, 'utf8'));
// Claude's tools run under a host read restriction. Codex keeps its own native
// sandbox and receives a disposable child HOME/configuration directory instead:
// nesting macOS sandbox-exec prevents Codex from creating its command sandbox.
const personalFiles = ['.codex/AGENTS.md', '.codex/AGENTS.override.md', '.claude/CLAUDE.md'];
const personalDirectories = ['.agents/skills', '.codex/skills', '.codex/memories', '.codex/memories_v2', '.claude/skills', '.claude/rules', '.claude/projects'];
const isolationProfile = '(version 1) (allow default) ' +
  personalFiles.map(p => `(deny file-read* (literal ${JSON.stringify(path.join(os.homedir(), p))}))`).join(' ') + ' ' +
  personalDirectories.map(p => `(deny file-read* (subpath ${JSON.stringify(path.join(os.homedir(), p))}))`).join(' ');
const isolated = argv => ['/usr/bin/sandbox-exec', '-p', isolationProfile, ...argv];
const inventories = async () => ({ scripts: await sourceSnapshot(path.join(root, 'scripts')), evals: await sourceSnapshot(path.join(root, 'evals')) });
async function save(file, value) {
  await writeFile(`${file}.tmp`, JSON.stringify(value, null, 2) + '\n');
  await rename(`${file}.tmp`, file);
}
function validatePlan() {
  assert.equal(matrix.length, plan.maxCalls); assert.equal(new Set(matrix.map(idOf)).size, matrix.length);
  assert(cases.every(Boolean) && new Set(cases.map(c => c.id)).size === cases.length, 'Missing or duplicate case');
  assert((plan.control ?? []).every(id => cases.some(c => c.id === id)), 'Unknown control case');
  // Paired dispatch runs one call per provider at a time.
  assert(plan.pilotCalls > 0 && plan.pilotCalls % 2 === 0 && plan.pilotCalls <= plan.maxCalls);
  for (const c of cases) {
    for (const file of [...Object.keys(c.files), ...c.mutablePaths]) {
      assert(!path.isAbsolute(file) && !file.split('/').includes('..'), 'Fixture path escapes scope');
    }
    assert(c.expected.must.length > 0);
  }
  for (const { testCase } of matrix.filter(m => m.testCase.invocation === 'implicit')) {
    assert.doesNotMatch(taskPrompt('codex', testCase), /sharpen-(assess|dedupe|clarify|challenge|refine|review|brief|cold-review)|expectedSkills|mustNot|\.agents|\.claude/);
  }
}
function estimate(record) {
  const u = record.usage, p = plan.pricing[record.provider];
  if (!u || !Number.isFinite(u.input_tokens) || !Number.isFinite(u.output_tokens)) return null;
  const cached = u.cached_input_tokens ?? u.cache_read_input_tokens ?? 0;
  const created = u.cache_write_input_tokens ?? u.cache_creation_input_tokens ?? 0;
  const uncached = record.provider === 'codex' ? u.input_tokens - cached - created : u.input_tokens;
  if (uncached < 0) return null;
  const longWrite = u.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  return (uncached * p.input + cached * p.cacheRead + created * p.cacheWrite +
    longWrite * ((p.cacheWriteLong ?? p.cacheWrite) - p.cacheWrite) + u.output_tokens * p.output) / 1e6;
}
function costs(records) {
  const attempted = records.filter(r => r.providerCalled);
  const missing = attempted.filter(r => estimate(r) === null).map(r => r.id);
  const apiEquivalentUsd = attempted.reduce((sum, r) => sum + (estimate(r) ?? 0), 0);
  // Include a conservative short-cache-write projection for never-called slots.
  let remainingProjectionUsd = 0;
  for (const provider of ['codex', 'claude']) {
    const lane = attempted.filter(r => r.provider === provider), p = plan.pricing[provider];
    const high = Math.max(0.4, ...lane.map(r => {
      const u = r.usage ?? {};
      const input = (u.input_tokens ?? 0) + (provider === 'claude' ? (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) : 0);
      return (input * p.cacheWrite + (u.output_tokens ?? 0) * p.output) / 1e6;
    }));
    remainingProjectionUsd += (matrix.filter(m => m.provider === provider).length - lane.length) * high;
  }
  return { apiEquivalentUsd, priorDiagnosticUsd: plan.priorDiagnostic.apiEquivalentUsd,
    cumulativeApiEquivalentUsd: apiEquivalentUsd + plan.priorDiagnostic.apiEquivalentUsd,
    remainingProjectionUsd, projectedTotalUsd: apiEquivalentUsd + plan.priorDiagnostic.apiEquivalentUsd + remainingProjectionUsd, missingUsage: missing,
    reportedClaudeUsd: attempted.filter(r => r.provider === 'claude').reduce((sum, r) => sum + (r.reportedCostUsd ?? 0), 0),
    managementBudgetUsd: plan.managementBudgetUsd, hardBillingCap: false };
}
async function writeSummary(metadata, records, halt) {
  const packets = blindPacket(records, cases);
  await save(path.join(directory, 'blind-review.json'), packets);
  let grades = [];
  try { grades = await json(path.join(directory, 'grades.json')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const byBlind = new Map(packets.map(p => [p.blindId, p]));
  const gradeMap = new Map();
  for (const g of grades) {
    assert(byBlind.has(g.blindId) && !gradeMap.has(g.blindId), 'Unknown or duplicate grade');
    assert.equal(g.evidenceHash, byBlind.get(g.blindId).evidenceHash, 'Grade evidence drift');
    assert(['PASS', 'FAIL', 'UNCLEAR', 'NOT_RUN'].includes(g.semantic) && g.rationale?.trim());
    for (const key of ['missingFacts', 'unsupportedClaims', 'scopeViolations']) assert(Array.isArray(g[key]) && g[key].every(s => typeof s === 'string'));
    if (g.semantic === 'PASS') assert(!g.missingFacts.length && !g.unsupportedClaims.length && !g.scopeViolations.length);
    gradeMap.set(g.blindId, g);
  }
  const indexed = validateRecords(records, matrix, metadata.inputHash);
  const rows = matrix.map(item => {
    const r = indexed.get(idOf(item)), structural = structuralStatus(r, item.testCase);
    const grade = r && gradeMap.get(blindId(r));
    return { id: idOf(item), case: item.testCase.id, provider: item.provider, arm: item.version, skill: item.testCase.skill, category: item.testCase.category,
      structural, semantic: grade?.semantic ?? 'UNCLEAR', status: combinedStatus(structural, grade?.semantic),
      reason: r?.reason ?? null, called: r?.providerCalled ?? false, modelEvidence: r?.modelEvidence ?? 'NOT_RUN' };
  });
  const count = selected => selected.reduce((out, row) => { out[row.status]++; return out; }, { PASS: 0, FAIL: 0, UNCLEAR: 0, NOT_RUN: 0 });
  const skillRows = rows.filter(row => row.arm === 'after'), controlRows = rows.filter(row => row.arm === 'control');
  const counts = count(skillRows);
  const summary = { planId: plan.id, commit: plan.commit, plannedCalls: matrix.length, attemptedCalls: records.filter(r => r.providerCalled).length,
    halt, counts, costs: costs(records), focusedPassed: counts.PASS === skillRows.length, releaseReady: false,
    ...(controlRows.length ? { controlCounts: count(controlRows), comparison: controlRows.map(control => ({ case: control.case, provider: control.provider,
      skills: skillRows.find(row => row.case === control.case && row.provider === control.provider).status, control: control.status })) } : {}),
    limitation: controlRows.length
      ? 'One observation per case/provider/arm. A skills-versus-control difference here is descriptive, not an effect size, repeatability estimate, or release readiness.'
      : 'One beta.7 observation per case/provider. No before/after claim, repeatability estimate, or full-gate release readiness.', rows };
  await save(path.join(directory, 'summary.json'), summary);
  console.log(JSON.stringify({ directory, ...summary, rows: undefined }));
}
export async function main(args = process.argv.slice(2)) {
  const usage = 'Use [--plan <file>] --dry-run, --pilot, --continue, or --summarize';
  let planFile = 'evals/focused-beta7.mjs';
  if (args[0] === '--plan') { assert(args[1] && !args[1].startsWith('--'), usage); planFile = args[1]; args = args.slice(2); }
  assert.equal(args.length, 1, usage);
  const mode = args[0]; assert(['--dry-run', '--pilot', '--continue', '--summarize'].includes(mode), usage);
  await configure(planFile);
  validatePlan();
  if (mode === '--dry-run') {
    console.log(JSON.stringify({ plan, calls: matrix.map(item => ({ id: idOf(item), provider: item.provider, arm: item.version, case: item.testCase.id })),
      plannedCalls: matrix.length, priorDiagnosticCalls: plan.priorDiagnostic.attemptedCalls,
      maximumCumulativeCalls: plan.priorDiagnostic.attemptedCalls + matrix.length, paidCalls: 0 }, null, 2));
    return;
  }
  assert.equal(process.version, 'v24.20.0');
  assert.equal(process.platform, 'darwin', 'This bounded isolation profile requires macOS');
  if (mode === '--pilot') await mkdir(directory); // Existing archives are never overwritten.
  await mkdir(path.join(directory, '.running')); // Refuse concurrent or uncertain interrupted runs.
  let metadata, records = [], halt = null;
  try {
    if (mode === '--pilot') {
      await mkdir(path.join(directory, 'records'));
      // A plan without a release tag pins its skill source by full commit.
      const source = await run(['git', 'rev-parse', '--verify', `${plan.tag ?? plan.commit}^{commit}`], { cwd: root });
      assert.equal(source.code, 0); assert.equal(source.stdout.trim(), plan.commit);
      await mkdir(path.join(frozen, 'after', 'skills'), { recursive: true });
      for (const { name } of catalog) for (const file of ['SKILL.md', 'agents/openai.yaml', 'LICENSE']) {
        const result = await run(['git', 'show', `${plan.commit}:skills/${name}/${file}`], { cwd: root });
        assert.equal(result.code, 0);
        const target = path.join(frozen, 'after', 'skills', name, file);
        await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, result.stdout);
      }
      for (const dir of ['scripts', 'evals']) await cp(path.join(root, dir), path.join(frozen, dir), { recursive: true });
      await save(path.join(frozen, 'cases.json'), cases);
      const probe = await realpath(await mkdtemp(path.join(os.tmpdir(), 'sharpen-focused-probe-')));
      let docker;
      try { await chmod(probe, 0o755); await writeFile(path.join(probe, 'probe.txt'), 'fixture'); docker = await dockerPreflight(probe); }
      finally { await rm(probe, { recursive: true }); }
      const inputs = { plan, casesHash: sha256(JSON.stringify(cases)), working: await inventories(), frozen: await sourceSnapshot(frozen),
        environment: { node: process.version, cli: await versions(['codex', 'claude']), docker,
          isolation: { revision: plan.isolationRevision, codex: 'disposable child HOME and CODEX_HOME; authentication reference only; native command sandbox',
            claude: 'host read restriction plus existing tool/settings restrictions', personalFiles, personalDirectories, profileHash: sha256(isolationProfile) } } };
      metadata = { evaluationKind: 'focused-single-version', startedAt: new Date().toISOString(), ...inputs, inputHash: sha256(JSON.stringify(inputs)) };
      await save(path.join(directory, 'run.json'), metadata);
      await save(path.join(directory, 'dispatch.json'), []);
    } else {
      metadata = await json(path.join(directory, 'run.json'));
      const { evaluationKind, startedAt, inputHash, ...inputs } = metadata;
      assert.equal(evaluationKind, 'focused-single-version'); assert.equal(inputHash, sha256(JSON.stringify(inputs)));
      assert.deepEqual(metadata.plan, plan); assert.equal(metadata.casesHash, sha256(JSON.stringify(cases)));
    }
    for (const file of await readdir(path.join(directory, 'records'))) {
      assert(file.endsWith('.json'), 'Incomplete observation requires investigation');
      records.push(await json(path.join(directory, 'records', file)));
    }
    validateRecords(records, matrix, metadata.inputHash);
    let dispatch = await json(path.join(directory, 'dispatch.json'));
    assert.equal(new Set(dispatch.map(d => d.id)).size, dispatch.length);
    assert.deepEqual(dispatch.map(d => d.id).sort(), records.filter(r => r.providerCalled).map(r => r.id).sort(), 'Incomplete dispatch; never repeat an uncertain call');
    const fatal = r => stoppingReasons.has(r.reason) || ['OUT_OF_SCOPE_WRITE', 'USAGE_UNAVAILABLE'].includes(r.reason);
    halt = records.find(fatal)?.reason ?? null;
    const assertInputs = async () => {
      assert.deepEqual(await inventories(), metadata.working, 'Working input drift');
      assert.deepEqual(await sourceSnapshot(frozen), metadata.frozen, 'Frozen input drift');
      assert.deepEqual(await versions(['codex', 'claude']), metadata.environment.cli, 'CLI version drift');
      assert.equal(metadata.environment.isolation.profileHash, sha256(isolationProfile), 'Host read restriction drift');
    };
    await assertInputs();
    if (mode === '--summarize' || halt) { await writeSummary(metadata, records, halt); return; }
    if (mode === '--continue') assert.equal(dispatch.length, plan.pilotCalls, 'Continue only after the pilot');
    const pilotBound = mode === '--pilot' ? plan.pilotCalls : plan.maxCalls;
    const dispatchProvider = createProviderDispatch(dispatch, plan.maxCalls, value => save(path.join(directory, 'dispatch.json'), value));
    for (let offset = dispatch.length; offset < pilotBound; offset += 2) {
      const budget = costs(records);
      if (budget.missingUsage.length || (records.length && budget.projectedTotalUsd > plan.managementBudgetUsd)) {
        halt = budget.missingUsage.length ? 'USAGE_UNAVAILABLE' : 'MANAGEMENT_BUDGET'; break;
      }
      const pair = matrix.slice(offset, offset + 2);
      await Promise.all(pair.map(async item => {
        const { provider, version, testCase } = item;
        const cwd = await realpath(await mkdtemp(path.join(os.tmpdir(), 'sharpen-focused-fixture-')));
        await chmod(cwd, 0o755);
        let sessionHome;
        const control = { stopped: () => halt, stop: reason => { if (stoppingReasons.has(reason) || reason === 'OUT_OF_SCOPE_WRITE') halt ??= reason; },
          start: invoke => halt ? null : { result: invoke() } };
        const observation = { providerCalled: false };
        const checks = async phase => {
          const outcomes = [];
          for (const check of testCase.checks ?? []) {
            if (phase === 'before' && check.when !== 'before-and-after') continue;
            const result = await dockerCheck(metadata.environment.docker.id, cwd, check.argv);
            outcomes.push({ purpose: check.purpose, passed: result.code === check.expectedExitCode && !result.timedOut && !result.overflow,
              exitCode: result.code, timedOut: result.timedOut, output: sanitize(result.stdout + result.stderr, cwd) });
          }
          return outcomes;
        };
        try {
          let providerEnvironment;
          if (provider === 'codex') {
            // Keep the authentication reference outside the fixture and every
            // snapshot/log. Never copy credential contents or mutate parent env.
            sessionHome = await mkdtemp(path.join(os.tmpdir(), 'sharpen-focused-session-'));
            const configuration = path.join(sessionHome, '.codex');
            await mkdir(configuration);
            await symlink(path.join(os.homedir(), '.codex', 'auth.json'), path.join(configuration, 'auth.json'));
            providerEnvironment = { ...process.env, HOME: sessionHome, CODEX_HOME: configuration };
          }
          for (const [relative, contents] of Object.entries(testCase.files)) {
            const target = path.join(cwd, relative); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, contents);
          }
          const agent = provider === 'codex' ? '.agents' : '.claude';
          let sources = {};
          if (version !== 'control') {
            await cp(path.join(frozen, 'after', 'skills'), path.join(cwd, agent, 'skills'), { recursive: true });
            sources = Object.fromEntries(await Promise.all(catalog.map(async ({ name }) => [name, await readFile(path.join(cwd, agent, 'skills', name, 'SKILL.md'), 'utf8')])));
          }
          observation.baselineChecks = await checks('before');
          assert(observation.baselineChecks.every(c => c.passed), 'Fixture baseline failed');
          const before = await sourceSnapshot(cwd);
          await assertInputs();
          const result = await dispatchProvider(item, control, () => {
            observation.providerCalled = true;
            const argv = providerCommand(provider, testCase, cwd, config);
            return run(provider === 'codex' ? argv : isolated(argv), {
              cwd, env: providerEnvironment, input: taskPrompt(provider, testCase), timeoutMs: plan.timeoutMs,
            });
          });
          if (observation.providerCalled) {
            Object.assign(observation, observeV3(provider, result, testCase, sources, plan.providers[provider].model, cwd));
            const reported = parseEvents(result.stdout).findLast(e => e.type === 'result')?.total_cost_usd;
            if (typeof reported === 'number' && Number.isFinite(reported)) observation.reportedCostUsd = reported;
            control.stop(observation.reason);
            let after, unsafe = false;
            try { after = await sourceSnapshot(cwd); } catch { unsafe = true; after = {}; }
            observation.changedPaths = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(p => before[p] !== after[p]);
            observation.forbiddenChanges = observation.changedPaths.filter(p => !testCase.mutablePaths.includes(p));
            observation.afterChecks = unsafe || observation.forbiddenChanges.length ? [] : await checks('after');
            observation.changedFiles = await readChangedFiles(cwd, observation.changedPaths, testCase.mutablePaths, unsafe);
            if (unsafe || observation.forbiddenChanges.length) { observation.status = 'FAIL'; observation.reason = 'OUT_OF_SCOPE_WRITE'; control.stop(observation.reason); }
            else if (observation.status === 'REVIEW_REQUIRED' && observation.afterChecks.some(c => !c.passed)) { observation.status = 'FAIL'; observation.reason = 'BEHAVIOR_CHECK_FAILED'; }
            else if (testCase.mutablePaths.length && !observation.changedPaths.length && observation.status === 'REVIEW_REQUIRED') { observation.status = 'FAIL'; observation.reason = 'REQUESTED_EDIT_NOT_PERFORMED'; }
            await assertInputs();
          } else { observation.status = 'NOT_RUN'; observation.reason = halt; }
        } catch (error) {
          observation.status = 'NOT_RUN'; observation.reason = error.message === 'DOCKER_ISOLATION_FAILED' ? error.message : 'HARNESS_ERROR';
          observation.detail = sanitize(error.message, cwd); control.stop(observation.reason);
        } finally {
          await rm(cwd, { recursive: true });
          if (sessionHome) await rm(sessionHome, { recursive: true });
        }
        const record = seal({ schemaVersion: 3, id: idOf(item), provider, version, repeat: 1, case: testCase.id,
          inputHash: metadata.inputHash, ...sanitizeObservation(observation, cwd) });
        await save(path.join(directory, 'records', `${record.id}.json`), record); records.push(record);
        console.log(JSON.stringify({ id: record.id, called: record.providerCalled, status: record.status, reason: record.reason, usd: estimate(record) }));
      }));
      await writeSummary(metadata, records, halt);
      if (halt) break;
    }
  } finally { await rm(path.join(directory, '.running'), { recursive: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(sanitize(error.message)); process.exitCode = 1; });
}
