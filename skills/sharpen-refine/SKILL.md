---
name: sharpen-refine
license: MIT
description: "Make authorized behavior-preserving code improvements or source-backed technical documentation corrections, including commands and tables. Use to refactor, clean up, simplify, or extract a helper without changing behavior, or to correct outdated commands, versions, or tables in technical docs (리팩터링, 코드 정리, 단순화, 기술 문서 수정). Use sharpen-dedupe when equivalence or shared ownership across implementations must be decided. Pure wording or grammar work belongs to a writing skill; exclude feature work, behavior-changing fixes, and unrelated cleanup."
---

# Sharpen Refine

Improve the requested artifact while preserving required behavior and the author's intent. For documentation corrections, preserve requirements, decisions, and uncertainty while correcting inaccurate claims against governing sources. A justified no-op is successful.

## Inputs and mode

Required: target and requested improvement. Optional: allowed paths, protected regions, contracts, canonical sources, and validation commands. Use code mode for behavior-preserving refactors and documentation mode for explicitly in-scope technical documents. Ask only when the request leaves a material behavior or scope decision unresolved.

An internal helper extraction with settled contracts and ownership fits here. Deciding whether separate implementations are equivalent or should acquire a shared owner belongs to sharpen-dedupe; file count alone does not decide. A writing skill may help an authorized documentation edit, but none is a required dependency.

## Procedure

1. Read the target, project instructions, and current changes. Identify protected regions and unrelated user work. Adjacent files may supply evidence without becoming editable.
2. Establish invariants. Code includes relevant returns, errors, effect counts, ordering, public interfaces, and persisted shapes. Documents include requirements, decisions, uncertainty, provenance, and intended audience.
3. Make the smallest revision serving the request using existing conventions. Remove obsolete scaffolding, superseded deltas, redundant narration, or retired content only where the request covers them; retain history when it is the artifact's purpose or necessary evidence.
4. In documentation, verify changed claims against governing sources. Explicitly requested changes to fenced code, commands, tables, quotations, or user-authored text are allowed. Preserve their unaffected formatting and every separately protected region. Authorship alone does not prohibit an authorized edit.
5. For prose-only cleanup, leave formatted blocks unchanged unless correcting them is also requested. Preserve deliberate examples and look-alikes. Do not convert an unresolved decision into fact.
6. Use precise located edits; verify targets exist and report a missed replacement. Use a language-aware tool or a reviewed script for complex moves. Preserve unrelated bytes, Unicode, and line endings; avoid blanket replacements.
7. Run the smallest meaningful existing checks for the changed behavior or claims, then inspect the final diff and references. Broaden verification only for a failure, new change, or unresolved concern; do not add test scaffolding for a prose-only revision. In documentation mode, reread the complete affected document in context to catch stale explanations and broken references outside the edited lines. Do not alter tests to conceal behavior changes. Report unavailable or failed checks accurately.

## Output and stopping

Use the caller's format. Otherwise report the actual improvement, why it meets the request, executed checks, and material limits. Explain a no-op without creating changes.

Stop after the requested improvement is verified, or after establishing that no change is useful. Stop only the dependent part when it requires a behavior change, excluded files, missing evidence, or separate approval; do not expand into neighboring cleanup. Describe partial edits accurately and preserve existing work. Do not create extra files unless the authorized improvement requires and permits them. Authorization does not imply commit, push, deployment, secrets, or production-setting changes. In read-only contexts return a proposal.

## Examples

- Extract an internal helper while preserving error behavior and call order, then run existing module checks.
- Correct a requested command and version table while preserving an explicitly protected paragraph byte-for-byte.
- Compare parsers across services to decide a common owner with sharpen-dedupe. Use a writing skill for a grammar-only request without repository claims to reconcile.
