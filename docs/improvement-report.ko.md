# 8개 스킬 개선 결과

> 이름 변경 전 파일을 대상으로 한 과거 기록입니다. 표와 설명은 현재 `sharpen-*` 이름으로 읽을 수 있게 정리했습니다. 당시 이름은 [이름 대응표](rename.md#names)를 참고하세요. 수치, 날짜, run ID와 hash는 원본 그대로이며 새 이름의 평가 결과가 아닙니다. 현재 상태는 [평가 안내](evaluation.md)를 확인하세요.


2026-09-09 작업. 개선 전 기준은 `09bb9761294f0189a59e119e2b0db1c3db502370`입니다. 스킬 수정과 평가 도구 구현을 마쳤으며, 모델 평가 결과는 아래 실행 상태와 구분합니다.

## 스킬별 변경

| 스킬 | 개선 전 문제 | 반영한 변경 | 남은 검증 |
| --- | --- | --- | --- |
| `sharpen-clarify` | 복합 요청 자체를 ambiguity로 취급하고 재해석 출력을 요구 | 실질적인 오독 가능성을 기준으로 선택하고 내부적으로 재해석. 미해결 결정과 요청된 scope 보고만 출력 | 명확한 복합 요청에서 불필요한 질문·보고를 생략하는지 |
| `sharpen-review` | 관점 수와 고정 출력 계약이 단순 리뷰에도 적용 | 관점 수 제한 제거. 근거 있는 finding 중심이며 결론에 영향을 줄 때만 관점 비교 | 단일 관점의 정상 결과를 허용하면서 독립 결함을 놓치지 않는지 |
| `sharpen-challenge` | 가정·반론·검증 지침이 반복되고 통계 요구의 적용 범위가 불명확 | 독립 blocker와 관측·원인 구분을 유지하고 통계 요구를 실증 계획에 한정 | 두 독립 blocker를 모두 보존하고 관측만으로 원인을 단정하지 않는지 |
| `sharpen-assess` | 노출 위험과 판단 난도·검증 가능성의 구분 부족 | 세 요소를 분리해 capability와 effort 추천. `unknown`에는 증거 요구 | 위험한 영역의 기계적 수정과 불명확한 설계 판단을 구분하는지 |
| `sharpen-refine` | 코드 블록·표·사용자 작성 내용의 일괄 보존이 명시적 수정 요청과 충돌 | 요청된 영역은 수정 가능. 별도 보호 영역과 무관한 사용자 변경은 보존 | 지정 command와 table을 수정하면서 보호 영역의 bytes를 유지하는지 |
| `sharpen-cold-review` | 문서 이해도와 코드 정확성의 자료 범위가 혼재 | `comprehension`과 `code` 분리. 코드 모드는 contract·baseline·caller·검증 자료 허용 | 실제 격리와 정당한 코드 근거를 함께 사용하고 격리 불가 시 `not_run`을 보고하는지 |
| `sharpen-brief` | baseline 이전의 현재 blocker가 변경 범위 밖으로 빠질 가능성 | baseline은 새 이력에만 적용. 현재 blocker·위험·미해결 결정은 발생 시점과 무관하게 포함 | 과거부터 남은 recovery blocker를 누락하지 않는지 |
| `sharpen-dedupe` | semantic label과 action 혼재. audit 중 새 owner 생성 가능 | `keep`·`defer` 추가. label과 action 분리. audit에서는 owner 제안만 수행 | 동일 코드의 의도적 분리와 동적 근거 부족을 각각 `keep`·`defer`로 처리하는지 |

모든 스킬에서 caller 형식 우선 규칙을 유지했습니다. 일반 호출은 작업에 맞는 간결한 보고를 기본으로 합니다. 평가 host가 항상 존재한다거나 추가 JSON 필드를 삭제·거부한다는 설명을 제거했습니다. Codex 기본 prompt도 수정한 절차에 맞췄습니다. 이름·설치 경로·MIT license·자동 선택 정책은 유지했고 스킬 본문에 모델명을 고정하지 않았습니다.

## 평가 도구와 Node

- Node 개발·CI·검사 이미지는 24.20.0, 지원 최소 버전은 24.20.0입니다.
- v3는 48개 사례 × provider 2개 × 전후 2개 × 3회, 최대 576회입니다. v2 archive는 그대로 보존합니다.
- JSON 타입 검사는 유지하며 추가 필드는 허용합니다. 자연어 사례는 JSON 부재만으로 실패시키지 않습니다.
- provider CLI는 host에서 실행합니다. 수정된 fixture의 행동 검사는 Docker에서 실행합니다. 두 경계는 동일하지 않습니다.
- Docker에서 네트워크·쓰기·child process·worker 제한을 확인했습니다. 공식 이미지 digest는 `sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e`입니다.
- 전후 순서를 균형 있게 배치하고 실제 dispatch 순서를 기록합니다. resume은 동결 입력을 확인하고 시도하지 않은 슬롯만 실행합니다. 이미 시도한 timeout·quota 호출도 자동 재시도하지 않습니다.
- 자동 선택은 답변 내용과 별도로 source loading 증거를 확인합니다. 증거가 부족한 positive 사례는 `UNCLEAR`입니다.
- version 표시를 가린 검토 자료를 생성하고, 근거 hash에 연결된 등급만 집계합니다. 별도의 유료 grader는 호출하지 않습니다.

## 로컬 검증

| 검사 | 결과 |
| --- | --- |
| `npm run verify` | 69개 통과, 실패·skip 0 |
| `npm run test:install` | 전체·개별 설치, copy·symlink, 재설치·제거·다른 스킬 보존 검사 통과 |
| `npm run eval -- --dry-run` | 중복 없는 576개 호출, 모델과 medium 설정 확인 |
| `npm run test:docker` | Node 24.20.0, digest, 정상 읽기와 격리 검사 통과 |
| `quick_validate.py` | 8개 스킬 모두 통과 |
| `git diff --check` | 통과 |
| 별도 지침 검토 | 구체적인 충돌 미발견. 대표 fixture의 계약·오류 순서·보호 영역을 검토 |

기본 Python 환경의 PyYAML 부재로 `quick_validate.py` 첫 실행은 실패했습니다. 임시 가상환경에 PyYAML 6.0.3을 설치한 후 8개 검사를 모두 실행했습니다. 저장소에 새 production dependency를 추가하지 않았습니다.

별도 지침 검토와 로컬 검사는 실제 provider 행동 검증을 대신하지 않습니다. 원격 CI와 공개 tag 설치는 이번에 실행하지 않았습니다.

## 실제 평가 상태

평가 `2026-09-09T04-03-00-483Z-v3`는 **576회 중 2회 호출 후 중단**했습니다. 검토 결과는 **PASS 1, FAIL 0, UNCLEAR 0, NOT_RUN 575**이며 `releaseReady: false`입니다. NOT_RUN 575개는 비교에서 제외된 Claude 호출 1개와 실제 호출하지 않은 574개로 구성됩니다. 호출 수는 provider CLI session 수이며 내부 API request 수가 아닙니다.

| 스킬 | 행동 전: PASS / NOT_RUN | 행동 후: PASS / NOT_RUN | 기본 출력 전·후 | 자동 선택 전·후 |
| --- | --- | --- | --- | --- |
| `sharpen-clarify` | 1 / 17 | 0 / 18 | 각각 6 NOT_RUN | 각각 12 NOT_RUN |
| `sharpen-review` | 0 / 18 | 0 / 18 | 각각 6 NOT_RUN | 각각 12 NOT_RUN |
| `sharpen-challenge` | 0 / 18 | 0 / 18 | 각각 6 NOT_RUN | 각각 12 NOT_RUN |
| `sharpen-assess` | 0 / 18 | 0 / 18 | 각각 6 NOT_RUN | 각각 12 NOT_RUN |
| `sharpen-refine` | 0 / 18 | 0 / 18 | 각각 6 NOT_RUN | 각각 12 NOT_RUN |
| `sharpen-cold-review` | 0 / 18 | 0 / 18 | 각각 6 NOT_RUN | 각각 12 NOT_RUN |
| `sharpen-brief` | 0 / 18 | 0 / 18 | 각각 6 NOT_RUN | 각각 12 NOT_RUN |
| `sharpen-dedupe` | 0 / 18 | 0 / 18 | 각각 6 NOT_RUN | 각각 12 NOT_RUN |

행동 열은 기존 2개와 regression 1개를 두 provider에서 3회씩 실행할 계획인 18개 슬롯을 나타냅니다. 통과율 추정치가 아닙니다. 전후 효과·자동 선택 정확성·3회 반복 변동을 계산할 근거가 없습니다.

| 실제 호출 | 시간 | 보고된 token usage | 판정 |
| --- | ---: | --- | --- |
| Codex / 개선 전 `sharpen-clarify` / 1회차 | 56.344초 | input 98,048; cached input 81,024; output 1,132 | PASS |
| Claude / 개선 후 `sharpen-clarify` / 1회차 | 37.639초 | input 6; cache creation 12,112; cache read 20,252; output 2,713 | 모델 조건 미충족으로 NOT_RUN |

provider별 usage 필드의 의미와 집계 방식이 다르므로 숫자를 같은 비용 척도로 합치지 않았습니다. 보조 모델별 사용량은 별도로 보존되지 않아 전체 비용을 계산할 수 없습니다. 두 관측의 fixture 변경은 없었습니다. 이는 다른 574개 슬롯의 scope 보존을 검증한 결과가 아닙니다.

Claude의 사용 모델 집합에 `claude-opus-5`와 `claude-haiku-4-5-20251001`이 함께 나타났습니다. 당시 검증기는 응답과 usage의 모델명을 합쳐 비교했으므로 `MODEL_MISMATCH`로 중단했습니다. **주 응답 모델이 바뀌었다는 증거는 아닙니다.** 공식 [모델 설정 문서](https://code.claude.com/docs/en/model-config)는 Haiku의 background 사용을 설명하므로 보조 처리일 가능성이 있으나, 저장된 자료만으로 해당 호출의 역할을 확정하지 않았습니다.

Codex event에는 응답 모델명이 없었습니다. 명령의 `gpt-6-astra / medium` 지정은 확인했지만 provider 반환 모델 검증과 구분하여 `explicit_cli_argument_only`로 기록했습니다.

완료된 응답은 version label을 가린 자료로 검토했습니다. 내용과 설치 경로에서 provider나 버전을 추정할 가능성까지 제거한 완전한 blind test는 아닙니다. 추가 유료 grader는 호출하지 않았습니다.

## 남은 개선점과 합의 사항

1. Claude의 주 응답 모델과 background 모델 사용을 분리해 기록해야 합니다. 주 응답만 고정할지, 보조 호출까지 같은 모델로 고정할지는 평가 계약의 선택 사항입니다.
2. 단일 모델 조건을 충족하지 않은 관측을 수정하거나 지우지 않습니다. 계약이나 runner를 바꾸면 현재 archive와 합치지 않고 별도 재평가 범위·호출 수를 합의해야 합니다.
3. 8개 스킬의 개선 후 필수 행동, 기본 출력, 자동 선택을 모두 검증해야 합니다. 이번 중단으로 수정된 fixture의 실제 모델 편집 행동 검사는 도달하지 못했습니다. Docker 격리 probe 통과와 구분합니다.
4. source loading 증거가 부족한 사례를 의미상 비슷한 답변만으로 PASS 처리하지 않습니다. Codex 반환 모델 identity 미노출도 계속 명시합니다.
5. 평가 종료 후 changed-file 수집에서 parent symlink를 통한 fixture 외부 읽기를 막는 검사를 보강하고 회귀 테스트를 추가했습니다. 스킬과 fixture는 그대로지만 runner hash가 달라졌으므로 현재 코드로 기존 archive를 resume할 수 없습니다. 추가 모델 호출은 없었습니다.
6. 원격 CI, 공개 배포 tag 설치, 일반적인 성능 우위는 검증하지 않았습니다.

[상세 평가 계약](evaluation.md)과 [재개·검토 절차](maintenance.md)에 실행 경계와 실패 처리 방식을 기록했습니다.

## Git과 작업 범위

시작 시 working tree는 clean이었습니다. 최종 변경은 기존 파일 33개 수정과 새 파일 11개이며, 모두 이번 스킬·평가·검증·문서 범위에 속합니다. 기존 branch와 `09bb976` commit은 유지했습니다. commit·push·배포·전역 스킬 설치·사용자 모델 설정 변경은 수행하지 않았습니다. 결과 archive는 무시 대상인 `eval-results/`에 보존하고, 공개 문서에는 민감 정보 없는 집계만 남깁니다.
