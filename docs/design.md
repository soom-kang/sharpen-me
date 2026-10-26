# Design

Each skill defines a bounded procedure. Choose one for the task and set its edit permissions in your request. See [Usage](usage.md) for installation and examples.

## Responsibilities and boundaries

| Skill | Question | Completion |
| --- | --- | --- |
| `sharpen-clarify` | What outcome and scope does the request mean? | Resolve the interpretation or ask about the blocking choice; return to a larger authorized task when resolved |
| `sharpen-review` | Does this change or design violate a relevant contract? | Report bounded findings or no supported defect; distinguish any authorized fixes and their checks |
| `sharpen-challenge` | Does the evidence support the plan's mechanism? | Resolve decision-relevant assumptions or identify the smallest missing evidence, preserving independent blockers |
| `sharpen-assess` | What capability, reasoning effort, and verification does this task need? | Give advice with exposure assessed separately, or identify what prevents it; leave settings unchanged |
| `sharpen-refine` | How can the scoped artifact improve while preserving its contracts and intent? | Verify the authorized improvement or explain a no-op; stop dependent edits at a behavior or scope boundary |
| `sharpen-cold-review` | Does the artifact hold up without the author's explanation? | Complete one isolated review, report insufficient permitted evidence, or report `not_run` if isolation is unavailable |
| `sharpen-brief` | What is the current state, and which decisions or blockers remain? | Provide an evidenced delta or snapshot with verification limits; do not resolve product decisions |
| `sharpen-dedupe` | Which implementations can share behavior and ownership? | Finish the bounded audit or authorized consolidation; distinguish proposed actions from actual migrations |

A review or challenge can find no defect. All eight skills allow automatic selection, but metadata alone does not prove that an agent selected or loaded one. Evaluation records explicit behavior and implicit selection evidence separately.

Choose by the question, not the file type or file count. A design can need either a contract review or an assumption challenge. An internal helper extraction with settled ownership fits refine; deciding equivalence and a shared owner fits dedupe. A routine status answer or grammar-only edit does not require this suite's repository workflow.

Neighboring skill names explain selection boundaries; they are not installation dependencies or an automatic execution chain. Use the procedure needed for the user's request, and hand back to the caller once it is complete. A clarification-only request ends after interpretation; a resolved clarification inside an authorized implementation request does not require another approval.

## Output and authorization

You control which files may change, the model settings, and the response format. Selecting a skill grants no extra permission. The default response is concise prose; a format you request takes precedence.

`sharpen-refine` can edit code blocks, tables, or authored text when your request authorizes those edits. It preserves code behavior and the author's requirements, decisions, and uncertainty; it corrects inaccurate documentation claims against governing sources rather than preserving known errors. Protected areas and unrelated changes stay intact. For `sharpen-dedupe`, proposing a shared owner does not authorize creating one: consolidation requires an implementation request.

`sharpen-assess` separates `change_risk`, `execution_advice`, `verification`, and material `reassessment_triggers`. Unknown exposure calls for more evidence, not an automatic increase in model capability. High stakes alone do not justify `exhaustive`: deeper exploration needs a specific reasoning problem that could change the decision. Small tasks can receive a few sentences instead of four report sections. Provider mapping is optional, only when requested and supported by a supplied or verified catalog; the skill does not pin vendor model names.

`sharpen-dedupe` separates observed semantics from required behavior and ownership. `divergent` records a demonstrated difference without asserting intent; `partial` identifies a proven reusable portion while preserving the rest. Unresolved intent leads to `defer`, established conflicting requirements to `reconcile`, and justified separation to `keep`. `reference` covers caller or entry-point migration followed by covered copy removal; `dedupe` removes a redundant copy when no such migration is needed. An observed difference does not authorize fixing it.

The original JSON evaluation cases require `decision`, `findings`, `evidence`, `limitations`, and `changes` with their existing types, and allow extra fields. This format applies to those cases, not every skill response.

## Fresh review modes

Use a separate context that excludes the author's verdict and persuasive rationale. Rereading the author conversation does not establish independence. An isolated host invocation is sufficient; no nested reviewer is required.

| Mode | Question | Permitted evidence |
| --- | --- | --- |
| `comprehension` | Does the document stand on its own? | The supplied artifact; neighboring documents must not fill its gaps |
| `code` | Is the code change correct? | Declared contracts, relevant baselines, callers, and validation within permitted paths |

An explicit mode wins. Otherwise, choose `code` for code correctness and `comprehension` for a document cold read. Ask only when mixed purposes need different evidence and the request leaves that choice open. Report `not_run` if context isolation is unavailable.

The neutral handoff identifies the artifact and workspace, mode and audience, review question, permitted evidence, code baseline/contracts when available, and actual isolation provenance. A handoff's assertion does not itself prove isolation. The example in [sharpen-cold-review](../skills/sharpen-cold-review/SKILL.md) needs no new file or provider-specific configuration. Long comprehension reports may group repetition, but retain the literal actions and signal meanings needed for the reader's task.

## Distribution and maintenance

Each `skills/<name>/` contains `SKILL.md`, Codex metadata, and the complete MIT license. The procedures do not assume provider-specific agent tools or require a runtime service or production dependency. License notices and automatic selection policies remain intact.

Use Node.js 24.20.0 for development, CI, and fixture checks. The installation minimum is 24.20.0. See [Maintenance](maintenance.md) for checks and publication procedures.

## Evaluation

See [Evaluation](evaluation.md) for the current counts, contract revision, and acceptance criteria. Provider CLIs run on the host. Host behavior checks of edited files run in a separate Docker container; that boundary does not cover the provider's whole session.

The evaluator separates observed Skill access from complete source loading. Structural selection checks consume the retained access/completion facts before semantic grading. Observations are redacted before JSON serialization. The dispatch journal serializes reservation writes and the final start gate while provider calls remain concurrent; a post-start failure keeps the attempt recorded. See the [local QA fixes](qa-2026-10-12.md) for regression coverage and remaining execution limits.
