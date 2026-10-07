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

function isolatedEnv(home) {
  return {
    PATH: process.env.PATH, ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
    HOME: home, USERPROFILE: home, APPDATA: path.join(home, 'AppData/Roaming'),
    LOCALAPPDATA: path.join(home, 'AppData/Local'),
    XDG_CONFIG_HOME: path.join(home, '.config'), XDG_STATE_HOME: path.join(home, '.local/state'),
    XDG_CACHE_HOME: path.join(home, '.cache'), TMPDIR: tmp, TMP: tmp, TEMP: tmp,
    CI: 'true', DISABLE_TELEMETRY: '1', NODE_DISABLE_COMPILE_CACHE: '1',
    GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: os.devNull, GIT_TERMINAL_PROMPT: '0',
  };
}

async function invoke(cwd, args, env = isolatedEnv(path.join(tmp, 'project-home'))) {
  const result = await run([process.execPath, cli, ...args], {
    cwd, env, timeoutMs: 60_000,
  });
  if (result.code !== 0 || result.timedOut) throw new Error(`skills ${args[0]} failed: ${result.stderr || result.stdout}`);
  return result.stdout;
}

async function verifyInstalled(cwd, selected, mode, claudeDirectory = '.claude/skills') {
  const projectRoot = await realpath(cwd);
  for (const agentDirectory of ['.agents/skills', claudeDirectory]) {
    const installed = (await readdir(path.resolve(cwd, agentDirectory))).filter(n => n !== 'keep-me').sort();
    if (JSON.stringify(installed) !== JSON.stringify([...selected].sort())) throw new Error(`Wrong installation set in ${agentDirectory}`);
    for (const name of selected) {
      const from = path.join(root, 'skills', name);
      const into = path.resolve(cwd, agentDirectory, name);
      const sourceFiles = await filesBelow(from);
      const installedStat = await lstat(into);
      const expectSymlink = mode === 'symlink' && agentDirectory === claudeDirectory;
      if (expectSymlink ? !installedStat.isSymbolicLink() : !installedStat.isDirectory() || installedStat.isSymbolicLink()) {
        throw new Error(`Expected ${expectSymlink ? 'symlink' : 'directory'} for ${mode} installation: ${agentDirectory}/${name}`);
      }
      const resolved = await realpath(into);
      const expectedPath = path.resolve(projectRoot, mode === 'symlink' ? '.agents/skills' : agentDirectory, name);
      if (resolved !== expectedPath) {
        throw new Error(`Installed skill resolves outside its expected path: ${agentDirectory}/${name}`);
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
  await mkdir(path.join(tmp, 'project-home'));
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
  // One representative skill covers global paths; the project suite covers all eight.
  for (const customClaude of [false, true]) {
    const label = customClaude ? 'custom-claude' : 'default';
    const home = path.join(tmp, `global-${label}-home`);
    const cwd = path.join(tmp, `global-${label}-project`);
    await mkdir(home);
    await mkdir(cwd);
    const env = isolatedEnv(home);
    if (customClaude) env.CLAUDE_CONFIG_DIR = path.join(tmp, 'custom-claude-config');
    const directories = [path.join(home, '.agents/skills'),
      path.join(env.CLAUDE_CONFIG_DIR ?? path.join(home, '.claude'), 'skills')];
    const name = catalog[0].name;
    const add = ['add', source, '--skill', name, '--agent', 'codex', 'claude-code', '--yes'];
    await invoke(cwd, [...add, '--copy'], env);
    await verifyInstalled(cwd, [name], 'copy');
    const sentinel = '---\nname: keep-me\ndescription: Unrelated global fixture\n---\nPreserve this skill.\n';
    for (const dir of directories) {
      await mkdir(path.join(dir, 'keep-me'), { recursive: true });
      await writeFile(path.join(dir, 'keep-me/SKILL.md'), sentinel);
    }
    await invoke(cwd, [...add, '--global'], env);
    if (!customClaude) await invoke(cwd, [...add, '--global'], env);
    await verifyInstalled(home, [name], 'symlink', directories[1]);
    // skills 1.5.25 can also clean project paths for agents without global support.
    // Match the documented workaround: remove from an empty disposable directory.
    const removalCwd = path.join(tmp, `global-${label}-removal`);
    await mkdir(removalCwd);
    await invoke(removalCwd, ['remove', name, '--global', '--yes'], env);
    for (const dir of directories) {
      try { await lstat(path.join(dir, name)); throw new Error(`Global removal left ${dir}/${name}`); }
      catch (e) { if (e.code !== 'ENOENT') throw e; }
      if (await readFile(path.join(dir, 'keep-me/SKILL.md'), 'utf8') !== sentinel) throw new Error('Unrelated global skill changed');
    }
    await verifyInstalled(cwd, [name], 'copy');
    console.log(`PASS: isolated global install and removal (${label}), matching content, links, sentinels and project copy`);
  }
  console.log('PASS: project installation suite and representative isolated global paths');
} finally {
  await rm(tmp, { recursive: true });
}
