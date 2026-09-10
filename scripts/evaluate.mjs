import { main } from './eval-v3.mjs';
main().catch(error => {
  console.error(error.message);
  console.log(JSON.stringify({ schemaVersion: 3, releaseReady: false, releaseBlockers: [error.code ?? 'EVALUATION_FAILED'] }));
  process.exitCode = 1;
});
