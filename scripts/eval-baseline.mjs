import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { sha256, sourceSnapshot } from './eval-resume.mjs';

export const baseline = '87b2e064ad0d5ba7b38a1f7c194929fda980cf0a';
export const nameMapping = {
  'rm-scope': 'sharpen-clarify', 'rm-review': 'sharpen-review',
  'rm-challenge': 'sharpen-challenge', 'rm-assess': 'sharpen-assess',
  'rm-refine': 'sharpen-refine', 'rm-review-fresh': 'sharpen-cold-review',
  'rm-brief': 'sharpen-brief', 'rm-dedup': 'sharpen-dedupe',
};
const git = promisify(execFile);
const hashes = files => Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).map(([file, bytes]) => [file, sha256(bytes)]));
const same = (a, b) => { if (!isDeepStrictEqual(a, b)) throw new Error('BASELINE_NORMALIZATION_DRIFT'); };

// Only identity text changes. Instructions, discovery descriptions and licenses retain their bytes.
export function normalizeBaseline(original) {
  const normalized = {};
  const expected = Object.keys(nameMapping).flatMap(name => ['SKILL.md', 'agents/openai.yaml', 'LICENSE'].map(file => `${name}/${file}`)).sort();
  same(Object.keys(original).sort(), expected);
  for (const [relative, bytes] of Object.entries(original)) {
    const [oldName, ...parts] = relative.split('/');
    const name = nameMapping[oldName], file = parts.join('/');
    let text = bytes.toString('utf8');
    if (!Buffer.from(text).equals(Buffer.from(bytes))) throw new Error('BASELINE_ENCODING_UNSUPPORTED');
    for (const [old, next] of Object.entries(nameMapping).sort(([a], [b]) => b.length - a.length)) text = text.replaceAll(old, next);
    const display = name.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
    if (file === 'SKILL.md') text = text.replace(/^# .+$/m, `# ${display}`);
    if (file === 'agents/openai.yaml') text = text.replace(/display_name: "[^"]+"/, `display_name: "${display}"`);
    normalized[`${name}/${file}`] = Buffer.from(text);
  }
  return normalized;
}

export async function readBaseline(root, revision = baseline) {
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('BASELINE_UNAVAILABLE');
  let tree;
  try { tree = (await git('git', ['ls-tree', '-rz', revision, '--', 'skills'], { cwd: root, encoding: 'buffer' })).stdout.toString(); }
  catch { throw new Error('BASELINE_UNAVAILABLE'); }
  const original = {};
  for (const entry of tree.split('\0').filter(Boolean)) {
    const match = /^100644 blob ([a-f0-9]{40})\tskills\/(.+)$/.exec(entry);
    if (!match) throw new Error('BASELINE_FILE_UNSUPPORTED');
    original[match[2]] = (await git('git', ['cat-file', 'blob', match[1]], { cwd: root, encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 })).stdout;
  }
  const normalized = normalizeBaseline(original);
  return { original, normalized, provenance: { commit: revision, rulesVersion: 1, nameMapping,
    originalHashes: hashes(original), normalizedHashes: hashes(normalized) } };
}

export async function validateBaselineSnapshot(frozen, provenance) {
  if (!provenance || provenance.commit !== baseline || provenance.rulesVersion !== 1) throw new Error('BASELINE_NORMALIZATION_DRIFT');
  same(provenance.nameMapping, nameMapping);
  const originalRoot = path.join(frozen, 'original', 'skills');
  const originalHashes = await sourceSnapshot(originalRoot);
  same(originalHashes, provenance.originalHashes);
  const original = {};
  for (const relative of Object.keys(originalHashes)) original[relative] = await readFile(path.join(originalRoot, relative));
  const normalizedHashes = hashes(normalizeBaseline(original));
  same(normalizedHashes, provenance.normalizedHashes);
  same(await sourceSnapshot(path.join(frozen, 'before', 'skills')), normalizedHashes);
}

export function runInputs(metadata) {
  const { baseline, baselineNormalization, config, workingInputs, frozenHashes, environment, casesHash } = metadata;
  return { baseline, baselineNormalization, config, workingInputs, frozenHashes, environment, casesHash };
}
export function validateRunIdentity(metadata) {
  if (metadata.baseline !== baseline || metadata.baselineNormalization?.commit !== baseline ||
      metadata.inputHash !== sha256(JSON.stringify(runInputs(metadata)))) throw new Error('FROZEN_INPUT_DRIFT');
}
