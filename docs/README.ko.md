![sharpen-me](assets/sharpen-me-title.png)

# sharpen-me

Codex와 Claude Code에서 요청 정리, 위험 판단, 코드와 문서 검토·수정에 쓰는 스킬 8개입니다.

[![Verify](https://github.com/soom-kang/sharpen-me/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/soom-kang/sharpen-me/actions/workflows/verify.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../LICENSE)
[![Public beta: v0.9.0-beta.2](https://img.shields.io/badge/Public_beta-v0.9.0--beta.2-orange)](https://github.com/soom-kang/sharpen-me/releases/tag/v0.9.0-beta.2)

**공개 베타 `v0.9.0-beta.2`는 선별 평가의 후보 24건을 모두 통과했습니다.** 전체 576회 평가 게이트는 아직 미통과입니다. 사용 전에 [선별 평가 결과와 한계](evaluation-v0.9.0-beta.2.ko.md)를 확인합니다.

[English](../README.md) · [Releases](https://github.com/soom-kang/sharpen-me/releases) · [설계](design.md) · [평가](evaluation.md) · [유지보수](maintenance.md)

## 설치

1. **Node.js 24.20.0 이상**을 준비하고 스킬을 사용할 프로젝트를 엽니다.
2. 현재 `main` 브랜치에서 설치합니다.

   ```bash
   npx skills add soom-kang/sharpen-me
   ```

3. 사용할 스킬과 에이전트를 고르고 **Project** 범위를 선택합니다. 추가로 제안하는 `find-skills` 전역 설치는 거절해도 됩니다.

Codex는 `.agents/skills/`, Claude Code는 `.claude/skills/`를 사용합니다. 프로젝트와 전역에 같은 스킬이 있으면 에이전트가 읽는 실제 경로를 확인합니다. 기존 `rm-*` 설치는 [이전 절차](rename.md#replace-an-existing-project-installation)를 따릅니다.

<details>
<summary>전체, 개별 또는 특정 버전 설치</summary>

다음 명령에서도 설치 범위는 **Project**를 선택합니다.

두 에이전트에 8개 모두 설치:

```bash
npx skills add soom-kang/sharpen-me --skill '*' --agent codex claude-code
```

두 에이전트에 `sharpen-review`만 설치:

```bash
npx skills add soom-kang/sharpen-me --skill sharpen-review --agent codex claude-code
```

`main` 대신 게시된 Pre-release로 버전 고정:

```bash
npx skills add https://github.com/soom-kang/sharpen-me/tree/v0.9.0-beta.2 --skill '*' --agent codex claude-code
```

검증 결과와 알려진 한계는 [릴리스 노트](https://github.com/soom-kang/sharpen-me/releases/tag/v0.9.0-beta.2)에 있습니다. 스킬마다 지침, 메타데이터, 라이선스를 포함하므로 하나만 설치해도 됩니다.

</details>

<details>
<summary>설치 가능한 스킬과 현재 설치 목록 확인</summary>

```bash
npx skills add soom-kang/sharpen-me --list
npx skills list --agent codex claude-code
```

</details>

## 스킬 목록

| 스킬 | 사용 시점 | 결과 |
| --- | --- | --- |
| `sharpen-clarify` | 구현 범위가 불분명할 때 | 미해결 결정 또는 요청 시 작업 범위 보고서 |
| `sharpen-review` | 코드 변경에서 결함을 찾을 때 | 발견한 문제, 해당 코드와 확인 방법 |
| `sharpen-challenge` | 계획이 검증되지 않은 가정에 의존할 때 | 가정을 뒷받침하거나 반박하는 근거와 필요한 테스트 |
| `sharpen-assess` | 위험과 필요한 모델 역량을 판단할 때 | 변경 위험, 모델 역량, 추론 수준과 필요한 검증 |
| `sharpen-refine` | 코드 구조를 단순화하거나 기술 문서를 고칠 때 | 정한 범위의 수정과 검증 또는 원본을 유지할 이유 |
| `sharpen-cold-review` | 작성자의 추론 없이 별도로 검토할 때 | 문서나 코드의 검토 결과 또는 독립된 검토 환경을 확보하지 못한 이유 |
| `sharpen-brief` | 작업을 재개하거나 다른 사람에게 넘길 때 | 변경 사항, 미해결 결정, 다음 작업과 출처 |
| `sharpen-dedupe` | 반복 코드를 한곳에서 관리해도 될지 판단할 때 | 공통화하거나 따로 둘 부분. 수정은 승인된 경우에만 진행 |

## 호출 방법

메시지 앞에 설치한 스킬 이름과 요청을 적습니다.

```text
Codex:       $sharpen-review 현재 diff에서 버그나 호환성 문제가 있는지 확인해줘.
Claude Code: /sharpen-review 현재 diff에서 버그나 호환성 문제가 있는지 확인해줘.
```

<details>
<summary>나머지 스킬의 호출 예시</summary>

예시를 하나씩 보내고 경로나 commit은 실제 값으로 바꿉니다. Claude Code에서는 맨 앞의 `$`를 `/`로 바꿉니다.

```text
$sharpen-clarify API 계약을 읽고 담당자 필터를 추가할 작업 범위를 정해줘. 아직 구현하지 마.
$sharpen-challenge docs/retry-plan.md의 핵심 가정이 맞는지 확인해줘. 결과를 재현할 수 있는 로컬 테스트를 제안해줘.
$sharpen-assess 제안한 마이그레이션의 위험을 평가하고 필요한 모델 역량과 추론 수준을 추천해줘. 마이그레이션은 실행하지 마.
$sharpen-refine src/parser.ts의 입력, 출력, 오류 처리 동작을 유지하면서 구조를 단순화해줘. 이 파일만 수정해.
$sharpen-cold-review 작성자의 추론이 없는 별도 컨텍스트에서 docs/runbook.md를 검토해줘. 그런 환경이 없으면 검토를 실행할 수 없는 이유를 알려줘.
$sharpen-brief <known-commit> 이후 바뀐 내용, 더 결정해야 할 사항, 수행한 검증을 출처와 함께 정리해줘.
$sharpen-dedupe src/import-a.ts와 src/import-b.ts의 정규화 코드를 비교해줘. 수정하지 말고 공통화할 부분과 따로 둘 부분을 제안해줘.
```

</details>

에이전트가 요청에 맞는 스킬을 선택할 수도 있습니다. 수정 권한, 모델 설정과 출력 형식은 사용자가 정합니다. 독립 검토에는 작성자의 추론이 없는 별도 컨텍스트가 필요합니다. 같은 대화를 이어가는 것만으로는 이 조건을 충족하지 못합니다. 자세한 기준은 [설계](design.md)를 참고합니다.

## 업데이트와 제거

업데이트하거나 다시 설치하기 전에 로컬 수정본을 보관합니다. 기존 `rm-*` 이름을 업데이트해도 새 이름으로 바뀌지는 않으므로 [이전 절차](rename.md#replace-an-existing-project-installation)를 따릅니다.

현재 프로젝트의 스킬 하나 업데이트:

```bash
npx skills update sharpen-review -p
```

현재 프로젝트에서 지정한 스킬 8개 제거:

```bash
npx skills remove sharpen-clarify sharpen-review sharpen-challenge sharpen-assess \
  sharpen-refine sharpen-cold-review sharpen-brief sharpen-dedupe
```

`--agent` 없이 실행하면 프로젝트의 공유 설치 경로와 에이전트별 경로에서 제거합니다. 다른 스킬과 전역 설치는 유지합니다.

## 검증

저장소를 내려받은 폴더에서 실행합니다.

```bash
npm ci --ignore-scripts
npm run verify
npm run test:install
npm run eval -- --dry-run
```

패키징, 문서 링크, 평가 도구와 설치를 검사합니다. Dry run은 에이전트를 호출하지 않고 평가 계획을 보여 줍니다. 로컬 검사 통과가 행동 품질을 보장하지는 않습니다.

[유지보수와 검사 범위](maintenance.md#local-checks) · [평가 결과와 판정 기준](evaluation.md)

## 라이선스

MIT입니다. [LICENSE](../LICENSE)를 참고합니다. 스킬을 하나만 설치해도 라이선스를 포함합니다.
