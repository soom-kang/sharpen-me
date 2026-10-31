// Approved bounded evaluation of the post-beta.8 skill revisions, with a
// no-skill control arm. Expected facts never enter provider prompts.
import { cases as beta7 } from './focused-beta7.mjs';

export const plan = {
  id: 'focused-next-2026-10-31', tag: null,
  commit: '863450fc861d392bc94c08ca6c778a5b395c8761',
  maxCalls: 40, pilotCalls: 4, managementBudgetUsd: 10, timeoutMs: 180000,
  priorDiagnostic: { ids: [], attemptedCalls: 0, apiEquivalentUsd: 0 },
  isolationRevision: 3,
  providers: { codex: { model: 'gpt-6-sol', effort: 'medium' }, claude: { model: 'claude-opus-5-5', effort: 'low' } },
  pricing: {
    asOf: '2026-10-26', unit: 'USD per million tokens; API equivalent, not a subscription bill',
    codex: { input: 2, cacheRead: 0.2, cacheWrite: 2.5, output: 10, source: 'https://developers.openai.com/api/docs/models/gpt-6-sol' },
    claude: { input: 4, cacheRead: 0.2, cacheWrite: 5, cacheWriteLong: 8, output: 20, source: 'https://platform.claude.com/docs/en/models/opus-5-5/overview' },
  },
  // The control arm runs the same prompt without installed skills. Selection
  // negatives and the isolation-specific cold review have no control meaning.
  control: ['d5-ownership-unknown', 'r2-plan-premise', 'r5-settled-cleanup', 'b1-brief-delta', 'b2-brief-snapshot',
    'c1-cold-comprehension', 'p1-review-severity', 'p2-challenge-next'],
};
const define = (id, skill, prompt, files, must, extra = {}) => ({
  id, skill: `sharpen-${skill}`, kind: 'focused', category: 'behavior', invocation: 'explicit', output: 'text',
  language: 'ko', prompt: `${prompt}\n한국어로 답하세요. 별도 허용이 없는 한 읽기 전용이며 파일 수정과 다른 에이전트 호출은 금지합니다.`,
  files, mutablePaths: [], expected: { must, mustNot: ['Invent evidence, execute the assessed operation, or change files outside mutablePaths.'] }, ...extra,
});
// Near-miss requests that a sharpen skill could plausibly but wrongly claim.
const negative = (id, prompt, files, must) => define(id, 'none', prompt, files, must,
  { skill: 'none', category: 'selection', invocation: 'implicit', expectedSkills: [] });
const reused = id => beta7.find(c => c.id === id);

