# Design

Each skill defines a bounded procedure. Choose one for the task and set its edit permissions in your request. See [Usage](usage.md) for installation and examples.

## Responsibilities and boundaries

| Skill | Procedure | Completion |
| --- | --- | --- |
| `sharpen-clarify` | Resolve plausible readings from the request and repository | Ask about consequential unresolved choices; otherwise continue without a forced scope report |
| `sharpen-review` | Trace supported defects using relevant review perspectives | Report findings or a clean result; compare perspectives only if they change the conclusion |
| `sharpen-challenge` | Examine assumptions and distinguishing evidence | Retain independent blockers and separate observations from inferred causes |
| `sharpen-assess` | Separate change exposure, reasoning difficulty, and verification | Recommend capability and effort without changing the user's settings |
| `sharpen-refine` | Preserve code behavior and prose meaning within authorized edits | Report changes and checks |
| `sharpen-cold-review` | Establish isolation and choose the evidence boundary | Report bounded findings or `not_run` |
| `sharpen-brief` | Bound changed history by a baseline and include current blockers | Report relevant state without invented questions or a fixed follow-up offer |
| `sharpen-dedupe` | Distinguish shared behavior from ownership and action | Propose or perform authorized changes; `keep` intentional differences and `defer` missing evidence |

A review or challenge can find no defect. All eight skills allow automatic selection, but metadata alone does not prove that an agent selected or loaded one. Evaluation records explicit behavior and implicit selection evidence separately.

## Output and authorization

You control which files may change, the model settings, and the response format. Selecting a skill grants no extra permission. The default response is concise prose; a format you request takes precedence.

`sharpen-refine` can edit code blocks, tables, or authored text when your request authorizes those edits. Protected areas and unrelated changes stay intact. For `sharpen-dedupe`, proposing a shared owner does not authorize creating one: consolidation requires an implementation request.

`sharpen-assess` reports `change_risk`, `execution_advice`, `verification`, and `reassessment_triggers`. Unknown exposure calls for more evidence, not an automatic increase in model capability. A concrete model mapping needs a supplied or verified catalog; the skill does not pin vendor model names.

The original JSON evaluation cases require `decision`, `findings`, `evidence`, `limitations`, and `changes` with their existing types, and allow extra fields. This format applies to those cases, not every skill response.

## Fresh review modes

Use a separate context that excludes the author's verdict and persuasive rationale. Rereading the author conversation does not establish independence. An isolated host invocation is sufficient; no nested reviewer is required.

| Mode | Question | Permitted evidence |
| --- | --- | --- |
| `comprehension` | Does the document stand on its own? | The supplied artifact; neighboring documents must not fill its gaps |
| `code` | Is the code change correct? | Declared contracts, relevant baselines, callers, and validation within permitted paths |

An explicit mode wins. Otherwise, choose `code` for code correctness and `comprehension` for a document cold read. Ask only when mixed purposes need different evidence and the request leaves that choice open. Report `not_run` if context isolation is unavailable.

## Distribution and maintenance

Each `skills/<name>/` contains `SKILL.md`, Codex metadata, and the complete MIT license. The procedures do not assume provider-specific agent tools or require a runtime service or production dependency. License notices and automatic selection policies remain intact.

Use Node.js 24.20.0 for development, CI, and fixture checks. The installation minimum is 24.20.0. See [Maintenance](maintenance.md) for checks and publication procedures.

## Evaluation

See [Evaluation](evaluation.md) for the current counts, contract revision, and acceptance criteria. Provider CLIs run on the host. Host behavior checks of edited files run in a separate Docker container; that boundary does not cover the provider's whole session.
