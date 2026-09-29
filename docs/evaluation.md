# Evaluation results and limits

**The focused candidate passed; the full evaluation gate remains unmet.** These are separate results. Installation and local checks do not measure model behavior.

## Focused evaluation

The v0.9.0-beta.2 comparison ran on 2026-09-27–28. It covered 12 cases across six skills, before/after instructions, and two providers: 48 comparison slots.

| Provider | Version | PASS | FAIL | UNCLEAR | NOT_RUN |
| --- | --- | ---: | ---: | ---: | ---: |
| Codex | before | 11 | 1 | 0 | 0 |
| Codex | candidate | 12 | 0 | 0 | 0 |
| Claude Code | before | 10 | 2 | 0 | 0 |
| Claude Code | candidate | 12 | 0 | 0 | 0 |
| Total | both | 45 | 3 | 0 | 0 |

All **24 candidate slots PASS**. This combines each slot's last valid result across separately authorized runs; it is not a fresh 48-call pass. Calls were 41 initially, then 12, 4, 4, and 7: **68 provider calls**. No automatic retry or model replacement ran. An earlier interrupted three-call run and the full-matrix archives remain separate.

| Evidence | Frozen condition |
| --- | --- |
| Baseline | Installation units at `548fe1e4706bef355e5ed1f50c12230fcefbf2c7` |
| Candidate | `53101421bc8440bacfaa2827a84b23943dceaeb9` plus the evaluated cold-review edit; all 24 shipping skill files matched the final snapshot at release preparation |
| Codex | `gpt-6-sol / medium`, CLI `0.157.1`; returned identity unavailable, recorded from explicit CLI arguments only |
| Claude Code | `claude-opus-5-5 / low`, CLI `2.1.283`; model identity recorded from the completed response |
| Checks | Node.js `24.20.0`, behavior checks in a digest-frozen `node:24.20.0-bookworm-slim` container |

The six skills were clarify, challenge, assess, cold-review, brief, and refine. Review and dedupe were not evaluated in this comparison. Local `eval-results/focused-beta2-*` archives hold frozen inputs, responses, edits, timings, usage, and call records; raw archives are not release attachments.

Evidence collection initially failed on macOS temporary-path resolution. Later timeouts and authentication failures were retained, then reevaluated in separately approved runs. Final document-edit cases changed only permitted files and passed their Docker checks.

One final observation per slot does not establish a general success rate, provider superiority, automatic selection, default output, or repetitions 2–3. Reused and new results have narrower coverage than a fresh run against one source state. Default-branch installation may contain changes beyond the evaluated release.

## Full evaluation gate

The latest full-matrix record, `2026-09-10T03-04-01-035Z-v3`, stopped after attempting 69 of 576 planned calls on a Claude weekly-limit response. Its results concern the source and configuration frozen in that archive.

| Version | PASS | FAIL | UNCLEAR | NOT_RUN |
| --- | ---: | ---: | ---: | ---: |
| Both | 45 | 14 | 9 | 508 |
| Candidate | 22 | 6 | 6 | 254 |

`evaluationPassed` and `releaseReady` remain `false`. NOT_RUN includes one failed provider attempt and 507 never-called slots. The quota response reported `<synthetic>` and retained `MODEL_MISMATCH`; it does not prove execution on a fallback model. Automatic selection, default output, and repetitions 2–3 did not run. The focused results are not merged into this archive.

Use the following contract for a newly agreed full evaluation. Current model defaults do not rewrite the settings or results of existing archives.

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

Execution can produce `REVIEW_REQUIRED`, `FAIL`, `UNCLEAR`, or `NOT_RUN`. `REVIEW_REQUIRED` needs evidence review; it is not a pass. Reviewers assign `PASS`, `FAIL`, `UNCLEAR`, or `NOT_RUN` and identify missing facts, unsupported claims, and scope violations.

Check the gates in this order:

1. Complete the declared matrix with no unresolved or unrun results.
2. Require every improved-version case to pass in each repetition, with no observed selection regression. Before-version failures remain valid comparison results.
3. Keep structural failures: a semantic PASS cannot override missing source reads, invalid JSON, failed or missing required checks, out-of-scope changes, or incomplete provider execution.
4. Report `evaluationPassed` for the selected providers. Set `releaseReady` only when both Codex and Claude are selected and validated; a Codex-only pass leaves it false.

Source, fixture, runner, configuration, CLI version, and Docker identity must remain frozen. Explicit resume validates the same inputs and preserves every attempted observation; only never-called slots can continue. An incomplete dispatch journal requires investigation rather than a guessed call count.

## Execution boundaries and limits

Provider CLIs execute on the host. Codex uses its sandbox and disabled multi-agent/web features; Claude receives allowed file tools. The shared prompt bounds access to the synthetic fixture. The host behavior checks of edited files execute separately in Docker. This does not mean all provider tool execution occurs in a container, nor that both CLIs expose identical tools.

<details>
<summary>Docker isolation, model identity, and interpretation limits</summary>

Docker preflight establishes the official image's actual Node version/digest and isolation before provider inference. The container has no network, read-only root and fixture, a nonprivileged user, removed capabilities, and resource limits. No host home, credential store, or Docker socket is mounted. There is no less-isolated fallback.

Some CLI streams omit a returned model identity. The observation then records `explicit_cli_argument_only`, rather than asserting provider-side model verification. A different model in a structured top-level primary response stops execution. Aggregate `usageModels` and numeric `usageByModel` accounting are stored separately; their role is not guessed, and they cannot establish a primary-model mismatch. Source-loading observations can also be incomplete; positive selection without sufficient evidence remains `UNCLEAR`. Negative selection checks completed observable traces for unwanted loading, not the provider's private internal decisions.

Three repetitions describe these fixtures. They do not establish a general win rate, production safety, total time savings, or statistically reliable superiority. Label masking reduces explicit grading bias but cannot prevent an evaluator from inferring a version from response content.

</details>
