import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, lstat, realpath } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readBaseline, nameMapping } from './eval-baseline.mjs';
import { catalog } from './catalog.mjs';
import { filesBelow, root } from './verify.mjs';
import { run } from './process.mjs';

const cli = path.join(root, 'node_modules/skills/bin/cli.mjs');
const sourceIndex = process.argv.indexOf('--source');
const source = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : root;
if (!source) throw new Error('--source requires a local directory or release URL');
const hash = data => createHash('sha256').update(data).digest('hex');

async function invoke(cwd, args) {
  const result = await run([process.execPath, cli, ...args], {
    cwd, env: { ...process.env, CI: 'true', DISABLE_TELEMETRY: '1' }, timeoutMs: 60_000,
  });
  if (result.code !== 0 || result.timedOut) throw new Error(`skills ${args[0]} failed: ${result.stderr || result.stdout}`);
  return result.stdout;
}

async function verifyInstalled(cwd, selected, mode) {
  const projectRoot = await realpath(cwd);
  for (const agentDirectory of ['.agents/skills', '.claude/skills']) {
    const installed = (await readdir(path.join(cwd, agentDirectory))).filter(n => n !== 'keep-me').sort();
    if (JSON.stringify(installed) !== JSON.stringify([...selected].sort())) throw new Error(`Wrong installation set in ${agentDirectory}`);
    for (const name of selected) {
      const from = path.join(root, 'skills', name);
      const into = path.join(cwd, agentDirectory, name);
      const sourceFiles = await filesBelow(from);
      const installedStat = await lstat(into);
      const expectSymlink = mode === 'symlink' && agentDirectory === '.claude/skills';
      if (expectSymlink ? !installedStat.isSymbolicLink() : !installedStat.isDirectory() || installedStat.isSymbolicLink()) {
        throw new Error(`Expected ${expectSymlink ? 'symlink' : 'directory'} for ${mode} installation: ${agentDirectory}/${name}`);
      }
      const resolved = await realpath(into);
      const expectedPath = path.join(projectRoot, mode === 'symlink' ? '.agents/skills' : agentDirectory, name);
      if (resolved !== expectedPath) {
        throw new Error(`Installed skill resolves outside its expected project path: ${agentDirectory}/${name}`);
      }
      const installedFiles = (await filesBelow(resolved)).map(file => path.relative(resolved, file)).sort();
      if (JSON.stringify(installedFiles) !== JSON.stringify(sourceFiles.map(file => path.relative(from, file)).sort())) {
        throw new Error(`Installed file inventory differs: ${name}`);
      }
      for (const file of sourceFiles) {
        const relative = path.relative(from, file);
        if (hash(await readFile(file)) !== hash(await readFile(path.join(into, relative)))) {
          throw new Error(`Installed content differs: ${name}/${relative}`);
        }
      }
    }
  }
}

const tmp = await mkdtemp(path.join(os.tmpdir(), 'sharpen-me-install-'));
try {
  const all = catalog.map(s => s.name);
  const groups = [all, ...catalog.map(s => [s.name]), all, [catalog[0].name]];
  for (let i = 0; i < groups.length; i++) {
    const cwd = path.join(tmp, String(i));
    await mkdir(cwd);
    const sentinel = '---\nname: keep-me\ndescription: Unrelated installation fixture\n---\nKeep this file unchanged.\n';
    for (const dir of ['.agents/skills', '.claude/skills']) {
      await mkdir(path.join(cwd, dir, 'keep-me'), { recursive: true });
      await writeFile(path.join(cwd, dir, 'keep-me/SKILL.md'), sentinel);
    }
    const copyMode = i < 9;
    const mode = copyMode ? 'copy' : 'symlink';
    const selection = groups[i].length === all.length ? ['*'] : groups[i];
    const args = ['add', source, '--skill', ...selection, '--agent', 'codex', 'claude-code', ...(copyMode ? ['--copy'] : []), '--yes'];
    await invoke(cwd, args);
    await verifyInstalled(cwd, groups[i], mode);
    if (i === 0 || i === 9) {
      await invoke(cwd, args);
      await verifyInstalled(cwd, groups[i], mode);
      // Universal agents share .agents/skills. Target names across project
      // bridges so the canonical copy is not retained for a detected alias.
      await invoke(cwd, ['remove', ...groups[i], '--yes']);
      for (const name of groups[i]) {
        for (const dir of ['.agents/skills', '.claude/skills']) {
          try { await lstat(path.join(cwd, dir, name)); throw new Error(`Removal left ${dir}/${name}`); }
          catch (e) { if (e.code !== 'ENOENT') throw e; }
        }
      }
    }
    for (const dir of ['.agents/skills', '.claude/skills']) {
      if (await readFile(path.join(cwd, dir, 'keep-me/SKILL.md'), 'utf8') !== sentinel) throw new Error('Unrelated skill changed');
    }
    console.log(`PASS: ${groups[i].join(', ')} installed for Codex and Claude with matching content and project paths (${mode})`);
  }
  // Exercise the documented migration only in disposable project installations.
  const prepared = await readBaseline(root);
  const oldSource = path.join(tmp, 'old-source');
  for (const [relative, bytes] of Object.entries(prepared.original)) {
    const target = path.join(oldSource, 'skills', relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
  for (const mode of ['copy', 'symlink']) {
    const cwd = path.join(tmp, `migration-${mode}`);
    await mkdir(cwd);
    const add = ['--skill', '*', '--agent', 'codex', 'claude-code', ...(mode === 'copy' ? ['--copy'] : []), '--yes'];
    await invoke(cwd, ['add', oldSource, ...add]);
    for (const dir of ['.agents/skills', '.claude/skills']) {
      await mkdir(path.join(cwd, dir, 'keep-me'), { recursive: true });
      await writeFile(path.join(cwd, dir, 'keep-me/SKILL.md'), 'Unrelated skill');
    }
    await invoke(cwd, ['remove', ...Object.keys(nameMapping), '--yes']);
    await invoke(cwd, ['add', source, ...add]);
    await verifyInstalled(cwd, catalog.map(s => s.name), mode);
    for (const dir of ['.agents/skills', '.claude/skills']) {
      if (await readFile(path.join(cwd, dir, 'keep-me/SKILL.md'), 'utf8') !== 'Unrelated skill') throw new Error('Migration changed unrelated skill');
    }
    console.log(`PASS: old-name removal and new-name installation (${mode})`);
  }
  console.log('PASS: complete set, standalone installs, reinstall, targeted removal, and unrelated skill preservation');
} finally {
  await rm(tmp, { recursive: true });
}
