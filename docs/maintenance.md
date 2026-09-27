# Maintenance

Run the local checks before changing a skill. Address a concrete failure or need, keep each installation unit self-contained, and preserve unrelated working-tree changes.

## Local checks

1. Use **Node.js 24.20.0** for development and CI. This is also the installation minimum; keep the pinned development dependencies.
2. From the repository checkout, run:

   ```bash
   npm ci --ignore-scripts
   npm run verify
   npm run test:install
   npm run eval -- --dry-run
   git diff --check
   ```

3. Inspect failures before proceeding. `verify` checks packaging, license copies, metadata, links, syntax, regression tests, and the declared 48-case matrix. The installation suite covers whole and individual installs, copy and symlink modes, reinstall, removal, and coexistence.

Dry run lists the plan without provider calls, downloads, Docker operations, or archive writes. Local checks do not measure model behavior. Tests do not skip because Node is below 26. You can also run the `skill-creator` validator if it is available locally.

## Docker checks

1. Prepare the image before live evaluation:

   ```bash
   docker pull node:24.20.0-bookworm-slim
   npm run test:docker
   ```

2. Stop if the daemon, image, or isolation checks fail. Do not replace this boundary with an unrestricted host check.

<details>
<summary>What the Docker check verifies and isolates</summary>

The probe verifies the actual Node version, image digest, nonroot execution, permitted fixture reads, denied writes, denied child processes and workers, and unavailable external network access. An unavailable Docker daemon or image is an environment failure, never a pass or permission-free fallback.

Checks mount only the disposable fixture, read-only. They do not mount a home directory, credentials, or the Docker socket. The container uses no network, a read-only root filesystem, no capabilities, no-new-privileges, and explicit CPU, memory, and process limits. Node permissions further restrict reads and deny writes, subprocesses, and workers. Node 24 permissions alone do not isolate networking; Docker supplies that boundary. Check timeout is 30 seconds. Cleanup names only the container created for that check.

The provider CLIs run on the host with their configured sandbox and file tools. This is a different boundary from the container that executes host behavior checks.

</details>

## Live evaluation and resume

1. Agree on the budget and frozen inputs before a new comparison. [Configuration](../evals/config.json) selects Codex `gpt-6-sol / medium` and Claude Code `claude-opus-5-5 / low`: 180 seconds per call, three repetitions, at most 576 new calls. Keep the historical 290 attempts separate; the cumulative cap is 866. No automatic retry, fallback, or extra paid grader is available. The focused comparison of this edit uses pre-edit commit `548fe1e4706bef355e5ed1f50c12230fcefbf2c7` and a separate 48-call cap; it is not a v3 release gate.
2. Complete the local and Docker checks. The runner freezes the before/after skill trees, cases, code, configuration, CLI versions, and Docker identity. Do not edit these inputs during the run.
3. Start the agreed evaluation:

   ```bash
   npm run eval
   ```

4. On interruption, inspect the archive before resuming. Authentication, quota, model mismatch, isolation failure, or harness failure stops new dispatch; an in-flight peer may finish. Timeouts retain their evidence without retry.
5. To resume, first inspect the remaining plan, then run only with unchanged inputs and environment:

   ```bash
   npm run eval -- --resume eval-results/<v3-directory> --dry-run
   npm run eval -- --resume eval-results/<v3-directory>
   ```

Resume selects **never-called slots**. Attempted or interrupted calls retain their evidence. An incomplete dispatch journal blocks automatic resume. Repeating a call or changing inputs needs separate agreement and a new evaluation, not a recheck flag.

<details>
<summary>Frozen baseline, model identity, and archive compatibility</summary>

The current policy is `contractRevision: 4` with `modelPolicy: primary_response_only`. Structured primary assistant model fields establish returned identity; aggregate model usage remains separate. Extra models in usage do not establish fallback. Without a returned identity, record `explicit_cli_argument_only`; prose is not model evidence.

