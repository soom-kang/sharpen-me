# v0.9.0-beta.1 행동 평가

2026-09-10에 Codex와 Claude Code로 평가를 시작했으나 Claude Code의 주간 사용 한도 응답으로 중단했습니다. 신규 호출은 69회이며, 정상 응답을 마친 68개와 한도 응답 1개를 검토했습니다. 나머지 507개는 호출하지 않았습니다. 자동 재시도, 대체 모델, 추가 유료 채점은 사용하지 않았습니다.

**결과: PASS 45 / FAIL 14 / UNCLEAR 9 / NOT_RUN 508.** `evaluationPassed`와 `releaseReady`는 모두 `false`입니다. 실패와 미확인 결과를 공개하는 베타 배포 후보이며, 평가 통과나 일반적인 성능 개선을 뜻하지 않습니다.

## 범위와 기록

| 항목 | 값 |
| --- | --- |
| Run ID | `2026-09-10T03-04-01-035Z-v3` |
| 시작 | 2026-09-10 12:04 KST |
| 마지막 신규 호출 | 2026-09-10 12:25 KST |
| 계약 | `schemaVersion: 3`, `contractRevision: 4`, `primary_response_only` |
| Baseline | `87b2e064ad0d5ba7b38a1f7c194929fda980cf0a`의 전체 스킬 파일을 새 이름으로 정규화 |
| 개선본 | 이번 후보의 스킬 24개 파일, 실행 전에 동결 |
| 계획 | 기존 48개 사례 × 2개 provider × before/after × 3회 = 576개 |
| 호출 | Codex 34회, Claude Code 35회, 합계 69회 |
| 과거 기록 | 별도 290회 보존, 누적 시도 359회 |
| Codex | CLI 0.153.4, `gpt-6-astra / medium` |
| Claude Code | CLI 2.1.236, `claude-opus-5 / medium` |
| 실행 조건 | 호출당 180초, provider별 동시 실행 1개 |
| 로컬 환경 | Node.js 24.20.0, Docker 격리 검사 통과 |

각 provider에서 before와 after에 같은 `sharpen-*` 이름을 설치했습니다. Baseline의 원본 파일과 과거 평가 archive는 수정하지 않았습니다. 이름 변경 자체의 자동 선택 영향은 이 비교의 대상이 아닙니다.

실행 전에 소스, fixture, runner, 설정과 환경을 동결했고 평가 중 변경하지 않았습니다. 현재 스킬 24개 파일은 동결한 after 파일과 모두 일치합니다. 원본 응답과 로컬 평가 archive는 배포에 포함하지 않습니다.

## 집계

`NOT_RUN`은 미시도뿐 아니라 행동 응답을 얻지 못한 시도도 포함합니다. 이번에는 한도 응답 1회와 미시도 507개가 해당합니다. 아래 수치는 계획된 모든 항목을 분모로 삼습니다.

| Provider | 버전 | PASS | FAIL | UNCLEAR | NOT_RUN | 계획 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Codex | before | 12 | 3 | 2 | 127 | 144 |
| Codex | after | 12 | 1 | 4 | 127 | 144 |
| Claude Code | before | 11 | 5 | 1 | 127 | 144 |
| Claude Code | after | 10 | 5 | 2 | 127 | 144 |
| 합계 | before + after | 45 | 14 | 9 | 508 | 576 |

개선본만 합치면 288개 중 `PASS 22 / FAIL 6 / UNCLEAR 6 / NOT_RUN 254`입니다. 각 표본의 1회차 일부만 실행됐으므로 이 차이를 개선 효과나 승률로 해석하지 않습니다.

다음 표의 각 칸은 **PASS / FAIL / UNCLEAR / NOT_RUN** 순서이며, 스킬·provider·버전별 계획은 18개입니다.

