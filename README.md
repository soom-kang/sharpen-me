![sharpen-me](docs/assets/sharpen-me-title.png)

# sharpen-me

Eight skills for clarifying requests, reviewing work, assessing risk, and refining code and documents with Codex and Claude Code.

[![Verify](https://github.com/soom-kang/sharpen-me/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/soom-kang/sharpen-me/actions/workflows/verify.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Use sharpen-me to clarify a request before implementation, review a code change, or decide whether duplicated code belongs in a shared function. Choose the skill for your task. Each follows a defined procedure, checks the relevant files and evidence, and stops after reporting its result.

**Status: beta; evaluation gate not met.** The `v0.9.0-beta.1` candidate was evaluated with Codex and Claude Code, then stopped after 69 calls when Claude returned a weekly-limit notice. Across 576 planned items: **45 PASS, 14 FAIL, 9 UNCLEAR, 508 NOT_RUN**. The candidate alone has 6 failures and 6 unclear results. Cold-review target handling, unsupported findings and execution-approval conditions still have failures. Automatic selection and repetitions 2–3 were not run. See the [evaluation report](docs/evaluation-v0.9.0-beta.1.ko.md); local validation is not a behavior guarantee.

[한국어](docs/README.ko.md) · [Releases](https://github.com/soom-kang/sharpen-me/releases) · [Design](docs/design.md) · [Evaluation](docs/evaluation.md) · [Maintenance](docs/maintenance.md)

## Install

The repository is `soom-kang/sharpen-me`. The local `v0.8.10-beta.1` tag contains the previous names. See [Rename and existing installations](docs/rename.md).

Use Node.js 24.20.0 or later. From the project where you will use the skills:

```bash
npx skills add soom-kang/sharpen-me
```

Select the skills and agents you want, then choose **Project** for installation scope. If offered the optional `find-skills` global installation, you can decline it.

To install all eight for Codex and Claude Code:

```bash
npx skills add soom-kang/sharpen-me --skill '*' --agent codex claude-code
```

For the `v0.9.0-beta.1` candidate, use this pinned command **after its Pre-release is published**:

```bash
npx skills add https://github.com/soom-kang/sharpen-me/tree/v0.9.0-beta.1 --skill '*' --agent codex claude-code
```

[Release notes](docs/releases/v0.9.0-beta.1.md) record the candidate's checks and limitations. Until publication, branch installation uses the files already on `main`.

To install only `sharpen-review` for both agents:

```bash
npx skills add soom-kang/sharpen-me --skill sharpen-review --agent codex claude-code
```

Inspect the available skills and check your installation:

```bash
npx skills add soom-kang/sharpen-me --list
npx skills list --agent codex claude-code
```

Codex uses `.agents/skills/`; Claude Code uses `.claude/skills/`. Each skill directory carries its own instructions, metadata, and license, so you can install it on its own. If you have both project and global copies, inspect the resolved path to confirm which file your agent loads.

## Skills

| Skill | Use it when | Result |
| --- | --- | --- |
| `sharpen-clarify` | You need to settle what to build before implementation | Only unresolved decisions, or a scope report when requested |
| `sharpen-review` | You want to find bugs or compatibility issues in a code change | Issues found, the relevant code, and how to check them |
| `sharpen-challenge` | You need to check an assumption before committing to a plan | Evidence for or against the assumption and, if needed, a small test to check it |
| `sharpen-assess` | You need to assess risk and choose the model capability and reasoning effort for a task | The change risk, model and reasoning recommendations, and required checks |
| `sharpen-refine` | You want to simplify existing code or revise technical documentation within an agreed scope | Changes and check results, or a reason to leave the original as it is |
| `sharpen-cold-review` | You need a review in a separate context without the author's reasoning | Document comprehension or code correctness findings, or why isolation was unavailable |
| `sharpen-brief` | You are returning to a project or handing work to someone else | What has changed, what remains unresolved, and what to do next, with sources |
| `sharpen-dedupe` | You want to know whether repeated code can share one implementation | Duplicate locations and a proposal for what to share or keep separate; edits only when requested |

## Invoke a skill

Start your message with a skill name and the task:

```text
Codex:       $sharpen-review Check the current diff for bugs and compatibility issues.
Claude Code: /sharpen-review Check the current diff for bugs and compatibility issues.
```

These examples use Codex syntax. In Claude Code, replace the leading `$` with `/`. Send each example as a separate message and supply your actual paths or commit.

```text
$sharpen-clarify Read the API contract and define the scope for adding an assignee filter. Do not implement it yet.
$sharpen-challenge Check the main assumption in docs/retry-plan.md. Propose a local test with repeatable results.
$sharpen-assess Assess the proposed migration's risks and recommend model capability and reasoning effort. Do not run the migration.
$sharpen-refine Simplify src/parser.ts without changing its inputs, outputs, or error behavior. Only this file may change.
$sharpen-cold-review Review docs/runbook.md in a separate context without the author's reasoning. If that is unavailable, report why the review cannot run.
$sharpen-brief Summarize changes since <known-commit>, decisions still needed, and checks performed. Cite the sources.
$sharpen-dedupe Compare the normalization code in src/import-a.ts and src/import-b.ts. Propose what to share or keep separate without editing.
```

Agents can also select a skill based on your request. Your request still controls which files may change and how to report the result. Selecting a skill grants no edit permission and changes no model or provider settings. For `sharpen-cold-review`, use a separate context that excludes the author's reasoning. Continuing the same conversation does not provide that separation. See [Design](docs/design.md) for details.

## Update or remove

For an existing `rm-*` installation, follow [the replacement steps](docs/rename.md#replace-an-existing-project-installation). Updating an old name does not rename it.

Review local skill edits before updating or reinstalling. To update one project's installed skill:

```bash
npx skills update sharpen-review -p
```

To remove all eight from the current project:

```bash
npx skills remove sharpen-clarify sharpen-review sharpen-challenge sharpen-assess \
  sharpen-refine sharpen-cold-review sharpen-brief sharpen-dedupe
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