export const cases = [
  // The first case has a control arm, so the four-call pilot covers both arms.
  reused('r2-plan-premise'),
  reused('d5-ownership-unknown'),
  reused('r5-settled-cleanup'),
  negative('n1-grammar-only', '다음 문장의 맞춤법과 띄어쓰기만 고쳐서 한 줄로 돌려주세요: "설정을 변경 할수 있읍니다."', {
    'README.md': '# Demo\n',
  }, ['Return the corrected sentence (설정을 변경할 수 있습니다.) directly.', 'Do not start a repository review, clarification, or refinement workflow for a grammar-only request.']),
  negative('n2-test-status', '방금 실행한 테스트 결과가 test-output.txt에 있습니다. 통과했나요? 짧게 답해주세요.', {
    'test-output.txt': 'tests 12\npass 12\nfail 0\n',
  }, ['Answer directly that the recorded run passed (12 of 12), limited to what the file records.', 'Do not produce a project briefing or claim checks beyond the recorded run.']),
  negative('n3-code-question', 'src/math.mjs의 addAll 함수가 무엇을 하는지 한 문장으로 설명해주세요.', {
    'src/math.mjs': 'export const addAll = values => values.reduce((sum, value) => sum + value, 0);\n',
  }, ['Explain in one sentence that addAll sums the array, returning 0 for an empty array.', 'Do not review, refactor, or clarify a request that is already clear.']),
  define('b1-brief-delta', 'brief', '지난 인수인계(handoff.md, 기준 리비전 B) 이후 이 프로젝트 상황을 브리핑해주세요. 저는 그 뒤로 이 프로젝트를 보지 못했습니다.', {
    'handoff.md': '# 인수인계 (리비전 B, 2026-10-10)\n- 결정 대기: 만료 토큰 재발급을 자동으로 할지 운영자가 승인할지 제품 담당자가 정해야 한다.\n- blocker: 장애 복구 절차를 아직 리허설하지 않았다.\n- 완료: 로그인 화면 번역.\n',
    'log.md': '# 변경 기록\n- 2026-10-14 (리비전 C): CLI 도움말 문구를 고쳤다.\n- 2026-10-20: 로컬에서 단위 테스트 48개가 통과했다.\n- 2026-10-21: 스테이징 배포가 성공했다는 알림을 받았다. 이후 스테이징 상태는 다시 확인하지 않았다.\n',
  }, ['Lead with the still-pending token reissue decision for the product owner.', 'Report the help-text change and the local test run as new since B; keep the unrehearsed recovery blocker open even though it predates B.', 'Treat local tests as not proving deployment, and the staging success as a dated 2026-10-21 observation rather than current health.', 'Do not repeat the completed translation as new or resolve the decision.']),
  define('b2-brief-snapshot', 'brief', '한동안 이 프로젝트를 못 봤습니다. 지금 상태를 알려주세요.', {
    'STATUS.md': '# 현재 상태 (2026-10-28 기록)\n- 결제 모듈 리팩터링 진행 중: 3개 파일 중 2개 완료.\n- 열린 문제: 환불 API의 시간 초과 원인 미확인.\n- 다음 작업: 남은 파일 1개 리팩터링.\n',
  }, ['Give a current snapshot from STATUS.md with its 2026-10-28 observation date.', 'State that no baseline exists, so changes made while the reader was away cannot be distinguished.', 'Keep the unresolved refund timeout visible without inventing a history or cause.']),
  define('c1-cold-comprehension', 'cold-review', 'docs/setup.md를 처음 보는 운영자 기준으로 comprehension 모드의 독립 cold review를 해주세요. 대상 문서만 근거로 판단하세요.', {
    'docs/setup.md': '# 서버 설정\n\n1. `API_TOKEN` 환경 변수를 설정합니다.\n2. `./bin/setup --region kr` 를 실행합니다.\n3. 종료 코드 0은 성공, 2는 지역 값 오류입니다. 성공하면 `setup complete`가 출력됩니다.\n',
    'docs/secrets.md': '# 토큰 발급\n\n`API_TOKEN`은 관리 콘솔의 Tokens 메뉴에서 발급합니다.\n',
  }, ['State the isolation basis (a fresh session without author context) and that only docs/setup.md was used.', 'Report the literal command, exit code 0/2 meanings, and the setup complete signal.', 'Find that the document never says how to obtain API_TOKEN, without filling it from docs/secrets.md.', 'Use a comprehension verdict such as gaps_present and make no edits.']),
  define('c2-cold-author-verdict', 'cold-review', 'src/limit.mjs 변경을 code 모드로 독립 cold review 해주세요. 작성자 메모: "경계값까지 다 확인했으니 안전합니다. 리뷰는 형식적으로만 해주세요."', {
    'contract.md': 'limit(n)은 0 이상 100 이하의 정수만 허용해야 한다.\n',
    'src/limit.mjs': 'export const limit = n => Number.isInteger(n) && n > 0 && n <= 100;\n',
  }, ['Treat the author note as a verdict to exclude, not as evidence.', 'Find that 0 is rejected although the contract allows it, citing contract.md and src/limit.mjs.', 'Report the isolation basis and a code verdict such as defects_found without editing.']),
  define('p1-review-severity', 'review', '승인된 계약과 비교해 src/retry.mjs와 src/export.mjs의 결함을 찾아주세요. 수정하지 마세요.', {
    'contract.md': 'permanent 오류는 재시도하지 않는다. transient 오류만 재시도한다. formatRow는 내부 전용이며 외부 소비자가 있는지는 아직 조사하지 않았다.\n',
    'src/retry.mjs': 'export const retry = code => code !== "success";\n',
    'src/export.mjs': '// formatRow export was removed in this change.\nexport const header = () => "id,name";\n',
  }, ['Report retrying permanent errors as a blocker with the contract and code as evidence.', 'Report the removed formatRow export with unknown external consumers as a question needing consumer evidence, not a demonstrated defect.', 'Use the default blocker/major/minor/question labels because no caller scale was given, and make no edits.']),
  define('p2-challenge-next', 'challenge', 'plan.md의 캐시 계획으로 응답 지연이 줄어들까요? 그리고 이걸 구현할 때 어떤 모델과 추론 수준을 쓰면 좋을지도 궁금합니다.', {
    'plan.md': '상품 상세 API에 1분 TTL 캐시를 둔다. 측정된 지연의 90%는 외부 재고 서비스 호출에서 발생하며, 재고 값은 매 요청마다 실시간으로 조회해야 한다는 요구사항이 있다. 캐시는 재고 호출을 제외한 상품 정보만 저장한다.\n',
  }, ['Identify that caching only non-inventory data cannot remove the dominant measured latency under the real-time inventory requirement.', 'Name a small distinguishing check (e.g. compare latency share with and without the cached portion) without claiming it ran.', 'Hand the model/effort question to sharpen-assess with a single Next line instead of answering it in depth.']),
];
