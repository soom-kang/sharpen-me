# 다음 한정 평가 계획

2026-10-31에 범위와 예산(40회, 관리 예산 US$10)을 승인받았습니다. **유료 호출은 아직 하지 않았습니다.** 대상은 beta.8 이후 스킬 개정(P1 trigger·규칙 보강, P2 섹션·완료 점검·`Next:` 형식)과 관찰기 수정이며, 스킬 원본은 `863450fc861d392bc94c08ca6c778a5b395c8761`에 고정합니다. 사례와 설정은 [plan 파일](../evals/focused-next.mjs)에 있습니다.

## 실행 전에 끝난 관찰기 수정

[beta.7 보고서](evaluation-beta7-2026-10-26.ko.md)가 우선 과제로 꼽은 두 가지를 로컬 회귀 테스트와 함께 고쳤습니다.

- **Codex 명령 분류:** `-g '!**/SKILL.md'`, `--exclude=` 같은 제외 glob은 접근으로 세지 않습니다. `rg --files`, `find`, `ls`, `fd`는 discovery로 기록합니다. 스킬 경로를 명시하지 않은 `rg`·`grep` 검색은 출력에 나온 스킬 경로로 content 접근을 귀속합니다. 이에 따라 beta.7 D5 같은 넓은 검색은 FAIL로, 각주 1의 제외 glob은 증거 없음으로 관찰됩니다.
- **집계 우선순위:** 구조 판정이 `UNCLEAR`이고 수동 판정이 `FAIL`이면 `FAIL`로 집계합니다. 수동 판정이 구조적 `FAIL`이나 `NOT_RUN`을 덮어쓰지는 않습니다.

beta.7 기록에는 원시 provider stream이 없어 기존 관찰을 새 분류로 다시 계산할 수 없습니다. 수정의 효과는 다음 실행에서만 확인됩니다. 수정된 runner로 beta.7 archive를 summarize하거나 이어서 실행하지 않습니다.

## 범위

| 묶음 | 사례 | 확인할 것 |
| --- | --- | --- |
| beta.7 결함 재확인 | D5 dedupe 넓은 검색, R2 challenge 외부 계약, R5 refine 자동 선택 (beta.7 사례 그대로) | P1 규칙과 trigger 어휘가 같은 상황에서 결함을 줄이는지 |
| 그럴듯한 음성 사례 | 맞춤법만 고치는 요청, 방금 실행한 테스트 결과 질문, 명확한 코드 설명 질문 | 스킬을 쓰지 말아야 할 때 쓰지 않는지(`expectedSkills: []`) |
| 미평가 스킬 | brief 2개(기준점 이후 변경과 오래된 blocker, 기준점 없는 snapshot), cold-review 2개(전제 조건이 빠진 문서, 작성자 판정이 섞인 code 리뷰) | 처음으로 직접 관찰 |
| P2 형식 | review 기본 severity, challenge의 `Next:` 한 줄 | 새 출력 관례가 지켜지고 응답이 과도하게 길어지지 않는지 |

모두 12개 사례이며 두 도구에서 각 1회 실행합니다.

## 스킬 미사용 대조군

같은 prompt를 스킬 없이 실행합니다. 음성 사례 3개와 작성자 판정이 섞인 cold-review 1개는 대조군에서 의미가 없어 제외하므로, 대조군은 8개 사례 × 2개 도구 = 16회입니다. 대조군 fixture에는 스킬을 복사하지 않고, 스킬 접근이 관찰되면 구조 판정에서 FAIL입니다. 나머지는 같은 기대 사실로 수동 판정합니다. blind packet의 스킬 접근 기록으로 arm이 드러날 수 있으므로 완전한 blind 비교로 주장하지 않습니다. 한 번의 관찰이므로 개선 폭이나 일반 성공률도 주장하지 않습니다.

## 호출 수와 예산

| 구분 | 호출 |
| --- | ---: |
| 스킬 설치 | 24 |
| 대조군 | 16 |
| pilot 포함 합계 | **40** |

beta.7 실측 평균(Codex 약 US$0.04/회, Claude Code 약 US$0.11/회)으로 약 US$3를 예상합니다. 관리 예산은 US$10이며 hard billing cap이 아닙니다. 자동 재시도·대체 모델·유료 grader는 쓰지 않으며, 모델과 effort는 beta.7과 같습니다.

## 실행 방법

beta.7 runner인 `scripts/evaluate-focused.mjs`가 `--plan`을 받도록 일반화했습니다. 인자가 없으면 beta.7 plan을 그대로 사용합니다. 대조군 arm은 `control` 버전으로 기록되며, summary에 `controlCounts`와 사례별 `comparison`이 추가됩니다.

```bash
node scripts/evaluate-focused.mjs --plan evals/focused-next.mjs --dry-run
```

dry run은 40회 호출 목록과 유료 호출 0회를 출력합니다. 실행은 pilot 4회(첫 사례의 두 arm × 두 도구) → 검토 → 나머지 36회 순서입니다.

```bash
node scripts/evaluate-focused.mjs --plan evals/focused-next.mjs --pilot
```

```bash
node scripts/evaluate-focused.mjs --plan evals/focused-next.mjs --continue
```

## 실행 전 준비

2026-10-31에 모델 호출 없이 다음을 확인했습니다.

- **Node 24.20.0:** nodejs.org 공식 `darwin-arm64` 배포본을 임시 디렉터리에 풀고 `SHASUMS256.txt`와 대조했습니다(전역 설치 없음). 이 버전으로 `npm run verify`(테스트 105개)와 dry run(40회, 유료 0회)이 통과했습니다.
- **Docker:** `node:24.20.0-bookworm-slim`을 받았고 digest `sha256:ba849c60…a71e`가 beta.7 실행 기록과 같습니다. `npm run test:docker` 격리 검사는 PASS입니다.
- **Codex `0.166.0`:** runner와 같은 임시 HOME·`CODEX_HOME`으로 `codex debug prompt-input`을 렌더링했습니다. 스킬 arm에는 fixture의 sharpen 스킬 8개만 보였고, 대조군 arm에는 sharpen 스킬이 없었습니다. 두 arm 모두 전역 `AGENTS.md` 표지와 `~/.agents/skills`의 개인 스킬이 0건이었습니다. 같은 명령을 실제 HOME으로 실행하면 둘 다 나타나므로 확인 방법은 유효합니다.
- **Claude Code `2.1.316`:** runner와 같은 `sandbox-exec` 프로필에서 `~/.claude/skills`, `~/.claude/projects`, `~/.agents/skills`의 읽기가 거부됐고, CLI 실행과 일반 경로 읽기는 가능했습니다.

남은 한계도 있습니다. `~/.claude/plugins`의 plugin 스킬은 읽기 제한 목록에 없고, `--setting-sources project`로 사용자 범위 plugin이 꺼진다는 점에 의존합니다. Claude가 실제로 어떤 스킬 목록을 받는지는 모델 호출 없이 확인하지 못했으므로, pilot 결과에서 대조군 응답과 스킬 접근 기록을 먼저 확인합니다.