| Provider | 스킬 | before | after |
| --- | --- | --- | --- |
| Codex | `sharpen-clarify` | 3 / 0 / 0 / 15 | 2 / 0 / 1 / 15 |
| Codex | `sharpen-review` | 2 / 0 / 0 / 16 | 1 / 0 / 1 / 16 |
| Codex | `sharpen-challenge` | 2 / 0 / 0 / 16 | 2 / 0 / 0 / 16 |
| Codex | `sharpen-assess` | 0 / 2 / 0 / 16 | 2 / 0 / 0 / 16 |
| Codex | `sharpen-refine` | 1 / 0 / 1 / 16 | 2 / 0 / 0 / 16 |
| Codex | `sharpen-cold-review` | 1 / 1 / 0 / 16 | 1 / 1 / 0 / 16 |
| Codex | `sharpen-brief` | 2 / 0 / 0 / 16 | 2 / 0 / 0 / 16 |
| Codex | `sharpen-dedupe` | 1 / 0 / 1 / 16 | 0 / 0 / 2 / 16 |
| Claude Code | `sharpen-clarify` | 2 / 1 / 0 / 15 | 2 / 1 / 0 / 15 |
| Claude Code | `sharpen-review` | 2 / 0 / 0 / 16 | 2 / 0 / 0 / 16 |
| Claude Code | `sharpen-challenge` | 2 / 0 / 0 / 16 | 1 / 1 / 0 / 16 |
| Claude Code | `sharpen-assess` | 0 / 2 / 0 / 16 | 1 / 1 / 0 / 16 |
| Claude Code | `sharpen-refine` | 1 / 0 / 1 / 16 | 1 / 0 / 1 / 16 |
| Claude Code | `sharpen-cold-review` | 1 / 1 / 0 / 16 | 1 / 1 / 0 / 16 |
| Claude Code | `sharpen-brief` | 1 / 1 / 0 / 16 | 1 / 1 / 0 / 16 |
| Claude Code | `sharpen-dedupe` | 2 / 0 / 0 / 16 | 1 / 0 / 1 / 16 |

## 확인된 실패와 미확인 결과

개선본의 `FAIL` 6개는 다음과 같습니다. 같은 스킬 이름이어도 수정되지 않은 스킬의 표본 차이는 이번 지침 수정의 효과로 볼 수 없습니다.

| Provider | 사례 | 확인 내용 |
| --- | --- | --- |
| Codex | `fresh-external-review-context` | 스킬 지침만 읽고 검토 대상이 없다고 판단했습니다. fixture의 `artifact.md`를 찾아 검토하지 않았습니다. |
| Claude Code | `fresh-external-review-context` | 대상 문서는 읽었으나, 제한된 큐 점검 작업 밖의 자동화 형식·복구·후속 대응 조건을 문서 사용을 막는 결함으로 제시했습니다. |
| Claude Code | `assess-one-file-destructive-migration` | 데이터 보존과 복구 검증은 요구했지만, 실제 마이그레이션 실행에 별도 승인이 필요하다는 조건을 빠뜨렸습니다. |
| Claude Code | `scope-repository-contract` | 담당자 필터의 구현 범위에 관련 동작 테스트를 포함하지 않았습니다. |
| Claude Code | `challenge-retry-after-commit` | 중복 결제 위험은 찾았으나, 제안한 실험에서 안전한 순서와 위험한 순서의 판정 조건이 서로 모순됐습니다. |
| Claude Code | `brief-missing-history-anchor` | 내용 판단은 통과했지만 마지막 JSON 뒤에 설명을 덧붙여 요청된 출력 계약을 어겼습니다. |

Before의 `FAIL` 8개에는 기계적인 전수 검사량을 이유로 추론 수준을 높인 판단, rename 대상 발생 횟수 오독, 실행 승인 조건 누락, 잘못된 검토 대상, 범위 밖의 문서 결함, `deepEqual`을 객체 참조 동일성 검사로 설명한 주장, 파일 수정 시각을 archive 조립 시각으로 단정한 주장이 포함됩니다.

전체 `UNCLEAR` 9개 중 6개는 완전한 스킬 소스 로딩 증거가 부족합니다. 1개는 잘린 명령 증거와 확인할 수 없는 실행 결과가 남았고, 2개는 보고한 테스트·관찰 결과를 명령과 출력에서 확인할 수 없었습니다. 구현과 호스트 동작 검사가 맞더라도 별도로 주장한 실행을 입증하지 못하면 통과로 올리지 않았습니다. 개선본의 `UNCLEAR` 6개는 소스 로딩 증거 부족 4개와 실행 결과 미확인 2개입니다.

허용 변경 범위를 벗어난 파일 변경은 관찰된 호출에서 0건입니다. 이 결과는 합성 fixture 안의 검사 범위에 한정됩니다.

## 미실행 범위와 중단 원인

