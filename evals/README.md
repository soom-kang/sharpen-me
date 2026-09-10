# Evaluation cases

The v3 matrix has 48 synthetic cases across eight Skills. The complete design covers two providers, before and after improvement, three times. The current config selects Codex only: 288 new calls. Claude is deferred. Cases are inputs and grading criteria, not observed results.

| Category | Cases | Purpose |
| --- | ---: | --- |
| `behavior` | 16 | Original normal and edge scenarios, with unchanged prompts and expected facts |
| `regression` | 8 | One concrete instruction conflict per Skill |
| `default-output` | 8 | A normal explicit invocation without a caller JSON schema |
| `selection` | 16 | Positive and clearly irrelevant negative implicit prompts; eight Korean and eight English |

[Original cases](cases.mjs) export `legacyCases` and their behavior descriptors. [Additional cases](additional-cases.mjs) exports the complete `cases` array. Expected facts remain evaluator-only.

## Input contract

Each case has `id`, `skill`, `kind`, `category`, `invocation`, `output`, `prompt`, `files`, `mutablePaths`, and `expected`. Optional `checks` supply Node argument vectors, `when`, `expectedExitCode`, and `purpose`. Implicit cases also declare evaluator-only `expectedSkills` and language. Paths must remain within the disposable fixture.

All eight complete Skill units are available in each provider's project installation directory. Explicit prompts name their Skill file. Implicit prompts contain neither Skill name, path, nor expected selection. The model sees the task and fixture; it never receives the `expected` fields or host grading commands. Existing test files are readable evidence.

JSON cases keep the five required field types and allow additional fields. Prose may precede the final JSON; trailing prose violates that caller contract. Natural output cases store the response without requiring JSON. Content is graded from facts and execution evidence, not keyword counts.

Fresh-review fixtures explicitly distinguish a host-isolated invocation from an author session. `not_run` can be the correct response when independence is unavailable. The code regression supplies baseline, contract, caller, and code as legitimate evidence.

## Host checks and grading

Compare fixture bytes before and after the call. Any write outside `mutablePaths` fails scope. Do not run edited checks after a forbidden write or a symlink/special-file change. Required behavior checks run in Docker with the Node 24.20.0 boundary described in [Maintenance](../docs/maintenance.md#docker-checks), never through an unrestricted host fallback.

A successful response or passing behavior test alone does not prove requested consolidation. Review changed files and required facts. Record missing facts, unsupported claims, scope violations, and uncertainty. Actual complete Skill-source loading must be observed for positive selection; merely claiming to use a Skill is insufficient.

## Fixture freeze

The 48-case criteria were frozen before the Skill edits on 2026-09-09. Preserve these hashes and do not change expected facts in response to model outcomes.

| Input | SHA-256 |
| --- | --- |
| Original 16 normalized cases | `fd23c8cbe6ed4c3ad5223dcb880c249979bdf94605aaadada23f03f7c16b1d47` |
| Complete 48 normalized cases | `c6d61b693c93ffdfca13937f79fefa2a402866bcbd3d86e602a17449b593d6dd` |
| Original case module after exports were separated | `e2be9d5f10a6c4dfb84620b09bc96fda416a49e63315f45c8648bb20ee86c7e3` |
| Additional case module | `a42d6fbdb01ea9ca438783d5047249981751e104ba1238ce9859efcaf0453ba6` |

A justified future fixture correction needs a documented diff and separately agreed evaluation. Historical v2 archives remain unchanged and cannot enter v3 results. [Evaluation](../docs/evaluation.md) describes current observations and remaining limits.
