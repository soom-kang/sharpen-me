# beta.7 한정 평가 — 2026-10-26

승인된 **32회 평가를 완료했습니다. 최종 집계는 PASS 21, UNCLEAR 11**입니다. 제외한 환경 진단 8회를 합쳐 총 40회를 호출했고, API 환산 비용은 **US$3.0460930**입니다. US$15 관리 예산 안에서 종료했으며 재시도와 추가 유료 채점은 하지 않았습니다.

`assess`와 `dedupe`의 핵심 구분은 응답에서 확인했습니다. 다만 스킬 접근 관찰의 한계와 실제 결함이 있어 한정 평가 전체는 통과하지 못했습니다. **UNCLEAR 11건 중 2건은 수동 검토에서 결함을 확인한 사례**입니다. 아래 집계의 FAIL 0을 결함이 없다는 뜻으로 해석하면 안 됩니다.

## 결과

| 도구 | 호출 | PASS | FAIL | UNCLEAR | NOT_RUN |
| --- | ---: | ---: | ---: | ---: | ---: |
| Codex | 16 | 11 | 0 | 5 | 0 |
| Claude Code | 16 | 10 | 0 | 6 | 0 |
| 합계 | **32** | **21** | **0** | **11** | **0** |

기존 집계기는 구조 판정이 `UNCLEAR`이면 수동 검토의 `FAIL`보다 먼저 적용합니다. 수동 검토는 30건 PASS, 2건 FAIL이며, 두 결함은 각각 다른 스킬 본문 접근과 근거 없는 단정입니다. 실행 중 기준을 바꾸지 않았고 원래 판정과 수동 근거를 모두 보존했습니다. `focusedPassed`와 `releaseReady`는 모두 `false`입니다.

| 사례 | 확인한 판단 또는 호출 경계 | Codex | Claude Code |
| --- | --- | --- | --- |
| A1 `a1-risk-mechanical` | 높은 청구 노출과 기계적 수정 난도 분리 | PASS | PASS |
| A2 `a2-difficult-alternatives` | 낮은 노출에서도 어려운 반례 탐색에는 높은 역량 권고 | UNCLEAR¹ | PASS |
| A3 `a3-unknown-exposure` | 플랫폼·소비자·복구·권한 미확인 상태 유지 | PASS | PASS |
| A4 `a4-user-settings` | 사용자 모델·effort 고정, 보완 검증 제안 | PASS | PASS |
| D1 `d1-identical-unused` | `identical / dedupe`: 호출자 이전이 없는 사본 | PASS | PASS |
| D2 `d2-equivalent-callers` | `equivalent / reference`: 호출자 이전 후 제거 | UNCLEAR¹ | PASS |
| D3 `d3-partial-order` | `partial`: 순수 계산만 공유, 이벤트 순서·횟수 보존 | PASS | PASS |
| D4 `d4-divergent-unresolved` | `divergent / defer`: 차이는 확인됐지만 의도는 미확정 | PASS | PASS |
| D5 `d5-ownership-unknown` | 동일 동작도 공유 금지면 `keep`, registry 미제공은 `defer` | UNCLEAR² | PASS |
| D6 `d6-conflicting-requirements` | 같은 API의 명시적 충돌에는 `reconcile` | UNCLEAR¹ | PASS |
| R1 `r1-request-meaning` | 요청 의미 확정 → `clarify` | PASS | UNCLEAR³ |
| R2 `r2-plan-premise` | 계획 전제 확인 → `challenge` | PASS | UNCLEAR³⁴ |
| R3 `r3-execution-budget` | 확정된 구현의 실행 역량 → `assess` | PASS | UNCLEAR³ |
| R4 `r4-sharing-decision` | 동작·owner 공유 여부 → `dedupe` | UNCLEAR¹ | UNCLEAR³ |
| R5 `r5-settled-cleanup` | owner가 확정된 내부 계산 정리 → `refine` | PASS | UNCLEAR⁵ |
| R6 `r6-contract-defect` | 승인된 계약에 대한 구체적 결함 → `review` | PASS | UNCLEAR³ |

