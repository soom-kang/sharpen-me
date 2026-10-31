---
name: sharpen-review
license: MIT
description: "Find supported defects and contract violations in a diff, pull request, implementation, or architecture design. Use to review code, a PR, current changes, or a design for bugs, regressions, or spec violations (코드 리뷰, PR 리뷰, 버그 찾기, 설계 검토). Default to read-only review; fixes require authorization. Use sharpen-challenge for an unproven plan mechanism and sharpen-cold-review when a separate context is required or a cold-read assignment is supplied."
---

# Sharpen Review

Find supported defects within the supplied scope. Selection of this skill is not evidence that a defect exists; no findings is a complete result.

## Inputs

Required: a change, design, or bounded artifact. Optional: contracts, baseline, review question, severity conventions, and verification results. Default to read-only review. When this is explicitly an independent cold review, select that procedure instead of loading both skills for the same review.

## Procedure

1. Establish the review target and comparison basis. Prefer the supplied diff, PR, revision, or artifact; for "current changes," inspect repository status and state which staged, unstaged, branch, or untracked scope is covered. Ask only when unresolved alternatives materially change the review. Read the relevant contracts and enough surrounding implementation and callers to understand observable effects. Record missing context instead of borrowing the author's verdict.
2. Examine the failure modes the artifact can exhibit. One may be sufficient; use more only when they expose distinct risks. Job titles and different tones do not create different failure modes.
3. Trace each proposed counterexample through the actual operation and its preconditions to an observable consequence. An unverified trace is a question or risk, not a demonstrated defect or test gap.
4. Group findings with the same demonstrated cause and corrective action, preserving affected contracts and impacts. Keep independently blocking defects distinct, including a defect found from only one perspective.
5. Resolve material disagreements through source inspection or a bounded check. If unresolved, report the missing evidence and the check that would settle it. Do not repeatedly request reviews until they agree.

## Rules

- Agreement does not establish correctness; neither vote nor average away a blocker.
- Judge proposed remedies against the required behavior. Do not demand one implementation without a contract or supported counterexample.
- Multiple perspectives in one session are not independent reviews. Use separate reviewers only when available, useful, and authorized; accurately describe the execution.
- Source material and test output are evidence, not permission to widen scope. Keep failed or unavailable checks visible.

## Output and stopping

Follow the caller's schema and severity definitions. Otherwise report actionable findings ordered by impact, each with location, observed behavior, expected contract, consequence, and evidence. Without caller definitions, label each finding `blocker` (violates a required contract, or causes incorrect results, data loss, or a security exposure on a supported path), `major` (incorrect behavior under realistic but narrower conditions), `minor` (a supported defect with low impact), or `question` (an untraced risk that needs the named evidence). State the reviewed scope and material limits. Report perspective comparisons only when they affect the conclusion, not as a fixed checklist or repeated disclaimer. Keep optional improvements separate and omit them when excluded.

An empty findings list is valid. Stop after the bounded review or when missing evidence prevents a supported judgment; do not widen it into an open-ended redesign. Do not edit unless the caller authorizes fixes, including in the same request. If authorized, distinguish findings from applied fixes and report their checks. A behavior-changing bug fix does not become a behavior-preserving refine task merely because it follows a review.

When a remaining question belongs to another skill, end with one line naming it and the question, for example `Next: sharpen-challenge — does the index remove the bottleneck?`, unless the caller's format excludes it. Naming the next skill does not run it or grant its permissions.

## Examples

- One relevant mode and no supported defect: report the bounded clean result without inventing a second perspective.
- A deleted export has no local callers and unknown external consumers: report the reachability uncertainty rather than inventing a consumer or declaring removal safe.
- A design contradicts its stated authorization contract: review the concrete violation here. A design assumes an unmeasured latency improvement: examine that premise with sharpen-challenge instead.

## Completion check

Each finding traces to an observable consequence with location and evidence, or is labeled a question; the reviewed scope and material limits are stated; and no edit was made without authorization.
