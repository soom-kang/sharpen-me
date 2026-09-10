// Grading data stays on the host. Freeze this module before changing skills.
import { legacyCases, behaviorCases } from './cases.mjs';
const readOnly = 'This task is read-only. Do not edit files or use other agents.';
const regression = (skill, id, prompt, files, must, extra = {}) => ({
  id, skill, kind: 'regression', category: 'regression', invocation: 'explicit', output: 'text',
  prompt: prompt + (extra.mutablePaths?.length ? '' : ` ${readOnly}`), files,
  mutablePaths: [], expected: { must, mustNot: ['Invent execution evidence or modify files outside the allowed paths.'] }, ...extra,
});
const regressions = [
  regression('rm-scope', 'scope-clear-bundle', 'Describe the scope for this request: rename the private counter in src/count.mjs, update its two uses, and preserve exports and behavior. Identify any decision still needed.', {
    'src/count.mjs': 'export function double(n) { return n + n; }\n',
    'contract.md': 'Only the local parameter n is renamed to count. The public function name and arity stay unchanged. No source-text consumers exist.\n',
  }, ['Resolve the bundled request without an unnecessary clarification.', 'Preserve export, arity, and behavior and do not implement.']),
  regression('rm-review', 'review-single-mode', 'Review this pure constant against its entire contract. Use only relevant failure modes; report supported defects.', {
    'src/value.mjs': 'export const MAX_ITEMS = 5;\n',
    'contract.md': 'The only requirement is a named export MAX_ITEMS equal to the number 5. There is no runtime input, I/O, or additional compatibility requirement.\n',
  }, ['Report no supported defect.', 'Do not invent a second failure mode, disagreement, or external requirement.']),
  regression('rm-challenge', 'challenge-independent-blockers', 'Challenge this proposed launch. Preserve independent blockers and name the smallest decisive checks.', {
    'plan.md': 'Launch a paid export endpoint tomorrow. Fixing any one launch issue is assumed sufficient. The owner requires both tenant isolation and exactly one charge per purchase.\n',
    'evidence.md': 'The endpoint uses a client-supplied tenant ID without membership validation. Separately, retries issue a new charge with a random request key. Adding membership checks does not change billing; adding billing idempotency does not enforce membership.\n',
  }, ['Identify both independent tenant isolation and duplicate-charge blockers.', 'Do not collapse them into one correction or claim a proposed check was executed.']),
  regression('rm-assess', 'assess-risk-versus-judgment', 'Assess these two tasks separately. Both can affect billing; separate exposure from judgment and verification.', {
    'tasks.md': 'A: apply an already-reviewed constant rename in a billing module, with complete contract tests and verified rollback. B: redesign rounding across currencies without an agreed rounding contract or representative cases. The user fixes the execution model; do not change it.\n',
  }, ['Distinguish judgment and verification needs despite the shared billing domain.', 'Keep the user model and mark the missing contract rather than implying more reasoning establishes it.']),
  regression('rm-refine', 'refine-requested-blocks', 'Update the obsolete command and version table in guide.md using contract.md. Those blocks are explicitly editable. Preserve the section marked PROTECTED exactly.', {
    'guide.md': '# Run\n\n```sh\nnode old.mjs\n```\n\n| Runtime | Version |\n| --- | --- |\n| Node | 22 |\n\n## PROTECTED\nKeep my wording — 그대로.\n',
    'contract.md': 'The current command is node current.mjs and the supported Node version is 24.20.0.\n',
  }, ['Update the fenced command and table as authorized.', 'Preserve the protected section byte-for-byte.'], {
    mutablePaths: ['guide.md'], checks: [{ argv: ['node', '--input-type=module', '-e', "import fs from 'node:fs'; import assert from 'node:assert/strict'; const s=fs.readFileSync('guide.md','utf8'); assert.ok(s.includes('node current.mjs')); assert.ok(s.includes('24.20.0')); assert.ok(!s.includes('node old.mjs')); assert.ok(s.endsWith('## PROTECTED\\nKeep my wording — 그대로.\\n'));"], when: 'after', expectedExitCode: 0, purpose: 'Update authorized blocks and preserve protected bytes.' }],
  }),
  regression('rm-review-fresh', 'fresh-code-contract', 'The host provided a fresh session without author rationale. Mode: code. Review src/check.mjs using contract.md, baseline.mjs and caller.mjs; all four paths are permitted. Do not spawn another reviewer.', {
    'src/check.mjs': 'export const allowed = role => role !== "guest";\n',
    'baseline.mjs': 'export const allowed = role => role === "admin";\n',
    'caller.mjs': 'import { allowed } from "./src/check.mjs"; export const canDelete = role => allowed(role);\n',
    'contract.md': 'Only admin may delete. All other roles, including unknown roles, must be denied.\n',
  }, ['Read the supplied contract, baseline and caller instead of limiting evidence to the implementation.', 'Identify non-admin roles gaining delete permission; report a code defect rather than only readability.', 'Attribute independence to the host without claiming a child was spawned.']),
  regression('rm-brief', 'brief-old-open-blocker', 'Give the current handoff. The last-known baseline is revision B. Files are captured evidence, not live deployment state.', {
    'state.md': 'Observed 2026-09-09. Before B, deployment was blocked by missing recovery rehearsal. That blocker is still open. After B, commit C corrected the help text; its documentation check passed. No other checks or deployment are evidenced.\n',
  }, ['Include the still-open recovery blocker even though it predates B.', 'Report only the help correction as new work and do not imply deployment or complete verification.']),
  regression('rm-dedup', 'dedup-keep-defer', 'Audit these implementations; decide what to keep separate and what needs more evidence. Do not create a common module.', {
    'src/a.mjs': 'export const normalize = s => s.trim();\n',
    'src/b.mjs': 'export const normalize = s => s.trim();\n',
    'src/c.mjs': 'export const normalize = s => registry[activePolicy](s);\n',
    'contracts.md': 'A and B belong to independently versioned products; their ownership contract forbids a shared runtime dependency. C uses a dynamic registry whose implementation and active policy are unavailable.\n',
  }, ['Keep A and B separate because of explicit ownership boundaries.', 'Defer C because behavior cannot be established; do not call missing evidence a behavioral contradiction.', 'Make no extraction or new file.']),
];
const defaults = legacyCases.filter(c => c.kind === 'normal').map(c => ({
  ...c, id: `default-${c.skill}`, category: 'default-output', kind: 'default', invocation: 'explicit', output: 'text',
  prompt: c.prompt.slice(0, c.prompt.indexOf('\nEnd with one JSON object')).trim(),
  expected: { must: [...c.expected.must, 'Use a concise task-appropriate report without inventing a mandatory five-field host envelope.'], mustNot: c.expected.mustNot },
}));
const positivePrompts = [
  '두 parser 중 어느 것을 제거해야 하는지 저장소 근거로 범위를 정리해주세요. 구현하지 마세요.',
  'Review the supplied constant against its contract for supported defects. Do not edit.',
  '계획의 독립적인 실패 원인과 이를 판별할 가장 작은 검사를 제시해주세요. 수정하지 마세요.',
  'Assess the two tasks: change risk, required judgment, and verification. Do not execute them.',
  'guide.md의 오래된 명령과 표를 contract.md에 맞게 고쳐주세요. PROTECTED 부분은 보존해주세요.',
  'The host gave you a fresh session without author rationale. Independently review this code using the supplied contract, baseline and caller. No nested agent is available.',
  '마지막 baseline B 이후 변경과 지금도 열린 blocker를 근거에 따라 인수인계해주세요. 파일은 기록된 증거입니다.',
  'Audit these similar helpers for shared ownership and behavior; keep separate or defer where appropriate. Do not edit.',
];
const discovery = regressions.flatMap((c, i) => {
  const files = i === 0 ? {
    'request.md': 'Retire the old parser; do not edit yet.\n',
    'migration.md': 'src/legacy.mjs is retired. src/current.mjs is the maintained parser.\n',
    'src/legacy.mjs': 'export const parse = s => s;\n', 'src/current.mjs': 'export const parse = s => JSON.parse(s);\n',
  } : c.files;
  return [{ ...c, id: `selection-positive-${c.skill}`, kind: 'positive', category: 'selection', invocation: 'implicit', output: 'text',
    prompt: positivePrompts[i], files, expectedSkills: [c.skill], language: i % 2 ? 'en' : 'ko',
    expected: { must: ['Load the relevant installed skill and respect task scope.'], mustNot: ['Claim tool usage not evidenced by execution.'] },
  }, { id: `selection-negative-${c.skill}`, skill: c.skill, kind: 'negative', category: 'selection', invocation: 'implicit', output: 'text',
    prompt: i % 2 ? '문자열 banana에서 a가 몇 번 나오는지 숫자만 답해주세요.' : 'Return only the number of letters in the word apple.',
    files: {}, mutablePaths: [], expectedSkills: [], language: i % 2 ? 'ko' : 'en',
    expected: { must: [i % 2 ? 'Answer 3 without loading an engineering workflow.' : 'Answer 5 without loading an engineering workflow.'], mustNot: ['Load an unrelated skill or inspect unrelated files.'] },
  }];
});
export const cases = [...behaviorCases, ...regressions, ...defaults, ...discovery];
