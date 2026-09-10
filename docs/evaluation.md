# Evaluation

**Current status: Codex evaluation complete, acceptance gate not met.** The new 288-call run has 198 PASS, 35 FAIL, 55 UNCLEAR, and 0 NOT_RUN. Improved-version results are 111 PASS, 12 FAIL, and 21 UNCLEAR out of 144. Claude remains deferred and overall release readiness is false. See the [Korean Codex evaluation report](codex-evaluation.ko.md) for per-Skill comparisons, selection regressions, evidence limitations, and remaining work.

Run `2026-09-09T05-50-58-256Z-v3` used primary-response-only model verification and **288 new Codex invocations**, with no retry, fallback, or extra paid grader. All returned model identities were unavailable and recorded as `explicit_cli_argument_only`. Including the historical two calls, cumulative attempts are 290. The historical result below is preserved; it was not regraded or inherited into the new phase.

## Historical stopped run

Run `2026-09-09T04-03-00-483Z-v3` used Node 24.20.0, Codex CLI 0.153.4, and Claude Code 2.1.236. The source, fixture, runner, config, and environment hashes remain archived. No automatic retry or model fallback was performed. After the run, changed-file collection was hardened against parent symlinks leaving the fixture and a regression test was added. Skill and fixture bytes did not change; the current runner hash differs, so this archive cannot be resumed by the current checkout. No additional inference was dispatched.

| Invocation | Evidence | Status |
| --- | --- | --- |
| Codex / before / `scope-repository-contract` / repeat 1 | Complete source read; valid caller JSON; required facts supported; no fixture edits; 56.344 seconds | PASS after evidence review |
| Claude / after / same case / repeat 1 | Response completed; model set contains both `claude-opus-5` and `claude-haiku-4-5-20251001`; 37.639 seconds | NOT_RUN for comparison: `MODEL_MISMATCH` |
| Remaining 574 slots | No provider invocation | NOT_RUN |

