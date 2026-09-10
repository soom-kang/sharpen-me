![sharpen-me](assets/sharpen-me-title.png)

# sharpen-me

Codex와 Claude Code에서 요청을 정리하고 작업을 검토할 때 쓰는 스킬 8개입니다.

[![Verify](https://github.com/soom-kang/sharpen-me/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/soom-kang/sharpen-me/actions/workflows/verify.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../LICENSE)

구현 전에 요구사항을 정리하거나 코드 변경을 검토할 때, 중복 코드를 공통 함수로 묶어도 될지 판단할 때 사용합니다. 필요한 스킬을 골라 작업을 요청하세요. 각 스킬은 정해진 절차에 따라 관련 파일과 근거를 확인하고 결과를 정리한 뒤 작업을 마칩니다.

**상태: 베타.**

[English](../README.md) · [Releases](https://github.com/soom-kang/sharpen-me/releases) · [설계](design.md) · [평가](evaluation.md) · [유지보수](maintenance.md)

## 설치

새 이름은 현재 checkout에 반영했습니다. 원격 설치는 관리자가 GitHub 저장소 이름을 바꾸고 이 파일들을 게시한 뒤 사용할 수 있습니다. 기존 `v0.8.10-beta.1` 태그에는 이전 이름이 들어 있습니다.

Node.js 24.20.0 이상이 필요합니다. 스킬을 사용할 프로젝트에서 실행하세요.

```bash
npx skills add soom-kang/sharpen-me
```

사용할 스킬과 에이전트를 고르고 설치 범위는 **Project**를 선택하세요. 추가로 `find-skills` 전역 설치를 제안하면 거절해도 됩니다.

Codex와 Claude Code에 8개를 모두 설치하려면 다음 명령을 사용합니다.

```bash
npx skills add soom-kang/sharpen-me --skill '*' --agent codex claude-code
```

기존 설치가 있다면 로컬 수정본을 먼저 보관하세요. 아래 명령으로 이전 이름을 제거한 뒤 새 이름을 설치하고 **Project** 범위를 선택합니다.

```bash
npx skills remove rm-scope rm-review rm-challenge rm-assess \
  rm-refine rm-review-fresh rm-brief rm-dedup
npx skills add soom-kang/sharpen-me --skill '*' --agent codex claude-code
npx skills list --agent codex claude-code
```

`.agents/skills/`와 `.claude/skills/`에서 이전 이름이 제거되고 새 파일을 읽는지 확인하세요. 심볼릭 링크는 실제 연결 경로까지 확인합니다. 전역 설치와 다른 스킬은 유지합니다. 저장한 prompt와 프로젝트 지침의 호출 이름도 바꿔 주세요. [이름 대응표와 이전 절차](rename.md)를 참고하세요.

두 에이전트에 `sharpen-review`만 설치하려면 다음 명령을 사용합니다.

```bash
npx skills add soom-kang/sharpen-me --skill sharpen-review --agent codex claude-code
```

설치 가능한 목록과 현재 설치된 스킬을 확인합니다.

```bash
npx skills add soom-kang/sharpen-me --list
npx skills list --agent codex claude-code
```

Codex의 프로젝트 설치 경로는 `.agents/skills/`, Claude Code는 `.claude/skills/`입니다. 각 스킬 폴더에 지침, 메타데이터, 라이선스가 들어 있어 하나만 설치해도 사용할 수 있습니다. 프로젝트와 전역에 같은 스킬이 있다면 에이전트가 어느 경로의 파일을 읽는지 확인하세요.

## 스킬 목록

| 스킬 | 사용 시점 | 결과 |
| ----------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `sharpen-clarify` | 구현 전에 무엇을 만들지 명확히 정해야 할 때 | 미해결 결정 또는 요청된 작업 범위 보고 |
| `sharpen-review` | 코드 변경에서 버그나 호환성 문제를 찾을 때 | 발견한 문제, 해당 코드와 확인 방법 |
| `sharpen-challenge` | 계획대로 진행하기 전에 가정이 맞는지 확인할 때 | 가정을 뒷받침하거나 반박하는 근거와 필요할 경우 이를 확인할 간단한 테스트 |
| `sharpen-assess` | 작업의 위험도와 필요한 모델 역량·추론 수준을 판단할 때 | 변경 위험, 권장 모델 역량·추론 수준, 필요한 검증 |
| `sharpen-refine` | 정한 범위 안에서 기존 코드를 단순화하거나 기술 문서를 수정할 때 | 수정 내용과 검증 결과 또는 원본을 유지할 이유 |
| `sharpen-cold-review` | 작성자의 추론이 없는 별도 컨텍스트에서 검토받고 싶을 때 | 문서 이해도·코드 정확성 검토 또는 격리 불가 사유 |
| `sharpen-brief` | 중단했던 작업을 다시 시작하거나 다른 사람에게 넘길 때 | 달라진 점, 미해결 사항, 다음에 할 일과 출처 |
| `sharpen-dedupe` | 여러 곳에 반복된 코드를 하나로 묶어도 될지 확인할 때 | 중복 코드의 위치와 공통화하거나 따로 둘 부분. 수정은 요청한 경우에만 진행 |

## 호출 방법

메시지 앞에 스킬 이름을 쓰고 원하는 작업을 요청하세요.

```text
Codex:       $sharpen-review 현재 diff에서 버그나 호환성 문제가 있는지 확인해줘.
Claude Code: /sharpen-review 현재 diff에서 버그나 호환성 문제가 있는지 확인해줘.
```

아래 예시는 Codex 문법입니다. Claude Code에서는 맨 앞의 `$`를 `/`로 바꿉니다. 각 예시를 별도 메시지로 보내고 경로나 commit은 실제 값으로 바꾸세요.

```text
$sharpen-clarify API 계약을 읽고 담당자 필터를 추가할 작업 범위를 정해줘. 아직 구현하지 마.
$sharpen-challenge docs/retry-plan.md의 핵심 가정이 맞는지 확인해줘. 결과를 재현할 수 있는 로컬 테스트를 제안해줘.
$sharpen-assess 제안한 마이그레이션의 위험을 평가하고 필요한 모델 역량과 추론 수준을 추천해줘. 마이그레이션은 실행하지 마.
$sharpen-refine src/parser.ts의 입력, 출력, 오류 처리 동작을 유지하면서 구조를 단순화해줘. 이 파일만 수정해.
$sharpen-cold-review 작성자의 추론이 없는 별도 컨텍스트에서 docs/runbook.md를 검토해줘. 그런 환경이 없으면 검토를 실행할 수 없는 이유를 알려줘.
$sharpen-brief <known-commit> 이후 바뀐 내용, 더 결정해야 할 사항, 수행한 검증을 출처와 함께 정리해줘.
$sharpen-dedupe src/import-a.ts와 src/import-b.ts의 정규화 코드를 비교해줘. 수정하지 말고 공통화할 부분과 따로 둘 부분을 제안해줘.
```

에이전트가 요청에 맞는 스킬을 자동으로 선택할 수도 있습니다. 수정할 파일과 결과 형식은 사용자의 요청을 따릅니다. 스킬 선택만으로 수정 권한을 부여하거나 모델·provider 설정을 바꾸지는 않습니다. `sharpen-cold-review`에는 작성자의 추론이 없는 별도 컨텍스트가 필요합니다. 같은 대화를 계속하는 것만으로는 이 조건을 충족하지 못합니다. 자세한 내용은 [설계](design.md)를 참고하세요.

## 업데이트와 제거

업데이트하거나 다시 설치하기 전에 로컬에서 수정한 내용이 있는지 확인하세요. 현재 프로젝트의 `sharpen-review`를 업데이트하려면 다음 명령을 사용합니다.

```bash
npx skills update sharpen-review -p
```

현재 프로젝트에서 8개 스킬을 모두 제거합니다.

```bash
npx skills remove sharpen-clarify sharpen-review sharpen-challenge sharpen-assess \
  sharpen-refine sharpen-cold-review sharpen-brief sharpen-dedupe
```

`--agent` 없이 이름으로 제거하면 프로젝트의 공유 설치 경로와 에이전트별 경로에서 해당 스킬을 제거합니다. 다른 스킬과 전역에 설치한 파일은 유지합니다.

## 검증

이 저장소를 내려받은 폴더에서 실행합니다.

```bash
npm ci --ignore-scripts
npm run verify
npm run test:install
npm run eval -- --dry-run
```

위 명령으로 스킬 패키징, 문서 링크, 평가 도구와 설치를 확인합니다. Dry run은 provider를 호출하지 않고 실행할 평가 목록을 보여 줍니다. Node.js 요구사항과 검사 범위는 [유지보수](maintenance.md#local-checks), 실제 평가의 실행 요건과 릴리스 기준은 [평가](evaluation.md)를 참고하세요.

## 라이선스

MIT입니다. 전문은 [LICENSE](../LICENSE)를 참고하세요. 스킬을 하나만 설치해도 라이선스 파일이 함께 설치됩니다.