1. Codex의 `rg --files`에 포함된 `SKILL.md` 패턴 또는 본문을 제외하는 glob을 관찰기가 출처 불명 본문 접근으로 분류했습니다. 해당 스킬 전체 본문과 필요한 fixture를 읽은 기록은 있지만 기존 구조 판정은 유지했습니다.
2. Codex D5는 `rg --hidden`으로 fixture 전체를 검색하면서 `refine`, `clarify`, `cold-review`의 본문 일부도 읽었습니다. 명령 문자열에 스킬 경로가 없어 접근 관찰기가 이를 놓쳤고, 출력은 8 KiB 제한으로 잘렸습니다. 최종 답의 `keep / defer`는 맞지만 단일 스킬 적용 기준을 위반해 수동 판정은 FAIL입니다.
3. Claude Code의 native `Skill` 호출은 예상 스킬 이름으로 성공했으나, 관찰기가 받는 결과에는 전체 원문이 확인되지 않았습니다. 호출 성공과 완전한 로딩 증거를 같은 것으로 취급하지 않았습니다.
4. Claude Code R2는 공급자의 중복 처리 방식이 미확인인데도 새 ID에는 같은 청구임을 알아볼 단서가 없고 청구가 하나 더 생긴다고 단정했습니다. 이후 다른 키로 중복을 제거할 가능성을 인정하고 적절한 확인 방법도 제시했지만, 앞선 단정은 근거가 없어 수동 판정은 FAIL입니다.
5. Claude Code R5에는 스킬 접근 기록이 없습니다. 요청한 코드 수정과 기존 동작 검사는 통과했지만, `refine`을 호출했다고 확인할 수 없습니다.

## 확인한 범위와 다음 개선점

- **assess:** 두 도구 모두 A1에서 `high` 노출과 `fast / glance`를 함께 권고했습니다. A2에서는 노출이 `low`여도 구체적인 반례 탐색 때문에 `frontier / exhaustive`를 권고했습니다. 미확인 정보를 더 강한 모델로 대신하거나 사용자 설정을 바꾸지는 않았습니다.
- **dedupe:** 6개 사례의 최종 답은 의미 관계와 조치를 구분했습니다. 관찰된 차이만으로 `reconcile`을 선택하지 않았고, 호출자 이전·공유 금지·부분 공유를 구별했습니다. 다만 D5의 넓은 검색은 다른 스킬 본문을 읽는 문제를 드러냈습니다.
- **인접 스킬:** Codex는 6개 모두 예상 스킬 본문을 읽었습니다. Claude Code는 5개에서 예상 native `Skill` 호출이 관찰됐고 R5에는 기록이 없었습니다. 이는 12개 모두의 호출 정확도가 검증됐다는 뜻이 아닙니다.
- **수정과 종료:** R5만 `src/receipt.mjs`를 수정했습니다. 두 결과 모두 기존 검사 2개를 Docker에서 수정 전후 통과했습니다. export, 채널별 결과, getter 평가·반올림 순서, 할인 주석과 `0.15` 값이 유지됐습니다. 나머지 사례는 읽기 전용으로 종료했고 fixture의 허용 범위 밖 변경은 0건입니다.

다음 작업은 추가 모델 호출보다 **기존 관찰기의 증거 처리 보완**이 우선입니다. 파일 목록과 제외 glob을 본문 읽기에서 구분하고, 넓은 검색 결과의 실제 스킬 경로도 귀속해야 합니다. native `Skill` 호출의 본문 전달 증거를 확인할 방법과, 확인된 수동 FAIL이 구조 UNCLEAR에 가려지지 않는 집계도 필요합니다. 현재 기록으로 재현 가능한 부분부터 검토할 수 있습니다.

스킬 지침의 후속 검토 대상은 D5의 검색 범위와 R2의 조건부 결론입니다. Claude R5는 `refine` 자동 선택을 추가로 확인할 후보입니다. 이번에는 배포된 지침이나 판정 코드를 바꾸지 않았으며, 스킬 미사용 비교군이 없어 어느 문제도 특정 문구의 원인으로 확정하지 않았습니다. 후속 유료 실행에는 새 범위·호출 수·예산 합의가 필요합니다.

## 실행 조건과 한계

평가 대상은 `v0.9.0-beta.7`의 스킬 24개 파일이며 소스 커밋은 `bc72c518c1fab29f5b0c4e8a08d95aae710aa69a`입니다. [16개 사례](../evals/focused-beta7.mjs)는 `assess` 4개, `dedupe` 6개, 인접 스킬 선택 6개입니다. 각 사례를 두 도구에서 한 번씩 실행했습니다.