The Claude observation does **not** prove a main-answer fallback. The frozen matcher combines message model IDs and aggregate usage model IDs. Official [Claude Code model documentation](https://code.claude.com/docs/en/model-config) describes a separate Haiku/background model setting. Background use is therefore a plausible explanation, but the retained evidence does not establish the exact role of that Haiku call. Changing the single-model gate or pinning background calls requires a new agreed evaluation contract. Existing observations are preserved.

Codex did not expose a returned model identity in its event stream; its record says `explicit_cli_argument_only`. The command explicitly selected `gpt-6-astra / medium`. Claude and Codex counts below are provider-session invocations, not counts of all underlying API requests.

No automatic-selection or default-output case ran in that historical archive. Its lack of selection-regression evidence is not evidence of non-regression. The [earlier Korean improvement report](improvement-report.ko.md) retains that stage's per-Skill counts and local validation; the new report linked above contains the completed Codex comparison.


## Matrix and method

| Setting | Frozen contract |
| --- | --- |
| Before | Complete `skills/` tree at `09bb9761294f0189a59e119e2b0db1c3db502370` |
| After | Complete improved installation units, frozen before dispatch |
| Cases | 16 original behavior + 8 regression + 8 natural output + 16 implicit selection |
| Repetitions | Three per case/provider/version |
| Calls | Current phase: 48 × 1 × 2 × 3 = 288 new Codex calls; historical two calls stay separate |
| Claude | Deferred; configured `claude-opus-5 / medium`, no invocation in this phase |
| Codex | `gpt-6-astra`, `medium` |
| Provider timeout | 180 seconds; no automatic retry or fallback |
| Concurrency | One Codex invocation at a time |
| Behavior checks | Node 24.20.0 Docker container, 30 seconds per check |
| Grading | Version labels masked; no additional paid grader |

[Case definitions](../evals/README.md) distinguish required JSON from natural responses. JSON retains existing type checks and permits extra fields. Automatic selection has independent positive/negative cases with balanced Korean/English prompts. No Skill identity or answer key appears in those task prompts. All eight Skills are installed for both versions. Successful source loading requires observed complete source content, not a similar-looking response.

Within each provider lane, before/after pairs alternate their leading version across cases and repetitions. The durable dispatch journal records actual launch order. Authentication, quota, reported model mismatch, isolation failure, or harness failure stops new dispatch. An already running peer may finish. Attempted records are never automatically repeated.

## Result format

New run files use `schemaVersion: 3`; existing v2 archives remain unchanged and are rejected by the v3 runner and summarizer.

- `run.json`: baseline revision, configuration (including `contractRevision: 2`, `modelPolicy`, and `selectedProviders`), input hash, working/frozen file hashes, selected CLI versions, Docker ID/digests, Node version, and declared matrix.
- `frozen/before/skills/` and `frozen/after/skills/`: whole installation units, including metadata and license.
- `frozen/scripts/`, `frozen/evals/`, and `frozen/cases.json`: the evaluator and evaluator-only criteria.
- `dispatch.json`: unique invocation IDs, order, and start times, written before provider spawn.
- `records/provider--version--case-id--rN.json`: response text, parsed JSON when requested, source-loading evidence, usage, duration, changed files, host checks, execution status, and evidence hash.
- `blind-review.json`: opaque identifiers and evaluator evidence, without provider/version/repetition labels.
- `summary.json` and `reviewed-summary.json`: category and repetition counts, scope violations, time/usage, selection regressions, and readiness.

Responses are retained as text after removing local fixture paths and credential-shaped values. Full provider initialization streams and account/environment details are not archived. Review packets include expected facts; providers do not receive them. Grading instructions and commands are in [Maintenance](maintenance.md#blind-review-and-summary).

`baselineChecks` means fixture checks before the provider's edits, not results of the before Skill version. `afterChecks` means checks after the same call. Do not conflate those fields with `version: before/after`.

## Review and release criteria

The `v0.8.10-beta.1` Pre-release makes the existing Skills available for beta use with these evaluation gaps disclosed. It does not change either acceptance gate or establish behavioral readiness for both agents.

The historical baseline commit `09bb976` is absent from the current repository history. The public checkout alone cannot reproduce the original before/after evaluation. Local frozen snapshots remain separate from the distribution; this beta does not restore history or rerun provider evaluations.

Execution can produce `REVIEW_REQUIRED`, `FAIL`, `UNCLEAR`, or `NOT_RUN`. `REVIEW_REQUIRED` needs evidence review; it is not a pass. Reviewers assign `PASS`, `FAIL`, `UNCLEAR`, or `NOT_RUN` and identify missing facts, unsupported claims, and scope violations.

The selected-provider `evaluationPassed` gate requires the declared matrix to have complete evidence, no unresolved or unrun results, all improved-version cases passing in every repetition, and no observed selection regression. Before-version failures are valid comparative observations. `releaseReady` also requires both providers to be selected and validated; Codex-only success leaves Claude deferred and cannot open the overall release gate. A semantic PASS cannot override missing source-read evidence, invalid JSON, failed/missing required checks, out-of-scope changes, or incomplete provider execution.

Source, fixture, runner, configuration, CLI version, and Docker identity must remain frozen. Explicit resume validates the same inputs and preserves every attempted observation; only never-called slots can continue. An incomplete dispatch journal requires investigation rather than a guessed call count.

## Execution boundaries and limits

Provider CLIs execute on the host. Codex uses its sandbox and disabled multi-agent/web features; Claude receives allowed file tools. The shared prompt bounds access to the synthetic fixture. The host behavior checks of edited files execute separately in Docker. This does not mean all provider tool execution occurs in a container, nor that both CLIs expose identical tools.

Docker preflight establishes the official image's actual Node version/digest and isolation before provider inference. The container has no network, read-only root and fixture, a nonprivileged user, removed capabilities, and resource limits. No host home, credential store, or Docker socket is mounted. There is no less-isolated fallback.

Some CLI streams omit a returned model identity. The observation then records `explicit_cli_argument_only`, rather than asserting provider-side model verification. A different model in a structured top-level primary response stops execution. Aggregate `usageModels` and numeric `usageByModel` accounting are stored separately; their role is not guessed, and they cannot establish a primary-model mismatch. Source-loading observations can also be incomplete; positive selection without sufficient evidence remains `UNCLEAR`. Negative selection checks completed observable traces for unwanted loading, not the provider's private internal decisions.

Three repetitions describe these fixtures. They do not establish a general win rate, production safety, total time savings, or statistically reliable superiority. Label masking reduces explicit grading bias but cannot prevent an evaluator from inferring a version from response content.

## Historical evidence

Earlier 2026-09-07 observations identified unsupported repair claims in `rm-review`, observation/cause confusion in `rm-challenge`, guessed platform defaults in `rm-assess`, and omitted material uncertainty in `rm-brief`. Those observations concern earlier bytes and remain regression targets. They are not passes or measured failures of this revision and are not converted into v3.
