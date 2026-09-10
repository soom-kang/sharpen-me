import { randomUUID } from 'node:crypto';
import { run } from './process.mjs';

export const imageTag = 'node:24.20.0-bookworm-slim';
export const checkTimeoutMs = 30_000;
export function containerCommand(image, fixture, argv, name) {
  if (!/^sha256:[a-f0-9]{64}$/.test(image)) throw new Error('Docker checks require a frozen image ID');
  if (argv[0] !== 'node') throw new Error('Only Node fixture checks are permitted');
  if (fixture.includes(',')) throw new Error('Unsupported Docker mount path');
  return ['docker', 'run', '--name', name, '--rm', '--network', 'none', '--read-only',
    '--user', '65534:65534', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
    '--memory', '256m', '--memory-swap', '256m', '--cpus', '1', '--pids-limit', '32',
    '--mount', `type=bind,src=${fixture},dst=/fixture,readonly`, '--workdir', '/fixture',
    '--env', 'NODE_OPTIONS=', '--env', 'NODE_PATH=', image, 'node', '--permission',
    '--allow-fs-read=/fixture', ...(argv.includes('--test') ? ['--test-isolation=none'] : []), ...argv.slice(1)];
}
export async function dockerCheck(image, fixture, argv, execute = run) {
  const name = `rm-eval-${randomUUID()}`;
  let result;
  try {
    result = await execute(containerCommand(image, fixture, argv, name), { timeoutMs: checkTimeoutMs, maxBytes: 100_000 });
    if (result.code === 125 || result.code === 126 || result.code === 127) throw new Error('DOCKER_ISOLATION_FAILED');
    return result;
  } finally {
    // A timed-out Docker client does not necessarily stop its container.
    // Cleanup addresses only the unpredictable name created by this check.
    if (!result || result.timedOut || result.overflow) {
      await execute(['docker', 'rm', '-f', name], { timeoutMs: 10_000, maxBytes: 10_000 });
    }
  }
}
export async function dockerPreflight(fixture, execute = run) {
  const inspect = await execute(['docker', 'image', 'inspect', imageTag, '--format', '{{json .}}'], { timeoutMs: 10_000 });
  if (inspect.code !== 0) throw new Error('DOCKER_IMAGE_UNAVAILABLE');
  const data = JSON.parse(inspect.stdout);
  if (!data.RepoDigests?.some(d => /(?:^|\/)node@sha256:/.test(d))) throw new Error('DOCKER_IMAGE_DIGEST_MISSING');
  const probe = `
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { Worker } from 'node:worker_threads';
import net from 'node:net';
assert.equal(process.version, 'v24.20.0');
assert.equal(process.getuid(), 65534);
assert.equal(fs.readFileSync('/fixture/probe.txt', 'utf8'), 'fixture');
assert.throws(() => fs.writeFileSync('/fixture/write.txt', 'blocked'), /Access|permission|read-only/i);
assert.throws(() => fs.writeFileSync('/tmp/write.txt', 'blocked'), /Access|permission|read-only/i);
assert.throws(() => spawn('node', ['-v']), /Access|permission/i);
assert.throws(() => new Worker('1', { eval: true }), /Access|permission/i);
await new Promise((resolve, reject) => {
 const socket = net.connect({host: '1.1.1.1', port: 443});
 socket.once('connect', () => { socket.destroy(); reject(new Error('Network was reachable')); });
 socket.once('error', resolve);
 socket.setTimeout(1500, () => { socket.destroy(); resolve(); });
});
console.log('ISOLATION_OK v24.20.0');`;
  const result = await dockerCheck(data.Id, fixture, ['node', '--input-type=module', '-e', probe], execute);
  if (result.code !== 0 || result.timedOut || result.overflow || !result.stdout.includes('ISOLATION_OK v24.20.0')) {
    throw new Error('DOCKER_ISOLATION_FAILED');
  }
  return { image: imageTag, id: data.Id, digests: [...data.RepoDigests].sort(), node: '24.20.0', isolation: 'PASS' };
}
