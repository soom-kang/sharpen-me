import { mkdtemp, writeFile, chmod, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { dockerPreflight } from './eval-docker.mjs';
const directory = await mkdtemp(path.join(os.tmpdir(), 'sharpen-docker-test-'));
try {
  await chmod(directory,0o755);
  await writeFile(path.join(directory,'probe.txt'),'fixture');
  console.log(JSON.stringify(await dockerPreflight(directory),null,2));
} finally { await rm(directory,{recursive:true}); }
