![sharpen-me](docs/assets/sharpen-me-title.png)

# sharpen-me

Eight skills for clarifying requests, reviewing changes, and refining code and documents in Codex and Claude Code.

[![Verify](https://github.com/soom-kang/sharpen-me/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/soom-kang/sharpen-me/actions/workflows/verify.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[한국어](docs/README.ko.md) · [Usage](docs/usage.md) · [GitHub Releases](https://github.com/soom-kang/sharpen-me/releases)

Current release: [v0.9.0-beta.9](https://github.com/soom-kang/sharpen-me/releases/tag/v0.9.0-beta.9), a GitHub Pre-release. All eight skills gained English and Korean trigger vocabulary, a completion check, and an optional `Next:` handoff line; dedupe and challenge add rules for the two defects found in beta.7's evaluation, and review gains default severities. The evaluator also classifies source access more precisely and can run a no-skill control arm.

These revised instructions have no completed model evaluation: the follow-up pilot stopped after two of four calls and was not graded. See [revision scope and limits](docs/evaluation.md#beta9-skill-and-evaluator-revisions-2026-10-31).

## Install globally

Use Node.js 24.20.0 or later and Git, then run in your terminal.

```bash
npx skills add https://github.com/soom-kang/sharpen-me/tree/v0.9.0-beta.9 \
  --global --skill '*' --agent codex claude-code
```

Confirm the installation when prompted. This installs all eight skills from the beta.9 tag in your user scope. Rerunning the same tag installs the same release; choose a newer tag to update. Save local skill edits before reinstalling.

See [Usage](docs/usage.md) for skill selection, invocation examples, updates, and removal.

## Evaluation limits

The beta.2 candidate passed all 24 slots in a focused evaluation assembled from 68 calls. Beta.7's separate 32-call evaluation is single-version and single-repetition; it did not fully pass and does not establish improvement over beta.2. Beta.9's revised instructions have no completed evaluation. The full 576-call evaluation gate remains unmet. Tag installation identifies the source version; it does not constitute a model evaluation.

[Results and limits](docs/evaluation.md) · [Design](docs/design.md) · [Maintenance](docs/maintenance.md) · [QA report (Korean, 2026-10-12)](docs/qa-2026-10-12.md)

MIT. [License](LICENSE).
