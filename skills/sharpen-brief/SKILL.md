---
name: sharpen-brief
license: MIT
description: Restore current project state, open blockers, and pending decisions after a gap or handoff. Use a verified baseline for changes since then, or a current snapshot when none exists. Routine progress updates need no briefing workflow; resolving a requirement or challenging a plan is a separate task.
---

# Sharpen Brief

Give the reader enough current context to act without remembering an earlier session. Report outcomes and evidence rather than the agent's activity.

## Inputs

Required: project or run scope and accessible evidence. Optional: last-known revision, run, date, prior decision, audience, and length. Default to a concise read-only briefing. Without a reliable baseline, provide a current snapshot rather than inventing a history.

## Procedure

1. Read relevant project instructions and choose the evidence boundary: verify a supplied or clearly established last-known baseline for a delta, otherwise provide a current snapshot. Do not search indefinitely for a missing baseline. Neither mtime nor commit date establishes when the reader understood the project.
2. Start with supplied evidence and maintained current-state sources, then inspect only the relevant status, diffs, commits, or run results needed to support the account. Memory may locate evidence but cannot prove current completion. Verify material changeable claims against their owning source when accessible within scope; otherwise report the captured observation date and the missing current check. Respect supplied archives as captured state, not live state.
3. Use the baseline only to identify new changes. Include currently open blockers, risks, and unresolved decisions even when they predate it. Do not repeat old completed work as new.
4. Separate verified outcomes, pending work, blocked checks, and decisions. Local tests are not deployment or authenticated verification; a passing run proves its recorded checks, not every possible requirement. A recorded blocker need not be the only one.
5. Reconcile contradictory sources or state the conflict. Put uncertainty next to the conclusion it qualifies.
6. Lead with decisions the reader actually needs to make. If none exists, lead with the relevant status rather than manufacturing an ask. Explain unfamiliar terms briefly on first use and give the next action only when supported.

## Output and stopping

Follow the caller's format through the end of the response. If it requires a final JSON object or another machine-readable value, add no prose after it. Otherwise give a short, source-linked briefing: decisions or current status, meaningful changes since the baseline, still-open blockers, and material verification limits. Explain new terminology only where needed. Attach observation dates to status that may go stale. Do not force JSON fields, a glossary, or per-section expansion offers.

Stop once the reader can distinguish current outcomes, open blockers, required decisions, and material verification limits, or unavailable evidence prevents a reliable account. State missing sources instead of broadening indefinitely. Report decisions that remain; resolving them or testing a plan is a separate task, not an automatic follow-up. Do not edit, choose product policy, send messages, or create monitoring jobs.

## Examples

- Since revision B a help text changed, while an earlier recovery blocker is still open: report the change and retain that blocker.
- Recent mtimes but no baseline: report current evidenced state without claiming changes occurred while the reader was away.
- "Tell me whether the test just run passed" needs a direct status answer, not a historical briefing. A captured deployment success without current access is a dated observation, not verified live health.
