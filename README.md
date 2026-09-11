![sharpen-me](docs/assets/sharpen-me-title.png)

# sharpen-me

Eight skills to clarify requests, review work, assess risk, and refine code and documents with Codex and Claude Code.

[![Verify](https://github.com/soom-kang/sharpen-me/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/soom-kang/sharpen-me/actions/workflows/verify.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Public beta: v0.9.0-beta.1](https://img.shields.io/badge/Public_beta-v0.9.0--beta.1-orange)](https://github.com/soom-kang/sharpen-me/releases/tag/v0.9.0-beta.1)

**Public beta `v0.9.0-beta.1` has not passed behavior evaluation.** Read the [evaluation results and limits](docs/evaluation-v0.9.0-beta.1.ko.md) for remaining failures, unclear results, and unrun cases before use.

[한국어](docs/README.ko.md) · [Releases](https://github.com/soom-kang/sharpen-me/releases) · [Design](docs/design.md) · [Evaluation](docs/evaluation.md) · [Maintenance](docs/maintenance.md)

## Install

1. Use **Node.js 24.20.0 or later** and open the project where you want the skills.
2. Install from the current `main` branch:

   ```bash
   npx skills add soom-kang/sharpen-me
   ```

3. Select your skills and agents, then choose **Project** scope. You can decline the optional `find-skills` global installation.

Codex uses `.agents/skills/`; Claude Code uses `.claude/skills/`. If project and global copies coexist, check the resolved path to confirm which copy your agent reads. For an existing `rm-*` installation, follow the [replacement steps](docs/rename.md#replace-an-existing-project-installation).

<details>
<summary>Install all eight, one skill, or a fixed version</summary>

Choose **Project** scope for these commands.

All eight for both agents:

```bash
npx skills add soom-kang/sharpen-me --skill '*' --agent codex claude-code
```

Only `sharpen-review` for both agents:

```bash
npx skills add soom-kang/sharpen-me --skill sharpen-review --agent codex claude-code
```

Pin the published Pre-release instead of following `main`:

```bash
npx skills add https://github.com/soom-kang/sharpen-me/tree/v0.9.0-beta.1 --skill '*' --agent codex claude-code
```

Read the [published release notes](https://github.com/soom-kang/sharpen-me/releases/tag/v0.9.0-beta.1) for validation and known limits. Each skill carries its own instructions, metadata, and license for standalone installation.

</details>

<details>
<summary>List available and installed skills</summary>

```bash
npx skills add soom-kang/sharpen-me --list
npx skills list --agent codex claude-code
```

</details>

## Skills

| Skill | Use it when | Result |
| --- | --- | --- |
| `sharpen-clarify` | The implementation scope is unclear | Unresolved decisions, or a scope report when requested |
| `sharpen-review` | You want to find defects in a code change | Findings, relevant code, and ways to check them |
| `sharpen-challenge` | A plan depends on an untested assumption | Supporting or opposing evidence and a test if needed |
| `sharpen-assess` | You need to judge risk and model requirements | Change risk, model capability, reasoning effort, and required checks |
| `sharpen-refine` | You want to simplify code or revise technical prose | Scoped changes and checks, or a reason to keep the original |
| `sharpen-cold-review` | You need a review without the author's reasoning | Document or code findings, or why isolation was unavailable |
| `sharpen-brief` | You return to a project or hand it over | Changes, open decisions, and next steps with sources |
| `sharpen-dedupe` | You need to decide whether repeated code can share an owner | What to share or keep separate; edits only when authorized |

## Invoke a skill

Start your message with an installed skill name and the task.

```text
Codex:       $sharpen-review Check the current diff for bugs and compatibility issues.
Claude Code: /sharpen-review Check the current diff for bugs and compatibility issues.
```

<details>
<summary>Examples for the other skills</summary>

Send one example per message and replace paths or commits with your own. In Claude Code, replace the leading `$` with `/`.

```text
$sharpen-clarify Read the API contract and define the scope for adding an assignee filter. Do not implement it yet.
$sharpen-challenge Check the main assumption in docs/retry-plan.md. Propose a local test with repeatable results.
$sharpen-assess Assess the proposed migration's risks and recommend model capability and reasoning effort. Do not run the migration.
$sharpen-refine Simplify src/parser.ts without changing its inputs, outputs, or error behavior. Only this file may change.
$sharpen-cold-review Review docs/runbook.md in a separate context without the author's reasoning. If that is unavailable, report why the review cannot run.
$sharpen-brief Summarize changes since <known-commit>, decisions still needed, and checks performed. Cite the sources.
$sharpen-dedupe Compare the normalization code in src/import-a.ts and src/import-b.ts. Propose what to share or keep separate without editing.
```

</details>

Agents can select a skill from your request. You control edit permissions, model settings, and output format. For a cold review, use a separate context without the author's reasoning. Continuing the same conversation does not meet that condition. See [Design](docs/design.md).

## Update or remove

Save local skill edits before updating or reinstalling. Updating an old `rm-*` name does not rename it; use the [replacement steps](docs/rename.md#replace-an-existing-project-installation).

Update one skill in the current project:

```bash
npx skills update sharpen-review -p
```

Remove the eight named skills from the current project:

```bash
npx skills remove sharpen-clarify sharpen-review sharpen-challenge sharpen-assess \
  sharpen-refine sharpen-cold-review sharpen-brief sharpen-dedupe
```

Without `--agent`, removal covers the shared project location and agent paths. Other skills and global installations remain in place.

## Verify

From a repository checkout:

```bash
npm ci --ignore-scripts
npm run verify
npm run test:install
npm run eval -- --dry-run
```

These commands check packaging, links, evaluation tools, and installation. Dry run lists the evaluation plan without provider calls. Local checks do not establish behavior quality.

[Maintenance and check coverage](docs/maintenance.md#local-checks) · [Evaluation results and criteria](docs/evaluation.md)

## License

MIT. See [LICENSE](LICENSE). Each standalone skill includes the license.
