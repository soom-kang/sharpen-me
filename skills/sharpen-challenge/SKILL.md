---
name: sharpen-challenge
license: MIT
description: Test consequential assumptions about whether a proposed engineering approach can achieve its outcome, using evidence or a small distinguishing check. Use when the mechanism is uncertain; request meaning belongs to sharpen-clarify, execution budgeting to sharpen-assess, and concrete contract violations in a design or implementation to sharpen-review.
---

# Sharpen Challenge

Find the strongest supported reason a plan could fail and the smallest useful observation that would settle it. No supported blocking objection is a valid result.

## Inputs

Required: the proposed approach and intended outcome. Optional: constraints, contrary evidence, alternatives, and experiment budget. Default to read-only analysis; proposing a test grants no permission for its expense or external effects.

## Procedure

1. Identify assumptions whose failure would undermine the outcome, separating them from implementation preferences. Investigate the assumptions most likely to change the current decision first, within the supplied plan and constraints.
2. Inspect evidence for and against those assumptions. Relevant traps include an unverified premise, a plan's own explanation mistaken for evidence, an analogy that does not preserve the mechanism, reliance on a future result, and an implementation that contradicts its stated principle.
3. For empirical plans, additionally check whether validation has independent evidence and whether sampling or multiple comparisons support the claimed conclusion. Do not invent probabilities or required sample sizes.
4. Combine objections only when fixing their shared cause removes them all. Preserve other independently blocking issues. Do not manufacture an objection because the skill was invoked.
5. If a decisive contract or existing evidence settles the issue, explain it without a ceremonial experiment. Otherwise, or when the caller requests a test, specify input, controlled action, observation, and the result that supports or rejects the assumption. Check that each proposed verdict follows from its stated observation, and that the test can distinguish the competing explanations.
6. Execute only a useful check within existing authorization. Prefer a deterministic local counterexample or contract-consistent test double. Require external infrastructure only when local evidence cannot answer the question.

## Judgment rules

A result compatible with several mechanisms establishes none of them. Distinguish observations, explanations, and predictions; name a control that would separate competing causes. Absence is provisional while earlier work can still complete or become visible. A proposed remedy needs its own coordination, recovery, and compatibility evidence. Do not redesign or implement the plan as an implied follow-up.

## Output and stopping

Honor the caller's format. Otherwise give the consequential assumption, whether the available evidence supports it, refutes it, or leaves it unresolved, and any smallest informative test with its decision criterion and limits. No supported objection is not a guarantee for the whole plan. Include actual results only for executed checks.

Stop when the decision-relevant assumptions are resolved or their remaining evidence, budget, or authority gaps are explicit. Preserve independent blockers, but stop collecting evidence that cannot change the conclusion. State the limitation when no cheaper useful check exists. Do not change provider settings or deploy.

## Examples

- A plan assumes an index removes a bottleneck: inspect a representative query plan before proposing a service rewrite.
- Independent authorization and duplicate-charge failures: keep both; repairing one does not establish the other.
- "Will this cache strategy reduce latency?" belongs here; "Does this implementation violate the agreed cache invalidation contract?" belongs to sharpen-review, even if both questions concern the same design.