- 자동 선택 192개와 기본 출력 96개는 모두 `NOT_RUN`입니다. 집계의 `selectionRegressions: []`는 회귀가 없다는 증거가 아닙니다.
- 반복 2·3회차는 전부 미실행입니다. 1회차에서 17개 사례의 before/after·두 provider 응답을 얻은 뒤, 다음 사례의 Claude 호출에서 한도 응답이 나왔습니다.
- 마지막 Claude 응답은 주간 한도 안내와 model ID `<synthetic>`를 반환했습니다. 현재 runner는 모델 불일치 판정을 우선해 이 기록을 `MODEL_MISMATCH`로 저장했습니다. 실제 다른 모델로 과제를 수행했다는 증거가 아닙니다. 원본 분류를 바꾸지 않고 한도 안내와 분류 한계를 함께 기록합니다.
- 중단 시 이미 실행 중이던 Codex 호출만 완료됐습니다. 이후 신규 호출, 재시도 또는 재개는 하지 않았습니다. 남은 예산을 새 비교에 사용하지 않았습니다.

## 근거와 채점 한계

69개 시도의 provider·버전·반복 표기를 가린 자료를 검토하고 각 semantic grade를 해당 관찰의 evidence hash에 연결했습니다. 구조 검증은 별도로 유지했으며, semantic PASS로 소스 로딩 실패나 잘못된 출력 형식을 덮어쓰지 않았습니다. 응답 문체나 지침 내용에서 버전을 추정할 가능성까지 제거한 완전한 맹검은 아닙니다.

Codex 34회는 반환 model identity가 없어 `explicit_cli_argument_only`입니다. Claude의 정상 응답 34회는 `claude-opus-5`를 보고했고, 실패한 한도 응답 1회는 `<synthetic>`를 보고했습니다. 따라서 집계의 `provider_reported: 35`를 모델 검증 통과 35회로 해석하면 안 됩니다. `medium`은 설정한 CLI 인자이며 provider 내부 추론량을 측정한 값이 아닙니다.

명령과 결과는 각각 비식별화 후 최대 8 KiB를 보관합니다. 일부 Codex 복합 명령은 마지막 출력이나 전체 종료 상태만 남겨 개별 테스트 주장을 검증하기 어려웠습니다. Claude에는 파일 도구만 허용했으며 Bash를 새로 허용하지 않았습니다. provider의 도구 범위가 동일하지 않고, 수정 후 호스트 동작 검사는 별도 Docker 컨테이너에서 실행됩니다. 이 차이를 스킬 자체의 성능 차이로 단정하지 않습니다.

로컬 기록 확인용 SHA-256은 다음과 같습니다. 공개 보고서에는 원본 응답이나 계정 정보를 넣지 않았습니다.

| 대상 | SHA-256 |
| --- | --- |
| 입력 | `2020afa8639232f16a5e414603a7a0146d58e4234aa688022e1687d21701f08f` |
| 48개 사례 | `8eccbb25a9d41cabc84d61fecc8bb03d549c93366b0333f39479d639b8511a77` |
| `blind-grades.json` | `3d2b76803564b1a9c7de1248fc9fd567b848d9c3f89f84ee088899b288f84714` |
| `reviewed-summary.json` | `7efb155df303de087dd46fa505abd3a98ab338a91914df013454049cd4181fc3` |

## 로컬 검증과 배포 상태

- `npm run verify`: 85개 테스트 통과, 실패·건너뜀 0개. 패키징, metadata, 문서 링크, 평가 계약과 회귀 검사를 포함합니다.
- `npm run test:install`: 13개 조합 통과. 두 에이전트의 전체·개별 설치, copy·symlink, 재설치·제거, 무관한 스킬 보존과 이전 이름에서의 이전을 확인했습니다.
- `npm run test:docker`: 격리 검사 통과.
- `npm run eval -- --dry-run`: 중복 없는 576개, provider별 288개. 모델 호출과 Docker 실행 없음.
- 합성 기록 검사: 실행 증거 누락·잘림·비식별화, model identity, 구형 계약 거부, hash 변조, quota 중단과 재개 조건 통과.
- `npm run eval:summarize -- <run-directory> <grades-file>`: 입력·snapshot·grade hash 검증 후 위 집계 생성. 평가 gate가 실패했으므로 종료 코드는 1입니다.
- 선택 사항인 `skill-creator` Python 검증기는 로컬 `PyYAML` 부재로 실행하지 못했습니다. 저장소의 스킬 metadata·패키징 검사는 통과했습니다.

[릴리스 후보](releases/v0.9.0-beta.1.md)는 이 결과를 공개하는 Pre-release로 준비합니다. Commit·push·태그·게시 승인은 아직 받지 않았습니다. 승인 후에도 동일 commit의 Verify CI와 원격 태그 설치 검사를 통과해야 게시하며, `Latest`로 지정하지 않습니다. npm 배포와 원본 평가 archive 업로드는 포함하지 않습니다. 추가 지침 수정과 재평가는 후속 합의가 필요합니다.
