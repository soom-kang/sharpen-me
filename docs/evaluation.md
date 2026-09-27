# Evaluation

Check the results below before relying on a skill for consequential work. For commands and review steps, see [Maintenance](maintenance.md#live-evaluation-and-resume).

**Current sharpen-me status: stopped; evaluation gate not met.** Run `2026-09-10T03-04-01-035Z-v3` attempted 69 of 576 planned calls before a Claude weekly-limit response stopped dispatch. Reviewed totals are **45 PASS, 14 FAIL, 9 UNCLEAR, 508 NOT_RUN**. The latter includes one failed provider attempt and 507 never-called slots. Release-version totals are 22 PASS, 6 FAIL, 6 UNCLEAR and 254 NOT_RUN. `evaluationPassed` and `releaseReady` remain `false`.

The separate [v0.9.0-beta.2 focused evaluation](evaluation-v0.9.0-beta.2.ko.md) resolves 48 selected comparison slots across several authorized runs: all 24 candidate slots PASS, while the baseline has 21 PASS and 3 FAIL. Its 68 provider calls are not added to the v3 archive or its 576-call gate. This one-observation-per-slot result does not establish automatic selection, all repetitions, or full release readiness.

See the [v0.9.0-beta.1 Korean evaluation report](evaluation-v0.9.0-beta.1.ko.md) for provider/skill counts, failure evidence and unrun coverage. Automatic selection, default output and repetitions 2–3 did not run. The runner retained `MODEL_MISMATCH` for the quota response because it reported model ID `<synthetic>`; this is not evidence of task execution on a fallback model. No retry or resume was performed. Historical results below concern earlier files; [the name mapping](rename.md#names) identifies their original names.

## Historical Codex evaluation

**Historical status: Codex evaluation complete, acceptance gate not met.** That 288-call run has 198 PASS, 35 FAIL, 55 UNCLEAR, and 0 NOT_RUN. Improved-version results are 111 PASS, 12 FAIL, and 21 UNCLEAR out of 144. Claude remains deferred and overall release readiness is false. See the [Korean Codex evaluation report](codex-evaluation.ko.md) for per-Skill comparisons, selection regressions, evidence limitations, and remaining work.

Run `2026-09-09T05-50-58-256Z-v3` used primary-response-only model verification and **288 new Codex invocations**, with no retry, fallback, or extra paid grader. All returned model identities were unavailable and recorded as `explicit_cli_argument_only`. Including the historical two calls, cumulative attempts are 290. The stopped-run result below is preserved; it was not regraded or inherited into the new phase.

## Historical stopped run

<details>
<summary>Stopped-run evidence and model identity limits</summary>

Run `2026-09-09T04-03-00-483Z-v3` used Node 24.20.0, Codex CLI 0.153.4, and Claude Code 2.1.236. The source, fixture, runner, config, and environment hashes remain archived. No automatic retry or model fallback was performed. After the run, changed-file collection was hardened against parent symlinks leaving the fixture and a regression test was added. Skill and fixture bytes did not change; the current runner hash differs, so this archive cannot be resumed by the current checkout. No additional inference was dispatched.

| Invocation | Evidence | Status |
| --- | --- | --- |
| Codex / before / `scope-repository-contract` / repeat 1 | Complete source read; valid caller JSON; required facts supported; no fixture edits; 56.344 seconds | PASS after evidence review |
| Claude / after / same case / repeat 1 | Response completed; model set contains both `claude-opus-5` and `claude-haiku-4-5-20251001`; 37.639 seconds | NOT_RUN for comparison: `MODEL_MISMATCH` |
| Remaining 574 slots | No provider invocation | NOT_RUN |

The Claude observation does **not** prove a main-answer fallback. The frozen matcher combines message model IDs and aggregate usage model IDs. Official [Claude Code model documentation](https://code.claude.com/docs/en/model-config) describes a separate Haiku/background model setting. Background use is therefore a plausible explanation, but the retained evidence does not establish the exact role of that Haiku call. Changing the single-model gate or pinning background calls requires a new agreed evaluation contract. Existing observations are preserved.

Codex did not expose a returned model identity in its event stream; its record says `explicit_cli_argument_only`. The command explicitly selected `gpt-6-astra / medium`. Claude and Codex counts in this archive are provider-session invocations, not counts of all underlying API requests.

No automatic-selection or default-output case ran in that historical archive. Its lack of selection-regression evidence is not evidence of non-regression. The [earlier Korean improvement report](improvement-report.ko.md) retains that stage's per-Skill counts and local validation; the new report linked above contains the completed Codex comparison.

</details>

## Current matrix and method

| Setting | Frozen contract |
| --- | --- |
| Before | Complete `skills/` tree at `87b2e064ad0d5ba7b38a1f7c194929fda980cf0a`, normalized to the new names |
| After | Complete current installation units, frozen before dispatch |
| Cases | 16 original behavior + 8 regression + 8 natural output + 16 implicit selection |
| Repetitions | Three per case/provider/version |
| Calls | Current phase: 48 × 2 × 2 × 3 = 576 planned calls; 290 historical attempts stay separate |
| Claude | `claude-opus-5-5`, `low` |
| Codex | `gpt-6-sol`, `medium` |
| Provider timeout | 180 seconds; no automatic retry or fallback |
| Concurrency | One invocation per provider, at most two in flight |
| Behavior checks | Node 24.20.0 Docker container, 30 seconds per check |
| Grading | Version labels masked; no additional paid grader |

<details>
<summary>Baseline normalization and case contracts</summary>

The baseline commit is the existing `v0.8.10-beta.1` tag. The runner preserves its original 24 files, then changes only skill names, H1 titles and display metadata in a comparison copy. It records the original hashes, name mapping, normalization rules version and normalized hashes in `baselineNormalization`, bound to `inputHash`. A missing commit, incomplete installation unit or inconsistent normalization stops before any provider invocation.

Both versions expose the same new names. A local test compares the normalized baseline with the fixed rename commit `1bfb92fae3199b07ac2acb30915922d27a1adc97`; current skill improvements may differ from that baseline. This comparison does not measure the effect of renaming on automatic selection. The approved new-call cap is 576, for at most 866 cumulative attempts including history.

[Case definitions](../evals/README.md) distinguish required JSON from natural responses. JSON retains existing type checks and permits extra fields. Automatic selection has independent positive/negative cases with balanced Korean/English prompts. No Skill identity or answer key appears in those task prompts. All eight Skills are installed for both versions. Successful source loading requires observed complete source content, not a similar-looking response.

</details>

Within each provider lane, before/after pairs alternate their leading version across cases and repetitions. The durable dispatch journal records actual launch order. Authentication, quota, reported model mismatch, isolation failure, or harness failure stops new dispatch. An already running peer may finish. Attempted records are never automatically repeated.

## Result format

New run files use `schemaVersion: 3` and `contractRevision: 4`. The runner and summarizer reject older contracts, including the previous v3 contract. Historical archives remain unchanged; use their frozen tools for historical inspection rather than converting or mixing evidence.

<details>
<summary>Record files and evidence fields</summary>

| Record | Contents |
| --- | --- |
| `run.json` | baseline revision, `baselineNormalization` provenance, configuration (including `contractRevision: 4`, `modelPolicy`, and `selectedProviders`), input hash, working/frozen file hashes, selected CLI versions, Docker ID/digests, Node version, and declared matrix. |
| `frozen/original/skills/` | unchanged baseline bytes from Git. |
| `frozen/before/skills/` and `frozen/after/skills/` | whole installation units, including metadata and license. |
| `frozen/scripts/`, `frozen/evals/`, and `frozen/cases.json` | the evaluator and evaluator-only criteria. |
| `dispatch.json` | unique invocation IDs, order, and start times, written before provider spawn. |
| `records/provider--version--case-id--rN.json` | response text, parsed JSON when requested, source-loading evidence, paired command/result evidence, usage, duration, changed files, host checks, execution status, and evidence hash. |
| `blind-review.json` | opaque identifiers and evaluator evidence, without provider/version/repetition labels. |
| `summary.json` and `reviewed-summary.json` | category and repetition counts, scope violations, time/usage, selection regressions, and readiness. |

Responses are retained as text after removing local fixture paths and credential-shaped values. Commands and results each have an 8 KiB limit after redaction, with explicit missing and truncation markers. These incomplete records cannot establish a PASS. Full provider initialization streams and account details are not archived. Review packets include expected facts; providers do not receive them. Grading instructions and commands are in [Maintenance](maintenance.md#blind-review-and-summary).

`baselineChecks` means fixture checks before the provider's edits, not results of the before Skill version. `afterChecks` means checks after the same call. Do not conflate those fields with `version: before/after`.

</details>

## Review and release criteria

The historical `v0.8.10-beta.1` tag contains the original skill names. Its validation does not certify the renamed installation units. The published v0.9.0-beta.1 Pre-release discloses failures and unresolved evidence. Publication does not change failed evaluation gates; it is not Latest.

Execution can produce `REVIEW_REQUIRED`, `FAIL`, `UNCLEAR`, or `NOT_RUN`. `REVIEW_REQUIRED` needs evidence review; it is not a pass. Reviewers assign `PASS`, `FAIL`, `UNCLEAR`, or `NOT_RUN` and identify missing facts, unsupported claims, and scope violations.

Check the gates in this order:

1. Complete the declared matrix with no unresolved or unrun results.
2. Require every improved-version case to pass in each repetition, with no observed selection regression. Before-version failures remain valid comparison results.
3. Keep structural failures: a semantic PASS cannot override missing source reads, invalid JSON, failed or missing required checks, out-of-scope changes, or incomplete provider execution.
4. Report `evaluationPassed` for the selected providers. Set `releaseReady` only when both Codex and Claude are selected and validated; a Codex-only pass leaves it false.

Source, fixture, runner, configuration, CLI version, and Docker identity must remain frozen. Explicit resume validates the same inputs and preserves every attempted observation; only never-called slots can continue. An incomplete dispatch journal requires investigation rather than a guessed call count.

The historical baseline commit `09bb976` is absent from the current repository history. The public checkout alone cannot reproduce the original before/after evaluation. Local frozen snapshots remain separate from the distribution; the rename does not restore that history or rerun those evaluations. The current contract uses the available `87b2e06` baseline instead.

## Execution boundaries and limits

Provider CLIs execute on the host. Codex uses its sandbox and disabled multi-agent/web features; Claude receives allowed file tools. The shared prompt bounds access to the synthetic fixture. The host behavior checks of edited files execute separately in Docker. This does not mean all provider tool execution occurs in a container, nor that both CLIs expose identical tools.

<details>
<summary>Docker isolation, model identity, and interpretation limits</summary>

Docker preflight establishes the official image's actual Node version/digest and isolation before provider inference. The container has no network, read-only root and fixture, a nonprivileged user, removed capabilities, and resource limits. No host home, credential store, or Docker socket is mounted. There is no less-isolated fallback.

Some CLI streams omit a returned model identity. The observation then records `explicit_cli_argument_only`, rather than asserting provider-side model verification. A different model in a structured top-level primary response stops execution. Aggregate `usageModels` and numeric `usageByModel` accounting are stored separately; their role is not guessed, and they cannot establish a primary-model mismatch. Source-loading observations can also be incomplete; positive selection without sufficient evidence remains `UNCLEAR`. Negative selection checks completed observable traces for unwanted loading, not the provider's private internal decisions.

Three repetitions describe these fixtures. They do not establish a general win rate, production safety, total time savings, or statistically reliable superiority. Label masking reduces explicit grading bias but cannot prevent an evaluator from inferring a version from response content.

</details>

## Historical evidence

Earlier 2026-09-07 observations identified unsupported repair claims in `sharpen-review`, observation/cause confusion in `sharpen-challenge`, guessed platform defaults in `sharpen-assess`, and omitted material uncertainty in `sharpen-brief`. Those observations concern earlier bytes and remain regression targets. They are not passes or measured failures of this revision and are not converted into v3.
