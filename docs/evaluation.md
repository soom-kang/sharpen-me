# Evaluation results and limits

**Beta.7's bounded evaluation recorded 21 PASS and 11 UNCLEAR; the full evaluation gate remains unmet.** The historical beta.2 focused pass concerns different sources. Installation and local checks do not measure model behavior.

## Beta.7 focused evaluation (2026-10-26)

The approved run completed 16 cases × two providers × one observation, using beta.7 commit `bc72c518c1fab29f5b0c4e8a08d95aae710aa69a`. It covers four assess decisions, six dedupe decisions, and six neighboring-skill selection prompts. All eight release units were available in isolated project fixtures. Brief and cold-review were not directly tested.

| Provider | Calls | PASS | FAIL | UNCLEAR | NOT_RUN |
| --- | ---: | ---: | ---: | ---: | ---: |
| Codex | 16 | 11 | 0 | 5 | 0 |
| Claude Code | 16 | 10 | 0 | 6 | 0 |
| Total | **32** | **21** | **0** | **11** | **0** |

**FAIL 0 does not mean no defects.** Manual review assigned 30 PASS and two FAIL: Codex D5 read unrelated skill bodies through a broad hidden-file search, and Claude R2 asserted duplicate-charge behavior despite an unknown provider contract. The frozen summary gives structural UNCLEAR precedence over manual grades, so both remain UNCLEAR in this table. The record retains both layers; neither `focusedPassed` nor `releaseReady` is true.

The remaining uncertainties concern Codex discovery/exclusion globs misclassified as unattributed content, Claude native Skill calls without observable full source, and Claude R5 with no recorded skill access. Both R5 edits preserved the scoped contract and passed the two existing Docker checks before and after. No fixture writes escaped the allowed path. Core assess and dedupe distinctions were present in the responses, but source-access and selection limits prevent a clean pass.

Codex used `gpt-6-sol / medium` (CLI `0.164.0`); Claude used `claude-opus-5-5 / low` (CLI `2.1.310`). Codex identity is supported by explicit CLI arguments only; Claude primary responses reported the requested model. Node was `24.20.0`. Codex retained its native sandbox with disposable child HOME/configuration paths; Claude used restricted tools/settings and a process read restriction for personal context. This does not evaluate unchanged personal-session settings.

Eight earlier diagnostic calls were excluded for global-instruction contamination or nested-sandbox failure. The final count is 40 calls: US$2.3786126 API equivalent for the new 32 plus US$0.6674804 for diagnostics, totaling **US$3.0460930** against a US$15 management budget. This is token-based accounting, not the subscription invoice or a hard billing cap. No automatic retries, fallback, or paid grader ran.

