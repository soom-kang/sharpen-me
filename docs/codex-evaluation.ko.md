# Codex 우선 재평가 결과

> 이름 변경 전 파일의 평가 기록입니다. 표와 설명에는 `sharpen-*` 이름을 사용합니다. 당시 이름은 [이름 대응표](rename.md#names), 현재 상태는 [평가 안내](evaluation.md)를 참고합니다. 수치, 날짜, run ID와 hash는 원본 그대로입니다. 새 이름의 평가 결과로 해석하지 않습니다.

2026-09-09에 주 응답 모델 판정과 Codex 전용 실행을 구현하고 **288회 호출과 블라인드 채점을 마쳤습니다.** 개선 후 PASS는 87/144에서 111/144로 늘었습니다. 다만 FAIL 12건과 UNCLEAR 21건이 남아 **Codex 평가를 통과하지 못했습니다.** 당시 Claude 후속 평가는 보류했고 전체 릴리스 준비도 끝나지 않았습니다.

## 구현과 보존 범위

- schema v3에 `contractRevision: 2`, `modelPolicy: primary_response_only`, `selectedProviders: ["codex"]`를 명시하고 동결 hash에 포함했습니다.
- Claude 최상위 assistant 응답과 Codex의 구조화된 에이전트 message에서 주 응답 모델을 판정합니다. Aggregate usage의 모델 목록과 숫자 집계는 별도로 저장합니다. Usage에 다른 모델이 등장했다는 이유만으로 mismatch를 판정하거나 역할을 추정하지 않습니다.
- 구조화된 반환 모델이 없으면 `explicit_cli_argument_only`로 기록합니다. 응답 본문에 적힌 모델명은 증거가 아닙니다.
- Matrix, CLI 사전 검사, dispatch, resume, 집계가 선택 provider를 따릅니다. 이번 단계에는 Claude CLI 사전 검사나 추론 호출이 없습니다.
- 선택 provider 평가인 `evaluationPassed`와 양쪽 provider 검증이 필요한 `releaseReady`를 분리했습니다.
- 개선 전은 `09bb976`, 개선 후는 작업 시작 당시 `8811159`의 8개 스킬입니다. **이번 작업에서는 스킬·메타데이터·fixture·정답 기준을 추가 수정하지 않았습니다.**
- 기존 2회 archive를 보존했습니다. 기존 PASS를 새 평가에 재사용하지 않았고, 기존 schema v2와 구정책 v3 결과를 변환하거나 덮어쓰지 않았습니다.

## 실행과 실제 호출 수

| 항목 | 결과 |
| --- | --- |
| 새 평가 | Codex 288/288, Claude 0 |
| 이전 평가 | 2회, 별도 보존 |
| 누적 평가 시도 | 290회 |
| 호출 조건 | `gpt-6-astra / medium`, 한 번에 하나, 전후 순서 교대 |
| 모델 identity | 288회 모두 `explicit_cli_argument_only`; 반환 모델 identity 미검증 |
| 환경 | Node 24.20.0, Codex CLI 0.153.4 |
| Docker | `node:24.20.0-bookworm-slim`, 아래 digest 고정 |
| timeout | Provider 180초, Docker 검사 30초 |
| 재시도·fallback·유료 grader | 모두 0 |
| 인증·quota·모델 불일치·격리 실패·입력 변경 중단 | 0 |
| 평가 판정 | `evaluationPassed: false`, `releaseReady: false` |

Image digest: `sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e`.

호출 수는 provider CLI 세션을 시작한 횟수이며 내부 API 요청이나 청구 건수가 아닙니다. 별도 평가 모델을 호출하지 않고 주 에이전트가 버전 표시를 가린 관측을 검토했습니다.

## 전후 벤치마크

모든 셀은 **PASS/FAIL/UNCLEAR** 순서입니다. NOT_RUN은 모두 0입니다. 스킬·버전별 18건은 행동 9건, 기본 출력 3건, 자동 선택 6건으로 구성됩니다. 행동에는 기존 normal·edge와 추가 회귀가 각 3회 포함됩니다.

| 스킬 | 전체 18건: 전 → 후 | 행동 9건: 전 → 후 | 기본 출력 3건: 전 → 후 | 자동 선택 6건: 전 → 후 |
| --- | --- | --- | --- | --- |
| sharpen-clarify | 8/4/6 → 13/0/5 | 2/3/4 → 6/0/3 | 0/1/2 → 2/0/1 | 6/0/0 → 5/0/1 |
| sharpen-review | 6/3/9 → 15/0/3 | 3/0/6 → 8/0/1 | 0/3/0 → 2/0/1 | 4/0/2 → 5/0/1 |
| sharpen-challenge | 15/2/1 → 15/0/3 | 8/0/1 → 6/0/3 | 1/2/0 → 3/0/0 | 6/0/0 → 6/0/0 |
| sharpen-assess | 12/5/1 → 12/6/0 | 6/2/1 → 6/3/0 | 0/3/0 → 0/3/0 | 6/0/0 → 6/0/0 |
| sharpen-refine | 16/0/2 → 18/0/0 | 7/0/2 → 9/0/0 | 3/0/0 → 3/0/0 | 6/0/0 → 6/0/0 |
| sharpen-cold-review | 9/4/5 → 12/4/2 | 6/1/2 → 8/1/0 | 0/3/0 → 1/2/0 | 6/0/0 → 5/1/0 |
| sharpen-brief | 15/3/0 → 17/0/1 | 9/0/0 → 9/0/0 | 0/3/0 → 3/0/0 | 6/0/0 → 5/0/1 |
| sharpen-dedupe | 6/2/10 → 9/2/7 | 1/0/8 → 2/0/7 | 0/2/1 → 1/2/0 | 6/0/0 → 6/0/0 |

자동 선택 열은 소스 로딩을 판정합니다. 전체 열에는 응답의 의미와 실행 근거도 반영하므로 선택 PASS를 행동 PASS로 합산하지 않습니다. 자동 선택의 비호출 사례 48건은 모두 통과했습니다. 선택 성공은 positive 사례에서 감소했습니다.

| 버전 | PASS | FAIL | UNCLEAR | NOT_RUN |
| --- | ---: | ---: | ---: | ---: |
| 개선 전 | 87 | 23 | 34 | 0 |
| 개선 후 | 111 | 12 | 21 | 0 |
| 전체 | 198 | 35 | 55 | 0 |

이 fixture를 세 번 반복한 결과이며 일반적인 승률이나 통계적으로 확정된 우월성을 뜻하지 않습니다. 개선 후 모든 항목을 통과한 스킬은 `sharpen-refine`뿐입니다.

## 스킬별 문제와 다음 개선점

| 스킬 | 확인된 결과 | 남은 개선점 |
| --- | --- | --- |
| sharpen-clarify | 복합 rename 요청의 불필요한 재질문은 전 3건 → 후 0건. 행동·기본 출력 PASS 증가. 자동 선택은 6/6 → 5/6 | 명시 호출과 자동 선택의 source 로딩 증거를 보강하고 trigger 선택의 반복 변동을 재검증 |
| sharpen-review | 정상 구현 허용과 실제 HTML 주입 결함 보존. 기본 출력의 고정 JSON 문제 감소 | 추가 inline 검증을 보고할 때 명령·결과를 확인할 수 있는 기록 확보. 로딩 근거 부족 해소 |
| sharpen-challenge | 독립 blocker와 정상 계획 허용 유지. 기본 출력 1/3 → 3/3 | 행동 PASS 8/9 → 6/9 감소는 추가 실행 주장에 대한 증거 부족 증가에서 발생. 제안과 실행의 보고 근거를 맞출 필요 |
| sharpen-assess | 파괴적 migration 위험과 판단 난도 분리는 적절함. 단순 40개 파일 rename은 전후 각각 6건 모두 effort 과잉 권고 | 파일 수에 따른 검증 작업량과 추론 난도를 더 분명히 구분. 기계적인 전수 검사를 `thorough` 권고의 단독 근거로 쓰지 않도록 보완 |
| sharpen-refine | 개선 후 18/18 통과. 승인된 블록 수정, 사용자 편집 보존, 코드·문서 범위 유지 | 이번 표본에서 확인된 내용 결함 없음. Claude 결과와 더 넓은 작업에 대한 성능은 미검증 |
| sharpen-cold-review | code 모드에서 contract·baseline·caller를 읽고 권한 회귀 식별. comprehension 대상 혼동은 전 1건 → 후 3건 | 스킬 지침과 실제 artifact를 구분하는 대상 확인 보강. 자동 선택에서 sharpen-review와 동시 로딩한 1건 해결. fixture의 “artifact below” 표현도 후속 설계에서 명확화 검토 |
| sharpen-brief | 기존 blocker와 기록 시점 보존. 기본 출력 0/3 → 3/3 | 자동 선택 6/6 → 5/6의 로딩 증거 부족 해소. 내용 개선과 선택 신뢰성을 별도로 관리 |
| sharpen-dedupe | owner 통합·오류 순서 보존 및 keep/defer 판단은 유지. 기본 출력은 0/3 → 1/3 | 추가 실험의 실행 근거 수집, 불필요한 8개 섹션 보고 억제. 증거 부족이 많아 행동 개선의 확정 판단은 제한됨 |

이번 실행에서 스킬 수정은 하지 않았습니다. 위 항목을 수정한 뒤 이미 시도한 슬롯을 재평가하려면 별도 합의가 필요합니다.

## 실패·불확실·scope 구분

- 최종 FAIL 35건 중 34건은 의미·출력 실패, 1건은 잘못된 자동 선택입니다. 별도의 semantic FAIL은 총 37건입니다.
- **내용 실패 3건이 구조 판정의 UNCLEAR에 가려져 있습니다.** 구버전 `assess-wide-mechanical-rename/r1`, `default-rm-scope/r2`, `default-rm-dedup/r2`입니다. Source 로딩 부족이 우선 적용된 결과이며, 해당 내용 결함이 사라진 것은 아닙니다. 원본 grade와 summary를 그대로 보존하고 이 차이를 별도 기록했습니다.
- UNCLEAR 55건의 주된 판정 사유는 source 로딩 증거 부족 23건, 추가 실행 내용의 세부 증거 부족 32건입니다. 일부 관측에는 두 문제가 함께 있습니다.
- 허용 경로 밖 **파일 변경 위반은 전후 모두 0건**입니다. 변경 전 Docker 검사 30건, 변경 후 48건이 모두 통과했습니다.
- 읽기 전용 리뷰의 **대상 이탈은 전 1건·후 3건**입니다. 이는 스킬 문서를 artifact로 오인한 실패들입니다. Raw summary의 `scopeViolations`는 grade 배열에 명시된 1건만 세므로 전체 대상 이탈 수로 해석하지 않습니다. 이 보고서는 네 실패의 rationale도 대조해 별도 집계했습니다.
- `sharpen-cold-review`의 `not_run` 응답은 격리가 불가능한 edge 사례의 기대 동작입니다. 평가 호출의 NOT_RUN을 뜻하지 않으며 해당 기대 거절은 PASS로 채점했습니다.

버전 표시를 열기 전에 동등한 JSON·자연어 사례의 effort 기준을 맞춰 초기 grade 2건을 정정했습니다. 변경 전 grade와 이유는 `blind-grade-revisions.json`에 보존했습니다. 후속 일관성 점검에서는 추가로 정정하지 않았습니다.

## 시간·usage와 반복 변동

평균 시간은 스킬·버전별 18회 CLI 관측으로 계산했습니다. 검사 준비와 주 에이전트의 검토 시간은 제외했습니다. Input/output은 CLI가 반환한 누적 토큰이며 청구 금액이 아닙니다.

| 스킬 | 평균 초: 전 → 후 | Input tokens: 전 → 후 | Output tokens: 전 → 후 |
| --- | ---: | ---: | ---: |
| sharpen-clarify | 33.7 → 32.2 | 1,237,634 → 1,356,815 | 13,823 → 12,013 |
| sharpen-review | 30.1 → 23.5 | 1,541,128 → 1,309,385 | 10,520 → 7,243 |
| sharpen-challenge | 37.8 → 35.6 | 1,229,232 → 1,243,207 | 16,311 → 14,817 |
| sharpen-assess | 39.1 → 39.6 | 1,161,311 → 1,185,879 | 15,353 → 16,846 |
| sharpen-refine | 34.4 → 34.1 | 1,607,467 → 1,671,248 | 12,834 → 12,398 |
| sharpen-cold-review | 28.0 → 23.2 | 1,370,982 → 1,025,445 | 9,492 → 7,610 |
| sharpen-brief | 32.9 → 29.1 | 1,230,173 → 1,163,690 | 13,013 → 10,703 |
| sharpen-dedupe | 59.1 → 57.1 | 2,045,403 → 1,826,173 | 26,336 → 25,538 |

<details>
<summary>전체 시간과 토큰 집계</summary>

전체 CLI 관측 시간 합계는 전 88.53분, 후 82.30분입니다. Input은 전 11,423,330·후 10,781,842, 그중 cached input은 전 8,814,464·후 8,336,768로 보고됐습니다. Output은 전 117,682·후 107,168이며 별도로 보고된 reasoning output은 전 5,268·후 4,416입니다. 포함 관계가 있는 usage 필드를 서로 더해 새로운 총량으로 만들지 않았습니다. 캐시와 실행 순서가 시간·usage에 영향을 줄 수 있습니다.

</details>

<details>
<summary>회차별 PASS / FAIL / UNCLEAR</summary>

아래는 각 회차의 **전체 6건 PASS/FAIL/UNCLEAR**입니다.

| 스킬 | 개선 전: 1회 · 2회 · 3회 | 개선 후: 1회 · 2회 · 3회 |
| --- | --- | --- |
| sharpen-clarify | 2/1/3 · 3/1/2 · 3/2/1 | 4/0/2 · 4/0/2 · 5/0/1 |
| sharpen-review | 3/1/2 · 1/1/4 · 2/1/3 | 6/0/0 · 5/0/1 · 4/0/2 |
| sharpen-challenge | 4/1/1 · 6/0/0 · 5/1/0 | 5/0/1 · 5/0/1 · 5/0/1 |
| sharpen-assess | 4/1/1 · 4/2/0 · 4/2/0 | 4/2/0 · 4/2/0 · 4/2/0 |
| sharpen-refine | 5/0/1 · 5/0/1 · 6/0/0 | 6/0/0 · 6/0/0 · 6/0/0 |
| sharpen-cold-review | 3/1/2 · 2/2/2 · 4/1/1 | 4/2/0 · 3/2/1 · 5/0/1 |
| sharpen-brief | 5/1/0 · 5/1/0 · 5/1/0 | 5/0/1 · 6/0/0 · 6/0/0 |
| sharpen-dedupe | 2/1/3 · 1/0/5 · 3/1/2 | 3/1/2 · 3/1/2 · 3/0/3 |

</details>

## 로컬 검증과 Git 상태

| 검사 | 결과 |
| --- | --- |
| `npm run verify` | 74개 통과, 실패·skip 0 |
| `npm run test:install` | 설치·copy·symlink·재설치·제거·무관한 스킬 보존 검사 통과 |
| `npm run test:docker` | Node 버전·digest, 정상 읽기 및 네트워크·쓰기·child process 제한 검사 통과 |
| 평가 dry run | Codex 288개, Claude 0개, 중복 ID 없음, 누적 상한 290 |
| 새 archive 집계 검증 | 288개 고유 관측·evidence hash·grade 연결 검증 완료 |
| 완료 archive resume dry run | 새 호출 0, 미시도 슬롯 0; 실제 provider 호출 없음 |
| `eval:summarize` 종료 코드 | 1: 완료된 평가에 실패·불확실이 남아 있어 기대된 실패 판정 |
| `git diff --check` | 통과 |

모델 판정 회귀에는 주 응답 일치와 추가 usage 모델 허용, 실제 주 응답 불일치 차단, 반환 identity 부재, Codex 선택 시 Claude CLI 미호출, archive 정책 분리, source drift 차단과 release gate 분리가 포함됩니다.

초기 Git 상태는 clean, HEAD는 `8811159`였습니다. 이번 변경은 평가 계약·runner·회귀 검사·설계/평가/유지보수 문서와 이 보고서입니다. 스킬과 fixture 및 이전 archive의 보존 hash를 재확인했습니다. Commit·push·배포·전역 스킬 설치·사용자 모델 설정 변경은 수행하지 않았습니다.

최종 Git 상태는 tracked 파일 12개 수정과 이 보고서 1개 신규이며 HEAD는 그대로입니다. 최종 문서 반영 후 `npm run verify`도 74개 통과, 실패·skip 0으로 재확인했습니다.

## 해석 한계와 보류 사항

- 288회 모두 지정한 CLI 인자만 확인됐습니다. 실제 반환 model identity가 없으므로 provider 측 `gpt-6-astra` 사용이 검증됐다고 표현할 수 없습니다.
- Codex host의 개인 공통 지침이 일부 응답의 자산 발굴용 형식에 영향을 줄 수 있습니다. 이번 비교는 해당 host 환경의 결과이며 형식 문제의 원인을 스킬에만 돌릴 수 없습니다. 개인 지침 내용은 실행 중 hash 동결 대상에 포함되지 않아 전체 host 문맥까지 동결됐다고 주장하지 않습니다.
- 보관된 일반 command 이벤트는 종류와 exit code 중심입니다. 추가 inline 실험의 내용·결과를 확인할 수 없어 UNCLEAR가 발생했습니다. 후속 runner는 민감 정보가 없는 실행 증거를 더 구체적으로 남길 필요가 있습니다.
- Claude는 후속 평가 보류 상태입니다. Codex 개선 관측만으로 Claude Code 최적화나 전체 릴리스 준비 완료를 주장하지 않습니다.
- 향후 유료 재평가, 스킬/fixture 수정, Claude 실행은 이번 결과와 별도로 합의합니다. 이번 archive에는 재호출할 미시도 슬롯이 없습니다.

새 archive는 `eval-results/2026-09-09T05-50-58-256Z-v3`, 이전 archive는 `eval-results/2026-09-09T04-03-00-483Z-v3`입니다. 둘 다 로컬 증거로 보존했습니다. 이 문서에는 집계와 합성 사례 식별자만 담았습니다.
