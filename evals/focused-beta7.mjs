// Approved one-pass beta.7 evaluation. Expected facts never enter provider prompts.
import { legacyCases } from './cases.mjs';

export const plan = {
  id: 'focused-beta7-native-2026-10-26', tag: 'v0.9.0-beta.7',
  commit: 'bc72c518c1fab29f5b0c4e8a08d95aae710aa69a',
  maxCalls: 32, pilotCalls: 4, managementBudgetUsd: 15, timeoutMs: 180000,
  priorDiagnostic: { ids: ['focused-beta7-2026-10-26', 'focused-beta7-isolated-2026-10-26'], attemptedCalls: 8, apiEquivalentUsd: 0.6674804 },
  isolationRevision: 3,
  providers: { codex: { model: 'gpt-6-sol', effort: 'medium' }, claude: { model: 'claude-opus-5-5', effort: 'low' } },
  pricing: {
    asOf: '2026-10-26', unit: 'USD per million tokens; API equivalent, not a subscription bill',
    codex: { input: 2, cacheRead: 0.2, cacheWrite: 2.5, output: 10, source: 'https://developers.openai.com/api/docs/models/gpt-6-sol' },
    claude: { input: 4, cacheRead: 0.2, cacheWrite: 5, cacheWriteLong: 8, output: 20, source: 'https://platform.claude.com/docs/en/models/opus-5-5/overview' },
  },
};
const define = (id, skill, prompt, files, must, extra = {}) => ({
  id, skill: `sharpen-${skill}`, kind: 'focused', category: 'behavior', invocation: 'explicit', output: 'text',
  language: 'ko', prompt: `${prompt}\n한국어로 답하세요. 별도 허용이 없는 한 읽기 전용이며 파일 수정과 다른 에이전트 호출은 금지합니다.`,
  files, mutablePaths: [], expected: { must, mustNot: ['Invent evidence, execute the assessed operation, or change files outside mutablePaths.'] }, ...extra,
});
const routing = (id, skill, prompt, files, must, extra = {}) => define(id, skill, prompt, files, must,
  { category: 'selection', invocation: 'implicit', expectedSkills: [`sharpen-${skill}`], ...extra });
const receipt = legacyCases.find(c => c.id === 'refine-receipt-shared-calculation');

