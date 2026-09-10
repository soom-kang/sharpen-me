# Design

sharpen-me distributes eight independent Skill directories for Claude Code and Codex. The caller owns scope, permissions, model settings, and response format. Selecting a Skill grants no additional permission.

## Responsibilities and boundaries

| Skill | Decision procedure | Completion |
| --- | --- | --- |
| `sharpen-clarify` | Resolve plausible misreadings using the request and repository evidence | Ask about an unresolved consequential choice; otherwise continue without a forced scope report |
| `sharpen-review` | Choose relevant review perspectives and trace supported defects | Report findings, or a clean result; compare perspectives only when they change the conclusion |
| `sharpen-challenge` | Test assumptions, counterarguments, evidence, and distinguishing observations | Keep independent blockers; separate observed behavior from inferred causes |
| `sharpen-assess` | Separate exposure, reasoning difficulty, and verification | Recommend capability and effort without changing the user's choice |
| `sharpen-refine` | Preserve behavior in code and meaning in prose within authorized edits | Report actual changes and checks; explicitly requested blocks and tables are editable |
| `sharpen-cold-review` | Select comprehension or code review and establish genuine isolation | Report bounded findings or `not_run` when isolation is unavailable |
| `sharpen-brief` | Bound new history by a baseline, but include all current blockers | Report relevant current state without invented questions or a fixed follow-up offer |
| `sharpen-dedupe` | Separate semantic similarity from an appropriate action | Propose or execute authorized deduplication; use `keep` for intentional separation and `defer` for missing evidence |

## Output and authorization

Default output is concise prose appropriate to the task. Caller schemas take precedence; there is no universal five-field evaluation host in a Skill's contract. The original JSON evaluation cases still require `decision`, `findings`, `evidence`, `limitations`, and `changes`, with their existing types. Additional JSON fields remain allowed.

`sharpen-assess` retains `change_risk`, `execution_advice`, `verification`, and `reassessment_triggers` as report fields. `unknown` exposure calls for evidence, not an automatic capability increase. Concrete model mappings require a supplied or verified catalog. Skill instructions do not pin vendor model names.

All eight Skills retain automatic selection. Metadata advertises when to use them; it does not establish that a provider selected or loaded one. A review or challenge may legitimately find no defect. The evaluation separately records explicit behavior and implicit selection evidence.

In `sharpen-refine`, an explicit request can authorize changes to code blocks, tables, or authored content. Separately protected areas and unrelated user changes remain protected. In `sharpen-dedupe`, an audit may propose a new owner; creating it requires an authorized implementation step. A semantic label does not itself require consolidation.

## Fresh review modes

An explicit mode wins. A code-change correctness review uses `code`; a document cold read uses `comprehension`. Ask only when mixed purposes would change the evidence boundary and the request does not decide.

Comprehension assesses the supplied artifact's own usability; neighboring documents must not fill its omissions. Code review can read declared contracts, relevant baselines, callers, and validation evidence within permitted paths. Both exclude the author's verdict and persuasive rationale. A genuinely isolated host invocation needs no nested reviewer. Rereading the author conversation never establishes independence.

## Distribution and maintenance

Each `skills/<name>/` directory contains `SKILL.md`, Codex metadata, and a complete MIT license. The rename changes names and paths; license notices and automatic selection policies are preserved. The [name mapping](rename.md#names) documents the transition. Common procedures do not assume provider-specific agent tools. There is no added runtime service or production dependency.

Development, CI, and fixture checks use Node 24.20.0; the supported installation minimum is 24.20.0. [Maintenance](maintenance.md) describes verification and publication boundaries.

## Evaluation

The schema v3 matrix compares the complete installation units at `87b2e06`, normalized to the current names, with frozen current units: 48 cases, two providers, two versions, and three repetitions, totaling 576 calls for both providers. Contract revision 4 selects both Codex and Claude Code, for 576 planned calls. Primary-response model identity is checked separately from aggregate usage models; selected-provider success does not certify both providers. Behavior, natural output, and automatic selection are reported separately. The 16 original behavior cases retain their meanings and expected facts.

Host provider CLIs execute outside Docker. The host's behavior checks of model-edited files execute in an isolated Node 24.20.0 container. This container is not a claim that the provider's entire tool session is containerized. [Evaluation](evaluation.md) specifies evidence, accounting, and limitations. The current contract revision is 4. Older contracts remain historical records and cannot be resumed or mixed into the new comparison.