The authoring agent reviewed responses, execution evidence and edits; this was not an independent blind review. Grades bind to evidence hashes. A single version and repetition cannot establish improvement, repeatability, provider superiority, or a general success rate. See the [case-by-case report (Korean)](evaluation-beta7-2026-10-26.ko.md), [plan](../evals/focused-beta7.mjs), and [bounded execution procedure](maintenance.md#bounded-beta7-evaluation). Local `eval-results/focused-beta7-native-2026-10-26/` retains the frozen sources and evidence. The historical archives and full 576-call gate are unchanged.

## Unreleased evaluator changes

Codex command observation now ignores exclusion globs, records listings as discovery, and attributes Skill paths from the output of searches that name no Skill path. A manual FAIL now surfaces through a structural UNCLEAR; it never overrides structural FAIL or NOT_RUN. Regression tests cover both. Beta.7 records keep no raw provider stream, so they cannot be re-observed; do not summarize or continue that archive with the modified scripts. The next bounded evaluation [plan (Korean)](evaluation-plan-next.ko.md) was approved on 2026-10-31 for 40 calls, including a 16-call no-skill control arm, under a US$10 management budget. The focused runner now accepts `--plan` and records control slots as version `control`. No provider call has run.

## Beta.7 skill revisions (2026-10-26)

All eight skill instructions and their Codex descriptions/prompts were revised to clarify selection and stopping. Assess now ties deeper reasoning to a specific unresolved problem rather than stakes alone. Dedupe separates observed differences from intent and distinguishes caller migration from redundant-copy removal. [Design](design.md) and the paired [English](usage.md) / [Korean](usage.ko.md) guides describe the boundaries and examples.

These revisions ship in v0.9.0-beta.7; the separate evaluation above followed the wording and release work. The historical 24-pass result below remains evidence for its own frozen sources. The approved 48-case matrix, its hashes, provider configuration, and historical archives are unchanged. The bounded runner reuses existing evaluation helpers; no production dependency or new test suite was added.

Source review covered normal and boundary examples, including high-risk mechanical work, unresolved dedupe intent, caller migration, resolved clarification, missing baselines, and unavailable review isolation. That manual consistency check is separate from the model observations above. The existing full-matrix negative selection cases count letters in unrelated words; the new bounded plan separately tests six neighboring-skill boundaries. Examples in the usage guides are not independently passing cases.

For the earlier instruction-only change, local verification used `npm run verify` and `git diff --check`, plus a focused check of the edited skill-map labels. Installation layout, installer code, evaluation runner, and fixture execution were unchanged during that wording pass; its local checks did not require installation or Docker suites. The later bounded evaluation is recorded above. Any further provider evaluation needs a separately agreed scope and budget under [Maintenance](maintenance.md#live-evaluation-and-resume). Local checks cannot establish invocation accuracy, time savings, or provider behavior.

Local wording-pass validation recorded on 2026-10-26:

| Check | Result and boundary |
| --- | --- |
| `npm run verify` | PASS: packaging, metadata, references, syntax, unchanged 48-case matrix, and 100 existing tests; Node 24.22.1 meets the declared minimum, but this was not a rerun on the exact CI-pinned 24.20.0 |
| `git diff --check` | PASS; changes are confined to skill instructions/metadata and related documentation/diagrams |
| Normal and boundary walkthroughs for eight skills | No instruction conflict identified; source review only, without provider execution |
| English/Korean skill maps at 640 px and 375 px | HTML/SVG sources match; browser text bounds and screenshot inspection show no clipping |
| Provider, installation, and Docker runs | NOT_RUN for this wording pass; no invocation or release-readiness claim |

The default Playwright browser cache was unavailable, and a sandboxed Chrome launch failed. Rendering then completed with the installed Chrome in a temporary profile through approved execution, without downloading a browser or using the user's profile.

## Published release evidence

Beta.8 packages the bounded beta.7 case plan, runner, and report. All 24 shipping skill files remain byte-for-byte identical to beta.7, and the evaluation plan retains its original beta.7 tag and commit. Publishing beta.8 does not resolve the recorded defects or unmet gates. The [beta.8 release notes](https://github.com/soom-kang/sharpen-me/releases/tag/v0.9.0-beta.8) identify the exact release commit and its CI and tag-installation checks.

Beta.7 includes the eight skill revisions above and aligns the package, lockfile, installation examples, and expected global installation `ref` with `v0.9.0-beta.7`. The [release notes](https://github.com/soom-kang/sharpen-me/releases/tag/v0.9.0-beta.7) record the release commit's CI and tag-installation results separately from the local wording pass. These packaging checks do not establish model behavior or satisfy the full evaluation gate.

The v0.9.0-beta.4 release contains evaluator fixes and is installed through its GitHub tag with the skills CLI. Its 24 skill files are byte-for-byte identical to v0.9.0-beta.2 and v0.9.0-beta.3. No new model evaluation was run for beta.3 or beta.4; the dated results and unmet gates below retain their original scope. Tag installation checks do not establish agent discovery or model behavior.

The [2026-10-12 QA report (Korean)](qa-2026-10-12.md) records four evaluator defects at `d4c55d3` and the SHARPEN-QA-003–006 fixes shipped in beta.4: credential redaction, JSON/attempt preservation, the final dispatch stop boundary, and partial Skill access evidence. The fixes add regressions to the existing tests; no new provider evaluation ran. They do not change the shipping skills or establish an effect on historical results.

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
| `records/provider--version--case-id--rN.json` | response text, parsed JSON when requested, complete source-loading evidence, observed Skill access/discovery with completion status, paired command/result evidence, usage, duration, changed files, host checks, execution status, and evidence hash. |
| `blind-review.json` | opaque identifiers and evaluator evidence, without provider/version/repetition labels. |
| `summary.json` and `reviewed-summary.json` | category and repetition counts, scope violations, time/usage, selection regressions, and readiness. |

Observations are redacted structurally before serialization, preserving keys and scalar types. Known string patterns cover `sk-` / `sk-ant-` token prefixes, case-insensitive Bearer headers, and quoted or assignment forms of `token`, `api_key` / `api-key` / `apikey`, and `password`. String fields with those credential keys are also masked recursively. Fixture paths and macOS user-home paths are removed. Custom labels, arbitrary secrets, and all sensitive personal information are outside this pattern contract; redaction alone does not make an archive safe to share. Commands and results each have an 8 KiB limit after redaction, with explicit missing and truncation markers. These incomplete records cannot establish a PASS. Full provider initialization streams and account details are not archived. Review packets include expected facts; providers do not receive them. Grading instructions and commands are in [Maintenance](maintenance.md#blind-review-and-summary).

`skillAccessEvidence` retains only Skill attribution, tool kind, content/discovery kind, completion status, and whether the complete source was observed. It contains no raw tool arguments or source text. Successful unrelated content access fails selection even if only part of the source was returned. A failed, missing, or unattributed content trace remains `UNCLEAR`. Positive selection still requires complete expected source; filename discovery cannot establish loading. Negative fixtures also reject observed unrelated discovery. The summary rechecks these facts before applying a semantic grade and before counting selection results. Missing access evidence cannot establish a PASS.

`baselineChecks` means fixture checks before the provider's edits, not results of the before Skill version. `afterChecks` means checks after the same call. Do not conflate those fields with `version: before/after`.

</details>

## Review and release criteria

Execution can produce `REVIEW_REQUIRED`, `FAIL`, `UNCLEAR`, or `NOT_RUN`. `REVIEW_REQUIRED` needs evidence review; it is not a pass. Reviewers assign `PASS`, `FAIL`, `UNCLEAR`, or `NOT_RUN` and identify missing facts, unsupported claims, and scope violations.

Check the gates in this order:

1. Complete the declared matrix with no unresolved or unrun results.
2. Require every improved-version case to pass in each repetition, with no observed selection regression. Before-version failures remain valid comparison results.
3. Keep structural failures: a semantic PASS cannot override missing source reads, invalid JSON, failed or missing required checks, out-of-scope changes, or incomplete provider execution.
4. Report `evaluationPassed` for the selected providers. Set `releaseReady` only when both Codex and Claude are selected and validated; a Codex-only pass leaves it false.

Source, fixture, runner, configuration, CLI version, and Docker identity must remain frozen. Explicit resume validates the same inputs and preserves every attempted observation; only never-called slots can continue. Once provider invocation is attempted, a later collection failure retains `providerCalled: true` and cannot make that slot eligible for retry. A halt before invocation can cancel a known-unstarted journal reservation only after its removal is durably written. Journal or cancellation-write failure leaves uncertain evidence for investigation. An incomplete dispatch journal is never resolved by guessing a call count. The runner changes invalidate older working-input hashes; existing archives are neither rewritten nor regraded by these fixes.

## Execution boundaries and limits

Provider CLIs execute on the host. Codex uses its sandbox and disabled multi-agent/web features; Claude receives allowed file tools. The shared prompt bounds access to the synthetic fixture. The host behavior checks of edited files execute separately in Docker. This does not mean all provider tool execution occurs in a container, nor that both CLIs expose identical tools.

<details>
<summary>Docker isolation, model identity, and interpretation limits</summary>

Docker preflight establishes the official image's actual Node version/digest and isolation before provider inference. The container has no network, read-only root and fixture, a nonprivileged user, removed capabilities, and resource limits. No host home, credential store, or Docker socket is mounted. There is no less-isolated fallback.

Some CLI streams omit a returned model identity. The observation then records `explicit_cli_argument_only`, rather than asserting provider-side model verification. A different model in a structured top-level primary response triggers a stop before further dispatch; already started peers may complete. Aggregate `usageModels` and numeric `usageByModel` accounting are stored separately; their role is not guessed, and they cannot establish a primary-model mismatch. Source-loading observations can also be incomplete; positive selection without sufficient evidence remains `UNCLEAR`. Selection checks only observable traces, not private internal decisions or every possible shell read. Claude file tools and ordinary Codex file-reader commands are attributed when their Skill path is known; unsupported or dynamic Skill paths retain uncertainty rather than being treated as no-use.

Three repetitions describe these fixtures. They do not establish a general win rate, production safety, total time savings, or statistically reliable superiority. Label masking reduces explicit grading bias but cannot prevent an evaluator from inferring a version from response content.

</details>
