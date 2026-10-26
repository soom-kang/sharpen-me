![sharpen-me](docs/assets/sharpen-me-title.png)

# sharpen-me

Eight skills for clarifying requests, reviewing changes, and refining code and documents in Codex and Claude Code.

[![Verify](https://github.com/soom-kang/sharpen-me/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/soom-kang/sharpen-me/actions/workflows/verify.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[한국어](docs/README.ko.md) · [Usage](docs/usage.md) · [GitHub Releases](https://github.com/soom-kang/sharpen-me/releases)

Current release: [v0.9.0-beta.7](https://github.com/soom-kang/sharpen-me/releases/tag/v0.9.0-beta.7), a GitHub Pre-release. It clarifies all eight skills' selection boundaries and stopping rules, separates assess's change-risk and reasoning criteria, and defines dedupe's equivalence and consolidation decisions.

The revised instructions have no new model-evaluation result. See [revision scope and validation limits](docs/evaluation.md#beta7-skill-revisions-2026-10-26).

## Install globally

Use Node.js 24.20.0 or later and Git, then run in your terminal.

```bash
npx skills add https://github.com/soom-kang/sharpen-me/tree/v0.9.0-beta.7 \
  --global --skill '*' --agent codex claude-code
```

Confirm the installation when prompted. This installs all eight skills from the beta.7 tag in your user scope. Rerunning the same tag installs the same release; choose a newer tag to update. Save local skill edits before reinstalling.

See [Usage](docs/usage.md) for skill selection, invocation examples, updates, and removal.

## Evaluation limits

The beta.2 candidate passed all 24 slots in a focused evaluation assembled from 68 calls. That historical result does not evaluate beta.7's revised instructions. No new model evaluation was run for beta.7, and the full 576-call evaluation gate remains unmet. Tag installation identifies the source version; it does not constitute a new model evaluation.

[Results and limits](docs/evaluation.md) · [Design](docs/design.md) · [Maintenance](docs/maintenance.md) · [QA report (Korean, 2026-10-12)](docs/qa-2026-10-12.md)

MIT. [License](LICENSE).