| 설정 | 값 |
| --- | --- |
| Codex | `gpt-6-sol / medium`, CLI `0.164.0` |
| Claude Code | `claude-opus-5-5 / low`, CLI `2.1.310` |
| 모델 근거 | Codex 16건은 명시 CLI 인자만 확인; Claude 16건은 primary response의 모델 식별자 확인 |
| Node | 공식 `24.20.0` 임시 설치본, 배포 checksum 확인 |
| 동작 검사 | 기존 Docker 격리 probe와 기존 `refine` fixture 검사 재사용 |
| 스킬 배치 | 릴리스의 8개 설치 단위를 각 임시 project fixture에 배치 |
| 응답 | 한국어 자연어; 예상 답안은 모델에 제공하지 않음 |
| 호출 방식 | 사례·도구당 1회, 최대 동시 2회, 호출당 제한 180초 |
| 제외 | 자동 재시도, 대체 모델, 유료 grader, 이전 버전 비교, 반복 안정성 측정 |

Codex는 ChatGPT 구독, Claude Code는 Team 구독으로 인증했습니다. 여기서 호출 수는 CLI 작업 실행 횟수이며 내부 API turn 수와 다릅니다. 비용은 기록된 사용량의 API 환산값으로, 구독 청구액이 아닙니다.

같은 주 에이전트가 응답·명령·변경 파일·기존 검사 결과를 수동 검토했습니다. 일부 provider 라벨을 확인했으므로 독립된 blind review로 주장하지 않습니다. `blindId`와 `evidenceHash`는 판정을 해당 관찰에 고정하는 데 사용했습니다. 스킬 원문 전체 로딩이나 실행 증거가 부족한 결과는 내용이 맞아도 통과로 올리지 않았습니다.

개인 지침을 제외한 임시 환경에서 실행했으므로 사용자의 전역 설정을 그대로 적용한 일상 세션에 대한 검증은 아닙니다. `brief`와 `cold-review`는 설치되어 있었지만 직접 평가하지 않았습니다. 단일 관찰로 일반 성공률·도구 우열·개선 전후 효과를 추정할 수 없고, 기존 576회 전체 평가 게이트도 미통과 상태입니다.

## 진단과 비용

| 단계 | 호출 | API 환산 비용 | 처리 |
| --- | ---: | ---: | --- |
| 최초 환경 진단 | 4 | US$0.3275578 | Codex 응답에 전역 `AGENTS.md` 모델 가정 유입; 본 평가에서 제외 |
| 외부 읽기 제한 진단 | 4 | US$0.3399226 | Codex 내부 sandbox와 충돌해 fixture 읽기 실패; 본 평가에서 제외 |
| 새 평가 — Codex | 16 | US$0.6286448 | 기록·검토 완료 |
| 새 평가 — Claude Code | 16 | US$1.7499678 | 기록·검토 완료; CLI 보고 비용과 일치 |
| 합계 | **40** | **US$3.0460930** | US$15 관리 예산 이내 |