Extract the baseline from `87b2e064ad0d5ba7b38a1f7c194929fda980cf0a` without changing the checkout. Preserve original bytes in `frozen/original/skills/` and normalize names in `frozen/before/skills/`. Original and normalized hashes, the name mapping, and rules version bind to the input hash. Both versions install the new names; see [comparison limits](evaluation.md#current-matrix-and-method).

Changing the current model configuration does not change model settings or outcomes in dated evaluation records. Archives frozen with earlier settings are not resumable under the new configuration.

Each provider runs one call at a time, at most two in flight overall. Version order is balanced, and the runner records dispatch order before spawning.

Older contracts remain unchanged and are rejected before execution or rewriting. The retained v2 helpers are for historical inspection: `scripts/summarize-eval.mjs` is v2-only, and the main CLI neither runs nor resumes v2. Do not convert or combine archives.

</details>

## Blind review and summary

1. Read `blind-review.json` before version-labeled records. Opaque IDs hide provider, version, and repetition labels; response content may still reveal them. Review the expected facts, response, changed files, and execution evidence.
2. Write a grade for each observation, bound to its `blindId` and `evidenceHash`. Use `PASS`, `FAIL`, `UNCLEAR`, or `NOT_RUN`; include a rationale and any missing facts, unsupported claims, or scope violations.
3. Summarize the reviewed evidence:

   ```bash
   npm run eval:summarize -- eval-results/<v3-directory> /path/to/blind-grades.json
   ```

4. Inspect both `evaluationPassed` and `releaseReady`. The first covers the selected providers; the second requires both Codex and Claude. A selected-provider pass can produce exit code 0 while a deferred provider keeps release readiness false.

Semantic grades cannot override structural failures. Missing evidence remains `UNCLEAR` or `NOT_RUN`. Keep raw provider streams and private environment details out of public reports.

<details>
<summary>Grade fields and evidence checks</summary>

Each grade has `blindId`, `evidenceHash`, `semantic`, `rationale`, `missingFacts`, `unsupportedClaims`, and `scopeViolations`. The last three are string arrays; a PASS cannot contain unresolved defects.

Command evidence pairs each command with its completion status and result. Redact before applying separate 8 KiB limits to commands and results. Missing or truncated evidence cannot establish a PASS, but does not by itself prove a skill failure.

The summary validates source and observation hashes, identities, required checks, output contracts, scope evidence, and grade binding. See [Evaluation](evaluation.md#review-and-release-criteria) for the full criteria.

</details>

## Release and recovery

[`v0.9.0-beta.1`](https://github.com/soom-kang/sharpen-me/releases/tag/v0.9.0-beta.1) is published as a Pre-release. The repository is `soom-kang/sharpen-me`; the package remains private to npm. The local historical `v0.8.10-beta.1` tag contains the old names and stays unchanged.

For a future release:

1. Agree on a new version and review the diff, validation results, and release notes. Preserve the beta notice and unresolved [evaluation results](evaluation.md); compare the shipping skill bytes with the evaluated after snapshot.
2. Obtain approval for commit, main push, tag, and publication. Confirm Verify CI on the exact commit before creating the agreed annotated tag.
3. Push only that tag and verify installation from its URL in a disposable project. The existing release can be checked with:

   ```bash
   npm run test:install -- --source https://github.com/soom-kang/sharpen-me/tree/v0.9.0-beta.1
   ```

4. Publish after the tag installation check passes, using `--verify-tag --prerelease --latest=false`. Disclose failed evaluation gates; beta publication does not make `releaseReady` true.
5. If the branch changes or the chosen tag exists, inspect the state before proceeding. If installation fails, keep the tag in place and hold publication. Do not overwrite the tag to recover.

For existing installations, follow the [replacement steps](rename.md#replace-an-existing-project-installation). Global installations and user model settings are outside this procedure.
