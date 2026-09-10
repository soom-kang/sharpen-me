import test from 'node:test';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseline, nameMapping, readBaseline, normalizeBaseline, validateBaselineSnapshot, validateRunIdentity, runInputs } from '../scripts/eval-baseline.mjs';
import { sourceSnapshot, sha256 } from '../scripts/eval-resume.mjs';
import { cases } from '../evals/additional-cases.mjs';
import { legacyCases } from '../evals/cases.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));

test('the original tag normalizes to the 24 files at the fixed rename commit', async () => {
  const prepared = await readBaseline(root);
  assert.equal(prepared.provenance.commit, baseline);
  assert.equal(Object.keys(prepared.original).length, 24);
  for (const [file, hash] of Object.entries(prepared.provenance.normalizedHashes)) {
    assert.equal(sha256(execFileSync('git', ['show', `1bfb92fae3199b07ac2acb30915922d27a1adc97:skills/${file}`], { cwd: root })), hash);
  }
  for (const [old, next] of Object.entries(nameMapping)) {
    assert.deepEqual(prepared.original[`${old}/LICENSE`], prepared.normalized[`${next}/LICENSE`]);
  }
  const incomplete = { ...prepared.original }; delete incomplete['rm-scope/agents/openai.yaml'];
  assert.throws(() => normalizeBaseline(incomplete), /NORMALIZATION_DRIFT/);
  await assert.rejects(readBaseline(root, '0'.repeat(40)), /BASELINE_UNAVAILABLE/);
});

test('renaming preserves historical tasks, fixture bytes, checks and grading criteria', () => {
  const reverse = data => {
    let text = JSON.stringify(data);
    for (const [old, next] of Object.entries(nameMapping)) text = text.replaceAll(next, old);
    return sha256(text);
  };
  assert.equal(reverse(legacyCases), 'fd23c8cbe6ed4c3ad5223dcb880c249979bdf94605aaadada23f03f7c16b1d47');
  assert.equal(reverse(cases), 'c6d61b693c93ffdfca13937f79fefa2a402866bcbd3d86e602a17449b593d6dd');
});

test('baseline provenance detects altered hashes, rules and normalized contents', async t => {
  const frozen = await mkdtemp(path.join(os.tmpdir(), 'sharpen-baseline-'));
  t.after(() => rm(frozen, { recursive: true }));
  const prepared = await readBaseline(root);
  for (const [version, files] of [['original', prepared.original], ['before', prepared.normalized]]) {
    for (const [relative, bytes] of Object.entries(files)) {
      const target = path.join(frozen, version, 'skills', relative);
      await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, bytes);
    }
  }
  await validateBaselineSnapshot(frozen, prepared.provenance);
  for (const field of ['originalHashes', 'normalizedHashes']) {
    const forged = structuredClone(prepared.provenance);
    forged[field][Object.keys(forged[field])[0]] = 'forged';
    await assert.rejects(validateBaselineSnapshot(frozen, forged), /NORMALIZATION_DRIFT/);
  }
  await assert.rejects(validateBaselineSnapshot(frozen, { ...prepared.provenance, rulesVersion: 2 }), /NORMALIZATION_DRIFT/);
  const file = path.join(frozen, 'before/skills/sharpen-clarify/SKILL.md');
  await writeFile(file, (await readFile(file, 'utf8')) + '\nChanged procedure.\n');
  await assert.rejects(validateBaselineSnapshot(frozen, prepared.provenance), /NORMALIZATION_DRIFT/);
});

test('run identity binds normalization, settings and frozen inputs', async () => {
  const prepared = await readBaseline(root);
  const inputs = { baseline, baselineNormalization: prepared.provenance, config: { contractRevision: 3 },
    workingInputs: {}, frozenHashes: {}, environment: {}, casesHash: 'fixture' };
  const metadata = { ...inputs, inputHash: sha256(JSON.stringify(inputs)) };
  validateRunIdentity(metadata);
  assert.deepEqual(runInputs(metadata), inputs);
  for (const field of ['baselineNormalization', 'config', 'workingInputs', 'frozenHashes', 'environment', 'casesHash']) {
    const forged = { ...metadata, [field]: 'changed' };
    assert.throws(() => validateRunIdentity(forged), /FROZEN_INPUT_DRIFT/);
  }
});
