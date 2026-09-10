import { spawn } from 'node:child_process';

// Shell-free execution. A timeout is an observation, never a reason to retry.
export function run(argv, { cwd, input, env, timeoutMs = 180_000, maxBytes = 2_000_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(argv[0], argv.slice(1), {
      cwd, env: env ?? process.env, stdio: ['pipe', 'pipe', 'pipe'], detached: true,
    });
    const captured = { stdout: [], stderr: [] };
    let capturedBytes = 0, timedOut = false, overflow = false;
    const started = Date.now();
    let killTimer;
    const stop = () => {
      if (killTimer) return;
      try { process.kill(-child.pid, 'SIGTERM'); } catch (e) {
        if (e.code !== 'ESRCH') child.kill('SIGTERM');
      }
      killTimer = setTimeout(() => {
        try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
      }, 2000);
    };
    const timer = setTimeout(() => {
      timedOut = true;
      stop();
    }, timeoutMs);
    const collect = key => chunk => {
      const available = Math.max(0, maxBytes - capturedBytes);
      const part = chunk.subarray(0, available);
      if (part.length) { captured[key].push(part); capturedBytes += part.length; }
      if (chunk.length > available) {
        overflow = true;
        stop();
      }
    };
    child.stdout.on('data', collect('stdout'));
    child.stderr.on('data', collect('stderr'));
    child.on('error', e => { clearTimeout(timer); clearTimeout(killTimer); reject(e); });
    child.on('close', (code, signal) => {
      clearTimeout(timer); clearTimeout(killTimer);
      resolve({ code, signal, stdout: Buffer.concat(captured.stdout).toString('utf8'),
        stderr: Buffer.concat(captured.stderr).toString('utf8'), timedOut, overflow, durationMs: Date.now() - started });
    });
    child.stdin.on('error', () => {});
    child.stdin.end(input ?? '');
  });
}
