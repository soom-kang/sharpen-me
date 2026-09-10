![refactor-me](docs/assets/refactor-me-title.png)

# refactor-me

Eight skills for planning, reviewing, and refactoring with Codex and Claude Code.

[![Verify](https://github.com/soom-kang/refactor-me/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/soom-kang/refactor-me/actions/workflows/verify.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Use refactor-me to clarify a request before implementation, review a code change, or decide whether duplicated code belongs in a shared function. Choose the skill for your task. Each follows a defined procedure, checks the relevant files and evidence, and stops after reporting its result.

**Status: beta.**

[한국어](docs/README.ko.md) · [Design](docs/design.md) · [Evaluation](docs/evaluation.md) · [Maintenance](docs/maintenance.md)

## Install

Use Node.js 24.20.0 or later. From the project where you will use the skills:

```bash
npx skills add soom-kang/refactor-me
```

Select the skills and agents you want, then choose **Project** for installation scope. If offered the optional `find-skills` global installation, you can decline it.

To install all eight for Codex and Claude Code:

```bash
npx skills add soom-kang/refactor-me --skill '*' --agent codex claude-code
```

To install only `rm-review` for both agents:

```bash
npx skills add soom-kang/refactor-me --skill rm-review --agent codex claude-code
```

Inspect the available skills and check your installation:

```bash
npx skills add soom-kang/refactor-me --list
npx skills list --agent codex claude-code
```

Codex uses `.agents/skills/`; Claude Code uses `.claude/skills/`. Each skill directory carries its own instructions, metadata, and license, so you can install it on its own. If you have both project and global copies, inspect the resolved path to confirm which file your agent loads.

## Skills

| Skill | Use it when | Result |
| --- | --- | --- |
| `rm-scope` | You need to settle what to build before implementation | Only unresolved decisions, or a scope report when requested |
| `rm-review` | You want to find bugs or compatibility issues in a code change | Issues found, the relevant code, and how to check them |
| `rm-challenge` | You need to check an assumption before committing to a plan | Evidence for or against the assumption and, if needed, a small test to check it |
| `rm-assess` | You need to assess risk and choose the model capability and reasoning effort for a task | The change risk, model and reasoning recommendations, and required checks |
| `rm-refine` | You want to simplify existing code or revise technical documentation within an agreed scope | Changes and check results, or a reason to leave the original as it is |
| `rm-review-fresh` | You need a review in a separate context without the author's reasoning | Document comprehension or code correctness findings, or why isolation was unavailable |
| `rm-brief` | You are returning to a project or handing work to someone else | What has changed, what remains unresolved, and what to do next, with sources |
| `rm-dedup` | You want to know whether repeated code can share one implementation | Duplicate locations and a proposal for what to share or keep separate; edits only when requested |

## Invoke a skill

Start your message with a skill name and the task:

```text
Codex:       $rm-review Check the current diff for bugs and compatibility issues.
Claude Code: /rm-review Check the current diff for bugs and compatibility issues.
```

These examples use Codex syntax. In Claude Code, replace the leading `$` with `/`. Send each example as a separate message and supply your actual paths or commit.

```text
$rm-scope Read the API contract and define the scope for adding an assignee filter. Do not implement it yet.
$rm-challenge Check the main assumption in docs/retry-plan.md. Propose a local test with repeatable results.
$rm-assess Assess the proposed migration's risks and recommend model capability and reasoning effort. Do not run the migration.
$rm-refine Simplify src/parser.ts without changing its inputs, outputs, or error behavior. Only this file may change.
$rm-review-fresh Review docs/runbook.md in a separate context without the author's reasoning. If that is unavailable, report why the review cannot run.
$rm-brief Summarize changes since <known-commit>, decisions still needed, and checks performed. Cite the sources.
$rm-dedup Compare the normalization code in src/import-a.ts and src/import-b.ts. Propose what to share or keep separate without editing.
```

Agents can also select a skill based on your request. Your request still controls which files may change and how to report the result. Selecting a skill grants no edit permission and changes no model or provider settings. For `rm-review-fresh`, use a separate context that excludes the author's reasoning. Continuing the same conversation does not provide that separation. See [Design](docs/design.md) for details.

## Update or remove

Review local skill edits before updating or reinstalling. To update one project's installed skill:

```bash
npx skills update rm-review -p
```

To remove all eight from the current project:

```bash
npx skills remove rm-scope rm-review rm-challenge rm-assess \
  rm-refine rm-review-fresh rm-brief rm-dedup
```

Removing by name without `--agent` covers the project's shared skill location and agent paths. Other skill names and global installations remain in place.

## Verify

From a repository checkout:

```bash
npm ci --ignore-scripts
npm run verify
npm run test:install
npm run eval -- --dry-run
```

These commands check skill packaging, documentation links, evaluation tools, and installation. The dry run lists the planned evaluations without calling either provider. See [Maintenance](docs/maintenance.md#local-checks) for Node.js requirements and check coverage, and [Evaluation](docs/evaluation.md) for live evaluation requirements and release criteria.

## License

MIT. See [LICENSE](LICENSE). Each skill includes a copy of the license, including when you install it on its own.
