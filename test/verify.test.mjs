import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, cp, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { frontmatter, parseYaml, validateLinks, validateSkill, root } from '../scripts/verify.mjs';

test('rejects duplicate YAML keys instead of silently accepting conflicting policy', () => {
  assert.throws(() => parseYaml('allow: true\nallow: false\n'));
});
test('rejects malformed frontmatter and preserves typed metadata', () => {
  assert.throws(() => frontmatter('not yaml'));
  assert.deepEqual(frontmatter('---\nname: example\n---\nBody').metadata, { name: 'example' });
});
test('standalone references cannot escape the selected skill', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'refactor-me-links-'));
  try {
    const skill = path.join(tmp, 'skill');
    await mkdir(skill);
    await writeFile(path.join(tmp, 'shared.md'), 'outside');
    await writeFile(path.join(skill, 'SKILL.md'), '[reference](../shared.md)');
    await assert.rejects(validateLinks(skill, skill), /escapes install unit/);
    await writeFile(path.join(skill, 'local.md'), 'inside');
    await writeFile(path.join(skill, 'SKILL.md'), '[reference](local.md)');
    await validateLinks(skill, skill);
  } finally { await rm(tmp, { recursive: true }); }
});

test('a selected skill must contain the full license and cannot be an external symlink', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'refactor-me-license-'));
  try {
    const directory = path.join(tmp, 'rm-scope');
    await cp(path.join(root, 'skills/rm-scope'), directory, { recursive: true });
    await writeFile(path.join(directory, 'LICENSE'), 'MIT License\nIncomplete notice fixture.\n');
    await assert.rejects(validateSkill(directory, 'rm-scope'), /copyright notices/);
    await symlink(directory, path.join(tmp, 'linked'));
    await assert.rejects(validateSkill(path.join(tmp, 'linked'), 'rm-scope'), /real directory/);
  } finally { await rm(tmp, { recursive: true }); }
});