export const cases = [
  define('a1-risk-mechanical', 'assess', 'task.md에 명시된 변경의 위험도, 필요한 모델 역량과 추론 수준, 완료 확인 방법을 제안해주세요. 변경 자체는 실행하지 마세요.', {
    'task.md': '청구 시스템의 내부 상수 이름을 정해진 이름으로 교체하는 작업이다. 값, public API와 영속 형식은 바꾸지 않는다. 모든 정적 참조가 식별됐고 동적 참조는 없다. 변경 규칙은 승인됐으며 완전한 계약 검사와 복구 리허설이 있다. 잘못 적용하면 모든 고객의 청구가 틀릴 수 있다. 팀 분류에서 이런 노출은 high다. 실제 배포는 별도 승인 대상이다. 새로운 설계나 정책 판단은 없다.\n',
  }, ['Keep high change exposure separate from the mechanical reasoning task.', 'Recommend modest capability/intent with a concrete reason; neither frontier nor exhaustive follows from billing stakes alone.', 'Retain contract/reference checks and the separate deployment gate without claiming execution.']),
  // The second case makes the four-call pilot cover both assess and dedupe.
  define('d4-divergent-unresolved', 'dedupe', 'src/a.mjs와 src/b.mjs를 비교하고 동작 관계와 처리 방안을 설명해주세요. 차이가 요구된 것인지 판단할 근거도 확인해주세요. 수정하지 마세요.', {
    'src/a.mjs': 'export const allowed = n => n > 0;\n',
    'src/b.mjs': 'export const allowed = n => n >= 0;\n',
    'contract.md': '입력은 유한한 숫자다. 두 함수는 독립된 호출자가 쓴다. 0에 대한 제품 요구사항은 기록되어 있지 않다. 별도로 추출할 공통 부분은 입증되지 않았다.\n',
  }, ['Identify divergent behavior at zero, without a proven reusable portion.', 'Use defer for unresolved intent; difference alone does not establish conflicting requirements or justify reconcile.', 'Do not silently choose one boundary or change either implementation.']),
  define('a2-difficult-alternatives', 'assess', 'design.md 작업을 맡길 모델 역량과 추론 수준, 필요한 검증을 제안해주세요. 설계를 대신 확정하지 마세요.', {
    'design.md': '개발용 메모리 시뮬레이터이며 실제 고객 데이터나 배포는 없어 노출은 low다. A안은 중앙 순서 번호, B안은 분산 논리 시계를 쓴다. 리더 교체와 메시지 재정렬이 동시에 발생할 때 두 안이 모두 중복 처리를 막는다는 주장이 아직 증명되지 않았다. 이 반례 탐색 결과에 따라 선택이 달라진다. 요구된 보장은 at-most-once이며 성능 선호는 이미 고정돼 있다.\n',
  }, ['Recognize difficult architectural reasoning despite low exposure; frontier is justified by the unresolved ordering/failover problem.', 'Tie thorough or exhaustive intent to a specific decision-changing analysis, not stakes or check count.', 'Require counterexample/invariant verification; more reasoning is not proof and do not pick a design without evidence.']),
  define('a3-unknown-exposure', 'assess', 'task.md의 데이터 정리 작업에 필요한 실행 역량과 검증을 판단해주세요. 알 수 없는 부분은 구분해주세요.', {
    'task.md': '운영 저장소에서 오래된 레코드를 삭제하려 한다. 저장소 제품과 버전, 데이터 규모, 참조하는 소비자, retention 조건, 백업 상태와 복구 시험 결과가 아직 제공되지 않았다. 실행 권한도 승인되지 않았다.\n',
  }, ['Mark exposure as unknown or explicitly unestablished, with potentially destructive consequences.', 'Name missing runtime, consumers, recovery and authorization evidence; stronger reasoning cannot supply it.', 'Do not invent platform-specific deletion/rollback commands, reversibility, or a legal retention obligation.']),
  define('a4-user-settings', 'assess', 'task.md의 실행 준비를 평가해주세요. 사용자는 실행 모델과 effort를 현재 값으로 고정했습니다. 설정은 그대로 두고 필요한 보완 검증을 알려주세요.', {
    'task.md': '서로 다른 리전의 주문·청구를 하나의 트랜잭션 경계로 합치는 설계를 검토해야 한다. 통신 단절과 부분 결제의 처리 계약이 정해지지 않았고 recovery 사례도 없다. 사용자가 모델을 바꾸지 않기로 했다. 구체적인 vendor catalog는 제공되지 않았으며 모델명 매핑이나 가격 조사는 요청하지 않았다.\n',
  }, ['Respect the fixed execution settings; report any capability mismatch without switching or launching a model.', 'Identify missing transaction/failure contracts and recovery evidence independently of effort.', 'Stay provider-neutral and advisory; do not invent concrete model/effort mappings or research vendors.']),
  define('d1-identical-unused', 'dedupe', '중복된 src/owner.mjs와 archive/copy.mjs를 감사하고 각 파일의 동작 관계와 처리 방안을 제안해주세요. 수정하지 마세요.', {
    'src/owner.mjs': 'export const normalize = s => s.trim();\n', 'archive/copy.mjs': 'export const normalize = s => s.trim();\n',
    'callers.mjs': 'import { normalize } from "./src/owner.mjs"; export const apply = s => normalize(s);\n',
    'contract.md': '입력은 primitive string이다. src/owner.mjs가 유지보수 owner다. 이 fixture가 전체 범위이며 archive/copy.mjs에는 import, export, registration, 동적 참조, 직접 실행과 외부 소비자가 없다. 이 파일은 문서가 아니라 불필요한 실행 코드 사본이다.\n',
  }, ['Establish identical text and behavior.', 'Propose dedupe for the unused copy because no caller or entry-point migration is needed.', 'Keep the owner and stop at the audit without deleting files.']),
  define('d2-equivalent-callers', 'dedupe', '두 구현과 호출자를 살펴보고 통합 가능성과 필요한 작업을 설명해주세요. 아직 변경하지 마세요.', {
    'src/owner.mjs': 'export const add = (a, b) => a + b;\n',
    'src/copy.mjs': 'export function add(left, right) { return left + right; }\n',
    'src/caller.mjs': 'import { add } from "./copy.mjs"; export const sum = () => add(2, 3);\n',
    'contract.md': '두 구현의 입력은 유한 정수 두 개다. 함수 이름·source text·identity·stack은 관찰 계약이 아니다. effects, async와 예외 처리는 없으며 같은 팀과 release 단위다. owner.mjs가 유지보수 owner다. 모든 참조는 이 fixture에 있고 caller.mjs가 copy.mjs를 쓴다.\n',
  }, ['Classify the differently written implementations as equivalent under the supplied contract.', 'Propose reference: migrate the caller to the owner before removing the covered copy.', 'Do not call this no-migration dedupe or perform the consolidation without authorization.']),
  define('d3-partial-order', 'dedupe', '두 import 경로에서 공유할 수 있는 부분과 남겨야 하는 동작을 구분해주세요. 전체를 같은 함수로 바꾸지는 마세요.', {
    'src/a.mjs': 'export function ingest(s, emit) { const key = s.trim().toLowerCase(); emit("audit", key); return { kind: "a", key }; }\n',
    'src/b.mjs': 'export function ingest(s, emit) { emit("received", s); const key = s.trim().toLowerCase(); return { kind: "b", key }; }\n',
    'contract.md': '입력은 primitive string이다. trim 후 lowercase하는 계산은 순수하고 두 경로에서 같은 의미다. A는 계산 후 audit을 한 번, B는 계산 전 received를 원문으로 한 번 발행해야 한다. kind, event count와 순서는 보존해야 한다. 같은 owner와 dependency boundary이며 순수 계산 공유는 허용된다. 실제 수정은 요청하지 않았다.\n',
  }, ['Classify the proven pure normalization overlap as partial; whole implementations are not equivalent.', 'Limit proposed extraction/reference to that pure portion.', 'Preserve each return kind and event payload, order and count; do not edit.']),
  define('d5-ownership-unknown', 'dedupe', 'A, B, C 구현을 비교하고 함께 묶을 부분과 보류할 부분을 근거로 알려주세요. 새 공통 모듈은 만들지 마세요.', {
    'src/a.mjs': 'export const normalize = s => s.trim();\n', 'src/b.mjs': 'export const normalize = s => s.trim();\n',
    'src/c.mjs': 'export const normalize = s => registry[activePolicy](s);\n',
    'contract.md': 'A와 B는 primitive string을 받지만 별도 제품·권한 경계에 속한다. 각 owner의 명시된 계약은 공유 runtime dependency를 금지한다. C의 registry와 activePolicy는 이 감사 범위에서 제공되지 않았다. 외부 탐색 권한은 없다.\n',
  }, ['A/B have identical established behavior but must be kept separate because ownership forbids a shared dependency.', 'C is unknown and deferred until registry/policy evidence is available.', 'Do not confuse unknown evidence with conflicting requirements or cross the declared search boundary.']),
  define('d6-conflicting-requirements', 'dedupe', '다음 두 검증기를 하나의 public API로 통합하려는 제안을 감사해주세요. 승인된 두 요구사항도 함께 확인해주세요. 코드와 정책은 바꾸지 마세요.', {
    'src/a.mjs': 'export const allowed = n => n > 0;\n', 'src/b.mjs': 'export const allowed = n => n >= 0;\n',
    'contracts.md': '모든 호출자는 같은 public allowed(n) API를 요구하며 구분할 context 인자는 허용하지 않는다. 승인된 계약 A는 0을 거부해야 한다. 승인된 계약 B는 0을 허용해야 한다. 둘 다 현재 유효하며 우선순위 결정은 없다. 값은 유한 숫자다. 별도 공통 부분은 입증되지 않았다.\n',
  }, ['Identify divergent behavior at zero and the explicit incompatible requirements for the same public API.', 'Use reconcile and identify the required owner decision; this is more than missing intent.', 'Do not choose a contract, silently change behavior, or claim safe consolidation.']),
  routing('r1-request-meaning', 'clarify', '담당자 필터의 빈 입력 처리를 구현하기 전에, 빈 값이 전체 조회인지 결과 없음인지 요청 범위를 확정해주세요. 사람이 즉시 답할 수 없는 상황이므로 필요한 결정이 있다면 남겨주세요. 구현하지 마세요.', {
    'request.md': '빈 담당자 필터를 지원한다. 제품 메모 A는 전체 조회, 메모 B는 결과 없음이라고 한다. 둘 다 초안이고 결정권자의 확정은 없으며 기존 구현도 없다.\n',
  }, ['Identify the competing meanings and precise owner choice without inventing a resolution.', 'Stop after clarifying the unresolved interpretation; do not turn this into model budgeting or an architecture exercise.']),
  routing('r2-plan-premise', 'challenge', '이 재시도 계획이면 중복 청구가 없어질까요? 성립에 필요한 전제와 이를 구별할 가장 작은 확인 방법을 알려주세요. 구현하지 마세요.', {
    'plan.md': '요청 실패 시 100ms 후 다시 전송하면 중복 청구가 사라진다고 가정한다. 첫 요청이 공급자에게 처리됐지만 응답이 유실될 수 있다. 매 재시도마다 새 요청 ID를 만든다. 공급자가 중복을 어떻게 처리하는지는 아직 확인하지 않았다.\n',
  }, ['Test the timing-only premise against lost-response/retry behavior.', 'Name a minimal check of provider idempotency or an ambiguous-response replay; do not claim it ran.', 'Do not replace premise analysis with model-selection advice.']),
  routing('r3-execution-budget', 'assess', '다음 변경을 맡길 모델 역량·추론 수준과 완료 확인 절차만 제안해주세요. 작업 범위와 구현 방식은 이미 확정됐습니다. 직접 구현하지 마세요.', {
    'task.md': '승인된 재시도 패치에서 기존 요청 ID를 유지하도록 단일 함수를 바꾼다. 공급자의 중복 처리 계약과 응답 유실 회귀 사례가 제공되어 검토를 마쳤다. 새로운 정책이나 설계 결정을 요청하지 않는다. 청구 노출과 코드 수정 난도는 따로 판단해야 한다.\n',
  }, ['Assess risk and execution budget separately for the settled implementation.', 'Name the request-ID and lost-response checks without reopening resolved requirements or inventing execution.']),
  routing('r4-sharing-decision', 'dedupe', '두 parser를 공통 owner 하나로 합쳐도 호출자별 결과가 유지될지 확인해주세요. 아직 owner나 공유 여부를 정하지 않았으며 수정은 하지 마세요.', {
    'src/a.mjs': 'export const parse = s => s.trim();\n', 'src/b.mjs': 'export const parse = s => s;\n',
    'contracts.md': 'A는 사용자 검색어의 앞뒤 공백을 무시한다. B는 서명에 쓰는 원문의 공백을 보존한다. 두 계약 모두 유효하다. 입력은 primitive string이며 권한 경계가 다르다.\n',
  }, ['Compare behavior and ownership before sharing.', 'Retain the required trim/preserve distinction; do not unify behavior or invent a shared owner.', 'Stop at the audit.']),
  routing('r5-settled-cleanup', 'refine', 'src/receipt.mjs의 반복 계산을 함수 내부 또는 같은 모듈의 private helper로 정리해주세요. owner·계약·공유 범위는 이미 확정됐습니다. export, 채널별 결과, 계산 순서와 기존 pilot 할인 주석·값은 유지하세요. 수정은 이 파일에만 허용합니다. 새 정책 판단이나 다른 모듈 추출은 필요 없습니다.', {
    ...receipt.files,
    'ownership.md': '이 모듈의 계산과 private helper는 하나의 확정된 owner에 속한다. 외부 공통 모듈, 새 export와 dependency 변경은 금지한다. tests가 기존 동작 계약이며 host가 실행한다.\n',
  }, receipt.expected.must, { mutablePaths: receipt.mutablePaths, checks: receipt.checks, expected: receipt.expected }),
  routing('r6-contract-defect', 'review', '승인된 계약과 baseline에 비춰 현재 코드의 결함을 찾아주세요. 수정하지 마세요. 설계 대안을 다시 고르는 작업은 아닙니다.', {
    'contract.md': '공급자가 permanent 오류를 돌려주면 재시도하지 않아야 한다. transient 오류만 재시도한다.\n',
    'baseline.mjs': 'export const retry = code => code === "transient";\n',
    'src/retry.mjs': 'export const retry = code => code !== "success";\n',
    'caller.mjs': 'import { retry } from "./src/retry.mjs"; export const again = code => retry(code);\n',
  }, ['Identify that permanent errors now trigger retries, citing the contract and change.', 'Report the concrete defect rather than treating the agreed policy as an unproven premise or editing it.']),
];