2026-10-26에 고정한 100만 token당 단가는 [OpenAI 모델 문서](https://developers.openai.com/api/docs/models/gpt-6-sol)와 [Anthropic 모델 문서](https://platform.claude.com/docs/en/models/opus-5-5/overview)를 기준으로 기록했습니다. Codex는 입력 US$2, cache read US$0.2, 출력 US$10이며, Claude는 입력 US$4, cache read US$0.2, short cache write US$5, long cache write US$8, 출력 US$20입니다. 세부 계산과 남은 호출 비용 추정은 [실행 코드](../scripts/evaluate-focused.mjs)에 있습니다. 관리 예산은 hard billing cap이 아닙니다.

초기 두 진단의 실패는 스킬 판단 오류와 구분했습니다. 호출 한도는 사용자의 추가 승인으로 32→36→40회로 늘렸고, 관리 예산은 유지했습니다. 기존 8회의 결과를 새 32회에 섞거나 실패 슬롯을 자동 재시도하지 않았습니다.

## 환경 격리

모델 호출 없이 다음을 확인한 뒤 새 실행을 시작했습니다.

- `--ignore-user-config`와 `project_doc_max_bytes=0`만으로는 전역 지침을 제거하지 못했습니다. `codex debug prompt-input`으로 확인했습니다.
- macOS 외부 읽기 제한으로 Codex를 감싸면 내부 command sandbox가 `sandbox_apply: Operation not permitted`로 실패했습니다.
- Codex 자식 프로세스의 HOME·설정 경로를 임시 디렉터리로 지정하면 전역 지침과 외부 스킬이 입력에서 제외되고 fixture 스킬은 남았습니다. 기본 sandbox의 fixture 읽기도 확인했습니다.
- 로그인 파일은 fixture와 snapshot 밖의 임시 설정 경로에서 심볼릭 링크로 참조했습니다. credential 내용은 복사·출력하지 않았고, 무과금 진단 전후 원본의 inode·크기·수정 시간이 같았습니다.

새 실행의 Codex는 기본 command sandbox를 유지했습니다. Claude Code에는 기존 tool·설정 제한과 개인 지침·스킬·메모리 경로의 프로세스 읽기 제한을 적용했습니다. 부모 환경 변수, 사용자 설정, 전역 설치 스킬은 변경하지 않았습니다. 이 조치는 task context 분리이며 모든 host 자원에 대한 완전한 접근 차단을 뜻하지 않습니다. 실제 설정과 프로파일 hash는 로컬 실행 기록에 보존했습니다.

## 검증과 기록

- `npm run verify`: Node `24.20.0`에서 기존 검사 100개 통과. 새로운 테스트나 production dependency는 추가하지 않았습니다.
- `node scripts/evaluate-focused.mjs --dry-run`: 새 32회·진단 8회·최대 누적 40회, 유료 호출 0회 확인.
- `--pilot` 4회, `--continue` 28회: 모두 완료. journal과 관찰 기록 각각 32건이며 자동 재시도는 없습니다.
- `--summarize`: 32개 수동 판정을 원래 evidence hash와 대조해 집계했습니다. 추가 모델 호출은 없습니다.
- Docker probe: Node 버전·fixture 읽기·비관리자 실행 확인, 쓰기·자식 프로세스·worker·외부 네트워크 차단 확인.
- R5 Docker 검사: 도구별 수정 전후 기존 2개 검사 통과. Codex는 별도로 같은 기존 검사를 실행했고 그 성공 기록도 있습니다.
- `git diff --check`: 통과. 평가 종료 시점에는 도구와 관련 문서만 변경한 미커밋 상태였습니다. 이후 별도 릴리스 요청에 따라 beta.8로 패키징하며, 설치되는 스킬 24개 파일과 평가 대상 beta.7 tag·commit은 유지합니다. 릴리스 커밋과 배포 검사는 [beta.8 릴리스 기록](https://github.com/soom-kang/sharpen-me/releases/tag/v0.9.0-beta.8)에서 확인할 수 있습니다.

로컬 `eval-results/`는 Git에서 제외됩니다. raw provider stream과 계정 식별자는 공개 보고서에 포함하지 않았습니다.

| 기록 | 위치 |
| --- | --- |
| 첫 진단 | `eval-results/focused-beta7-2026-10-26/` |
| 두 번째 진단 | `eval-results/focused-beta7-isolated-2026-10-26/` |
| 새 평가 | `eval-results/focused-beta7-native-2026-10-26/` |
| 새 평가의 구성 | `run.json`, `dispatch.json`, `records/`, `blind-review.json`, `grades.json`, `summary.json`, `frozen/` |

| 근거 식별자 | SHA-256 |
| --- | --- |
| 새 평가 input hash | `e8451e81533686f1b6bd0fc88606f0b4351caa3de9855041eeed16817effa884` |
| 16개 사례 | `e1d2cdaa83ff7271ab8c6b88e2779432c567a77ab5ae3831582f350f8d5dbe66` |
| `grades.json` | `918277d79478e9806406ded6486afa45b5d08da81e15d0dfaced64eed84ae1d5` |
| `summary.json` | `cb181e64ee1976664f30758947eeb58b9b305829aa15d7c1b1b0ee8455d57896` |

기존 48개 사례, 576회 비교 설정, 과거 평가 archive와 배포된 스킬은 변경하지 않았습니다. 이번 기록은 해당 소스·모델·CLI·격리 방식·단일 실행 조건에 한정됩니다.
