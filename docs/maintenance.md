# Maintenance

Change an existing Skill for a concrete failure or need. Keep each installation unit self-contained and preserve unrelated working-tree changes.

## Local checks

Use Node **24.20.0** for development and CI. The installation minimum is also 24.20.0. The existing development dependencies remain pinned; no production dependency is added.

```bash
npm ci --ignore-scripts
npm run verify
npm run test:install
npm run eval -- --dry-run
git diff --check
```

`verify` checks packaging, license copies, metadata, references, syntax, and local regression tests. It validates 48 frozen cases and the selected-provider matrix; the current Codex phase has 288 calls. No test is skipped because Node is below 26. The installation suite covers whole-package and individual installation in disposable projects, copy and symlink modes, reinstall, removal, and coexistence.

Dry run performs no provider invocation, download, Docker operation, or archive write. It does not establish model behavior. The `skill-creator` validator can additionally check each Skill directory when available locally.

## Docker checks

Prepare the official image before live evaluation:

```bash
docker pull node:24.20.0-bookworm-slim
npm run test:docker
```

The probe verifies the actual Node version, image digest, nonroot execution, permitted fixture reads, denied writes, denied child processes and workers, and unavailable external network access. An unavailable Docker daemon or image is an environment failure, never a pass or permission-free fallback.

Checks mount only the disposable fixture, read-only. They do not mount a home directory, credentials, or the Docker socket. The container uses no network, a read-only root filesystem, no capabilities, no-new-privileges, and explicit CPU, memory, and process limits. Node permissions further restrict reads and deny writes, subprocesses, and workers. Node 24 permissions alone do not isolate networking; Docker supplies that boundary. Check timeout is 30 seconds. Cleanup names only the container created for that check.

The provider CLIs run on the host with their configured sandbox and file tools. This is a different boundary from the container that executes host behavior checks.

## Live evaluation and resume

The approved configuration is in [evals/config.json](../evals/config.json). `selectedProviders: ["codex"]` selects Codex `gpt-6-astra / medium` only: 180 seconds per call, three repetitions, maximum 288 new calls. The 290 historical attempts remain separate, for at most 578 cumulative attempts after a separately authorized new run. The rename itself authorizes no provider evaluation. Claude settings remain available for a separately agreed later phase; its CLI is neither probed nor invoked in this phase. No automatic retry, model fallback, or extra paid grading call is available.

```bash
npm run eval
npm run eval -- --resume eval-results/<v3-directory> --dry-run
npm run eval -- --resume eval-results/<v3-directory>
```

The current contract uses `contractRevision: 3` and `modelPolicy: primary_response_only`. It checks structured primary assistant model fields and stores aggregate model usage separately. Extra models in usage are not a fallback finding. Unavailable returned identity is explicitly recorded as `explicit_cli_argument_only`; prose is never model evidence. Existing archives without this policy are preserved and rejected before execution or rewriting.

A new run freezes complete before/after Skill directories, case data, runner code, configuration, CLI versions, and Docker image identity. Do not edit these inputs during a run. The original tree is extracted from `87b2e064ad0d5ba7b38a1f7c194929fda980cf0a` without changing the checkout. The runner retains the original bytes under `frozen/original/skills/` and normalizes identity text into `frozen/before/skills/`. The original hashes, normalized hashes, mapping and rules version are bound to the run input hash. Both versions install the new names. See [Evaluation](evaluation.md#current-matrix-and-method) for the comparison limits. Each selected provider runs serially. This Codex-only phase has one call in flight. Paired version order is balanced and actual dispatch order is saved before spawning.

Authentication, quota, model mismatch, or isolation/harness failure stops further dispatch; an already in-flight peer can finish. Timeout evidence is retained without retry. Resume accepts only the same v3 inputs and environment and selects **never-called** slots. Attempted calls, including interrupted calls, retain their evidence. An incomplete dispatch journal blocks automatic resume because the attempt count is uncertain. Repeating an attempted call or changing inputs requires separate agreement and a new evaluation, not a recheck flag.

The original v2 archive helpers and their tests remain for historical inspection. `scripts/summarize-eval.mjs` is v2-only; the main evaluation CLI never runs or resumes v2. Do not convert or combine archives.

## Blind review and summary

Review `blind-review.json` before opening the version-labeled records. It contains expected facts, response text, changed files, and execution evidence, indexed by opaque IDs. No provider/version/repetition label is included. Style and content can still suggest a version, so this is label masking rather than a claim of perfect blinding.

Write an array of grades with `blindId`, `evidenceHash`, `semantic`, `rationale`, `missingFacts`, `unsupportedClaims`, and `scopeViolations`. `semantic` is `PASS`, `FAIL`, `UNCLEAR`, or `NOT_RUN`. The three issue fields contain string arrays. A PASS cannot contain unresolved defects.

```bash
npm run eval:summarize -- eval-results/<v3-directory> /path/to/blind-grades.json
```

`evaluationPassed` reports whether the selected-provider comparison satisfies its checks; `releaseReady` additionally requires both Codex and Claude. The summary CLI exits successfully for a passing selected-provider phase even when Claude remains deferred.

The v3 summary checks source and observation hashes, identities, required checks, output contracts, scope evidence, and grade binding. Semantic grades cannot waive structural failures. Missing evidence stays `UNCLEAR` or `NOT_RUN`; it cannot become a pass because the answer sounds plausible. Keep raw provider streams and private environment details out of public reports.

## Release and recovery

Packaging success is separate from behavioral validation. Preserve the beta notice and report unresolved evaluation results in [Evaluation](evaluation.md). Before an authorized release, compare the current Skill bytes with the evaluated after snapshot, inspect the final diff, and verify installation from the exact published tag in a disposable project.

The existing `v0.8.10-beta.1` tag is historical and still contains the previous skill names. Package version `0.8.10-beta.1` remains unchanged during this rename; it is not a claim of a new release. Do not move the tag or use it to verify new-name installation. The package remains private to npm.

Before publishing the renamed files, the owner must rename the GitHub repository to `soom-kang/sharpen-me`, update their local remote and workspace path as needed, and publish the reviewed changes. Then verify the new repository's actual branch in a disposable project:

```bash
npm run test:install -- --source https://github.com/soom-kang/sharpen-me
```

The repository rename and remote installation check are pending owner actions. Local installation tests do not establish that the remote repository serves these files. For a future release, agree on a new version and tag, review the diff and validation evidence, and obtain authorization for commit, push and publication. Never overwrite an existing tag or discard local skill edits to recover.

Existing installations require the [manual replacement steps](rename.md#replace-an-existing-project-installation). Global installation and user model settings are outside this workflow.
