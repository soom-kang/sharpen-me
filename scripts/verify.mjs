import { readFile, readdir, lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';
import { catalog } from './catalog.mjs';
import { run } from './process.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function parseYaml(text) {
  const document = parseDocument(text, { uniqueKeys: true });
  if (document.errors.length) throw new Error(document.errors.map(e => e.message).join('; '));
  return document.toJS();
}

export function frontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!match) throw new Error('Missing YAML frontmatter');
  const metadata = parseYaml(match[1]);
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error('Frontmatter must be a mapping');
  return { metadata, body: text.slice(match[0].length) };
}

export async function validateSkill(directory, expectedName) {
  const directoryStat = await lstat(directory);
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) throw new Error('Skill source must be a real directory');
  const { metadata, body } = frontmatter(await readFile(path.join(directory, 'SKILL.md'), 'utf8'));
  if (metadata.name !== expectedName || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.name) || metadata.name.length > 64) {
    throw new Error('Skill directory and name must match');
  }
  if (typeof metadata.description !== 'string' || !metadata.description.trim() || metadata.description.length > 1024) {
    throw new Error('Invalid discovery description');
  }
  if (metadata.license !== 'MIT') throw new Error('Missing MIT metadata');
  if (metadata['disable-model-invocation'] === true) throw new Error('Automatic invocation must remain enabled');
  if ('allowed-tools' in metadata || 'context' in metadata || 'model' in metadata) {
    throw new Error('Portable skills must not grant permissions or require a provider execution mode');
  }
  if (!body.trim() || /\[TODO:[^\]]*\]/.test(body)) throw new Error('Unfinished skill');
  const ui = parseYaml(await readFile(path.join(directory, 'agents/openai.yaml'), 'utf8'));
  if (ui.policy?.allow_implicit_invocation !== true) throw new Error('Codex invocation policy mismatch');
  if (!ui.interface?.default_prompt?.includes(`$${expectedName}`)) throw new Error('Default prompt must invoke this skill');
  const license = await readFile(path.join(directory, 'LICENSE'), 'utf8');
  if (license !== await readFile(path.join(root, 'LICENSE'), 'utf8')) {
    throw new Error('Standalone installation would lose copyright notices');
  }
  await validateLinks(directory, directory);
}

export async function filesBelow(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Source symlink is not portable: ${full}`);
    if (entry.isDirectory()) files.push(...await filesBelow(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

export async function validateLinks(directory, boundary) {
  await checkLinks(await filesBelow(directory), boundary);
}

export async function checkLinks(files, boundary) {
  const base = await realpath(boundary);
  for (const file of files.filter(f => f.endsWith('.md'))) {
    const text = (await readFile(file, 'utf8')).replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '');
    for (const match of text.matchAll(/\]\((?:<([^>]+)>|([^\s)]+))(?:\s+"[^"]*")?\)/g)) {
      const target = match[1] ?? match[2];
      if (/^(?:https?:|mailto:|#)/.test(target)) continue;
      const relative = decodeURIComponent(target.split('#')[0]);
      if (!relative) continue;
      const absolute = path.resolve(path.dirname(file), relative);
      const resolved = await realpath(absolute).catch(() => {
        throw new Error(`Reference target is missing: ${relative} (from ${path.relative(root, file)})`);
      });
      if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) throw new Error(`Reference escapes install unit: ${file}`);
      if (!(await lstat(resolved)).isFile()) throw new Error(`Reference is not a file: ${relative}`);
    }
  }
}

export async function verify() {
  const skillRoot = path.join(root, 'skills');
  const names = (await readdir(skillRoot)).sort();
  if (JSON.stringify(names) !== JSON.stringify(catalog.map(s => s.name).sort())) throw new Error('Expected exactly eight skills');
  for (const skill of catalog) await validateSkill(path.join(skillRoot, skill.name), skill.name);
  for (const dir of ['scripts', 'test', 'evals']) {
    for (const file of (await filesBelow(path.join(root, dir))).filter(f => f.endsWith('.mjs'))) {
      const result = await run([process.execPath, '--check', file]);
      if (result.code !== 0) throw new Error(`Syntax check failed: ${path.relative(root, file)}`);
    }
  }
  await checkLinks([path.join(root, 'README.md'),
    ...await filesBelow(path.join(root, 'docs')),
    ...await filesBelow(path.join(root, 'evals'))], root);
  const { cases } = await import('../evals/additional-cases.mjs');
  const config = JSON.parse(await readFile(path.join(root, 'evals/config.json'), 'utf8'));
  const { matrixFor } = await import('./eval-v3-contract.mjs');
  matrixFor(cases, config);
  const expected = { behavior: 16, regression: 8, 'default-output': 8, selection: 16 };
  for (const [category, count] of Object.entries(expected)) {
    if (cases.filter(c => c.category === category).length !== count) throw new Error(`Invalid category: ${category}`);
  }
  for (const { name } of catalog) {
    const selected = cases.filter(c => c.skill === name);
    if (selected.length !== 6 || selected.filter(c => c.invocation === 'implicit').length !== 2) throw new Error(`Invalid case coverage: ${name}`);
  }
  console.log('PASS: eight portable skills, license copies, references, metadata, syntax, and declared v3 matrix');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verify().catch(error => { console.error(error.message); process.exitCode = 1; });
}
