# Evaluation cases

The v3 matrix defines 48 synthetic cases across eight skills. Two providers, two instruction versions, and three repetitions produce 576 planned calls. See [Evaluation](../docs/evaluation.md) for current configuration and measured results, and [Maintenance](../docs/maintenance.md) for execution commands. Expected facts are evaluator-only.

| Category | Cases | Purpose |
| --- | ---: | --- |
| `behavior` | 16 | Original normal and edge scenarios, with unchanged prompts and expected facts |
| `regression` | 8 | One concrete instruction conflict per Skill |
| `default-output` | 8 | A normal explicit invocation without a caller JSON schema |
| `selection` | 16 | Positive and clearly irrelevant negative implicit prompts; eight Korean and eight English |

The [original case module](cases.mjs) exports `legacyCases` and their behavior descriptors. The [additional case module](additional-cases.mjs) exports the complete `cases` array. Expected facts remain evaluator-only.

## Input contract

Each case has `id`, `skill`, `kind`, `category`, `invocation`, `output`, `prompt`, `files`, `mutablePaths`, and `expected`. Optional `checks` supply Node argument vectors, `when`, `expectedExitCode`, and `purpose`. Implicit cases also declare evaluator-only `expectedSkills` and language. Paths must remain within the disposable fixture.

All eight complete Skill units are available in each provider's project installation directory. Explicit prompts name their Skill file. Implicit prompts contain neither Skill name, path, nor expected selection. The model sees the task and fixture; it never receives the `expected` fields or host grading commands. Existing test files are readable evidence.

JSON cases keep the five required field types and allow additional fields. Prose may precede the final JSON; trailing prose violates that caller contract. Natural output cases store the response without requiring JSON. Content is graded from facts and execution evidence, not keyword counts.

Fresh-review fixtures explicitly distinguish a host-isolated invocation from an author session. `not_run` can be the correct response when independence is unavailable. The code regression supplies baseline, contract, caller, and code as legitimate evidence.

## Host checks and grading

Compare fixture bytes before and after the call. Any write outside `mutablePaths` fails scope. Do not run edited checks after a forbidden write or a symlink/special-file change. Required behavior checks run in Docker with the Node 24.20.0 boundary described in [Maintenance](../docs/maintenance.md#docker-checks), never through an unrestricted host fallback.

1. Review changed files and required facts. A successful response or passing behavior test alone does not prove consolidation. Record missing facts, unsupported claims, scope violations, and uncertainty.
2. Verify complete skill-source loading for positive selection. A claim to use a skill is insufficient.
3. Inspect paired commands, exit status, and results after redaction. Commands and results each have an 8 KiB limit. Missing or truncated evidence is marked and cannot establish a PASS. Initialization streams and account metadata are not retained.

## Fixture freeze

Freeze inputs before dispatch. Do not change expected facts in response to model outcomes. A justified fixture correction needs a documented diff and a separately agreed evaluation.

The current observation contract is revision 4. Both versions use the same skill names. Older archives remain unchanged and cannot be resumed or summarized under this contract. These hashes identify the current approved fixtures:

| Current input | SHA-256 |
| --- | --- |
| Renamed 16 normalized cases | `bc62378b93e74bbd40bb50f8a43530c424f94104cf539428a20e5900ad101c72` |
| Renamed 48 normalized cases | `8eccbb25a9d41cabc84d61fecc8bb03d549c93366b0333f39479d639b8511a77` |
| Renamed original case module | `1bf3226f3dcf094704f18690c7ba08de7b7cb0f6326690a1e1de49c1c4757835` |
| Renamed additional case module | `15d123eab63d015588861c09ddc590495e71601354d3b55e289cd399ab46361a` |
