# v0.9.0-beta.2 선별 평가

2026-09-27~28에 여섯 스킬의 기존 사례 12개를 Codex와 Claude Code에서 비교했습니다. 각 사례는 변경 전·후 버전으로 나뉘어 48개 슬롯을 이룹니다. **최종 후보 24개 슬롯은 모두 PASS**입니다. 기준본은 21 PASS, 3 FAIL입니다.

| Provider | Version | PASS | FAIL | UNCLEAR | NOT_RUN |
| --- | --- | ---: | ---: | ---: | ---: |
| Codex | before | 11 | 1 | 0 | 0 |
| Codex | candidate | 12 | 0 | 0 | 0 |
| Claude Code | before | 10 | 2 | 0 | 0 |
| Claude Code | candidate | 12 | 0 | 0 | 0 |
| Total | both | 45 | 3 | 0 | 0 |

이 표는 **여러 실행 기록에서 각 슬롯의 마지막으로 유효한 결과를 선택한 종합 판정**입니다. 처음 48개 슬롯을 한 번에 통과한 결과가 아닙니다. 첫 실행은 41회 호출 후 증거 수집 오류로 중단됐습니다. 이후 사용자가 범위를 정해 승인한 선별 재평가에서 12회, 4회, 4회, 7회를 추가 호출했습니다. 이 계열의 provider 호출은 총 **68회**이며, 자동 재시도와 모델 대체는 없었습니다. 앞서 별도로 중단된 3회 기록과 기존 576회 평가 archive는 이 수치에 합치지 않았습니다.

## 평가 조건과 근거

- 기준본: `548fe1e4706bef355e5ed1f50c12230fcefbf2c7`의 설치 단위. 후보: `53101421bc8440bacfaa2827a84b23943dceaeb9`에 이번 `sharpen-cold-review` 수정을 더한 설치 단위입니다. 릴리스 준비 시 후보의 스킬 파일 24개가 마지막 평가의 고정본과 일치함을 확인했습니다.
- 모델 설정: Codex `gpt-6-sol / medium`, Claude Code `claude-opus-5-5 / low`. 사용한 CLI는 각각 `0.157.1`, `2.1.283`입니다. Codex의 실제 반환 모델 ID는 관찰되지 않아 명시적 CLI 인자만 근거로 남겼습니다. Claude Code는 완료 응답의 모델 보고를 기록했습니다.
- Node.js `24.20.0`을 사용했습니다. 변경 파일의 동작 검사는 digest가 고정된 `node:24.20.0-bookworm-slim` Docker 이미지에서 격리해 실행했습니다. 스킬 원본, 사례, 설정, 호출 기록, 파일 변경, 실행 시간과 사용량은 로컬 `eval-results/focused-beta2-*` 기록에 분리해 보관했습니다. 원본 기록은 릴리스에 첨부하지 않습니다.
- 대상은 `sharpen-clarify`, `sharpen-challenge`, `sharpen-assess`, `sharpen-cold-review`, `sharpen-brief`, `sharpen-refine`입니다. `sharpen-review`와 `sharpen-dedupe`는 이 선별 평가의 대상이 아닙니다.

초기 실행의 `sharpen-refine` 증거 수집 오류는 macOS 임시 경로의 실제 경로를 사용해 해결했습니다. 뒤이은 제한 시간과 인증 오류는 해당 슬롯을 통과로 간주하지 않고 새 기록에서 다시 확인했습니다. 마지막 후보의 문서 수정 사례는 모두 허용된 파일만 바꿨고 Docker 검사도 통과했습니다. 문서 이해도 검토에서는 실제 명령, 결과와 종료 코드의 의미를 응답에 명시하고 목적을 막지 않는 누락을 결함으로 확대하지 않았습니다.

## 해석 범위

이 결과는 고정된 **12개 사례를 양쪽 provider에서 확인한 선별 평가**입니다. 사례별 최종 결과는 한 번의 관찰이며 일반적인 성공률이나 모델 간 우열을 추정하지 않습니다. 자동 스킬 선택, 기본 출력, 반복 2~3회, 나머지 스킬과 전체 576회 행렬은 인증하지 않습니다. 선별 실행 기록은 공식 v3 archive에 합치지 않았습니다.

[전체 평가 상태](evaluation.md)는 계속 미통과입니다. 576회 행렬의 `evaluationPassed`와 `releaseReady`는 `false`이며, 이번 Pre-release 게시가 그 판정을 바꾸지 않습니다.
