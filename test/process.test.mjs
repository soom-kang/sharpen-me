import test from 'node:test';
import assert from 'node:assert/strict';
import { run } from '../scripts/process.mjs';

test('literal command arguments are never interpreted as shell syntax', async () => {
  const result = await run([process.execPath, '-e', 'process.stdout.write(process.argv[1])', '$(not-a-command); `literal`']);
  assert.equal(result.code, 0);
  assert.equal(result.stdout, '$(not-a-command); `literal`');
});

test('timeout terminates a stuck process without retrying', async () => {
  const result = await run([process.execPath, '-e', 'setInterval(() => {}, 1000)'], { timeoutMs: 100 });
  assert.equal(result.timedOut, true);
  assert.notEqual(result.code, 0);
});

test('preserves UTF-8 split across chunks', async () => {
  const result = await run([process.execPath, '-e', "const b=Buffer.from('한'); process.stdout.write(b.subarray(0,1)); setTimeout(()=>process.stdout.write(b.subarray(1)),40)"]);
  assert.equal(result.stdout, '한');
});

test('caps retained output and terminates overflow even when TERM is ignored', async () => {
  const result = await run([process.execPath, '-e', "process.on('SIGTERM',()=>{}); setInterval(()=>process.stdout.write('x'.repeat(1024)),2)"], { maxBytes: 16, timeoutMs: 10_000 });
  assert.equal(result.overflow, true);
  assert.equal(Buffer.byteLength(result.stdout), 16);
  assert.ok(result.durationMs < 5000);
});
