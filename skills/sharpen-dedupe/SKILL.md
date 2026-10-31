---
name: sharpen-dedupe
license: MIT
description: "Audit repeated implementations for behavioral equivalence, ownership, and whether to consolidate; perform consolidation only when authorized. Use for duplicate or copy-pasted code, similar helpers across modules, or deciding whether to unify or share an implementation (중복 코드, 공통화, 통합 여부). A scoped internal cleanup with ownership already settled belongs to sharpen-refine; exclude document SSOT and behavior-changing unification."
---

# Sharpen Dedupe

Similar syntax does not establish shared behavior or ownership. Default to read-only audit; consolidation requires existing authorization for its scope.

## Inputs

Required: suspected duplicates or a bounded search area. Optional: callers, contracts, allowed paths, tests, and consolidation authorization.

## Procedure

1. Find occurrences and callers using complementary language-appropriate evidence: search, imports, symbol references, registrations, or tests. Declare the search boundary and unresolved dynamic references. Exclude installed agent instructions, such as `SKILL.md` files and skill or agent configuration directories, unless they are the audit target; hidden-file or repository-wide searches need explicit exclusions rather than reading those bodies.
2. Compare observable inputs, outputs, errors and their order, effects and their count, mutation, async ordering, dependencies, public interfaces, and persisted shapes. Assign semantic labels:
   - `identical`: same text and established observable behavior
   - `equivalent`: different text with established equivalent observables
   - `partial`: a proven reusable portion overlaps, while the whole implementations differ
   - `divergent`: an observable difference is established, without a proven reusable portion; this says nothing about whether the difference is intended
   - `unknown`: evidence cannot establish the relationship
3. Assess required behavior, ownership, and dependency direction independently of semantics. Establish whether observed differences are required, accidental, or unresolved; do not infer intent from a difference or silently fix it. Same behavior in separate domains need not share a runtime dependency. Do not cross trust or permission boundaries without confirmation.
4. Propose an existing maintained owner, or a new owner at a natural boundary only if sharing is justified. In an audit, do not create it. Record unique behavior that must survive and evidence needed before extraction.
5. Assign each non-owner an action separately from its semantic label:
   - `dedupe`: remove a redundant copy when the owner already covers the required behavior and no caller or entry-point migration is needed
   - `reference`: migrate callers or entry points to the owner, then remove covered copies while preserving required behavior and compatibility paths
   - `reconcile`: incompatible requirements require an owner's decision
   - `keep`: retain an intentional difference or ownership boundary
   - `defer`: postpone judgment or consolidation until specified evidence exists
6. Missing evidence is not a contradiction. Use `defer` for unknown semantics or unresolved intent, `keep` for justified separation, and `reconcile` only for established conflicting requirements. Partial overlap may share only the proven portion while preserving caller-specific behavior. Classify at that boundary instead of calling the whole implementations equivalent.
7. If consolidation is authorized, report the map and plan, then execute without asking for the same permission again. Fold unique required behavior into the owner before removing copies. Preserve necessary re-exports or aliases so reachable paths remain usable.
8. Make located edits, verify replacement targets, and use language-aware tools or a reviewed script for structural moves. Preserve unrelated user work. Run relevant success and failure checks and inspect callers, orphaned references, dependency direction, and the final diff.

## Output and stopping

Honor the caller's format. Otherwise use a short table or a few paragraphs identifying the compared locations, their semantic relationship, the proposed action and its evidence. An audit ends with the owner proposal and material gaps; an authorized consolidation also reports callers actually migrated, retained exceptions, and executed checks. The procedure steps are reasoning steps, not required report sections. Distinguish proposed edits from actual edits. A justified no-op may be reported in a few sentences.

Stop after the bounded audit or verified authorized change; do not extend a local comparison into a repository-wide duplicate search. Stop dependent edits for missing evidence, conflicting requirements, or scope expansion. Do not imply universal equivalence from finite checks or alter public contracts, add production dependencies, commit, or deploy as incidental deduplication.

## Examples

- Identical parsers owned by independent products stay separate when their dependency contract forbids sharing.
- A dynamic registry is unavailable: report `unknown` plus `defer`, not a guessed merge or invented conflict.
- Two helpers differ on empty input and the intended behavior is undocumented: record the demonstrated difference and `defer` consolidation, rather than treating either implementation as the required one.
- Moving callers to a shared parser and removing their local copies is `reference`; removing an unused copy with no caller migration is `dedupe`, after checking entry points.
- Simplifying repetition inside a function with settled contracts and ownership belongs to sharpen-refine; the number of files alone does not decide the skill.
