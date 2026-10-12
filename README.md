![sharpen-me](docs/assets/sharpen-me-title.png)

# sharpen-me

Eight skills for clarifying requests, reviewing changes, and refining code and documents in Codex and Claude Code.

[![Verify](https://github.com/soom-kang/sharpen-me/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/soom-kang/sharpen-me/actions/workflows/verify.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[한국어](docs/README.ko.md) · [Usage](docs/usage.md) · [GitHub Releases](https://github.com/soom-kang/sharpen-me/releases)

Current release: [v0.9.0-beta.4](https://github.com/soom-kang/sharpen-me/releases/tag/v0.9.0-beta.4), a GitHub Pre-release. It fixes evaluator redaction, call records, dispatch stopping, and Skill access grading. The 24 skill files are unchanged from beta.2 and beta.3.

## Install globally

Use Node.js 24.20.0 or later and Git, then run in your terminal.

```bash
npx skills add https://github.com/soom-kang/sharpen-me/tree/v0.9.0-beta.4 \
  --global --skill '*' --agent codex claude-code
```

Confirm the installation when prompted. This installs all eight skills from the beta.4 tag in your user scope. Rerunning the same tag installs the same release; choose a newer tag to update. Save local skill edits before reinstalling.

See [Usage](docs/usage.md) for skill selection, invocation examples, updates, and removal.

## Evaluation limits

The beta.2 candidate passed all 24 slots in a focused evaluation assembled from 68 calls. Beta.4 retains the same 24 skill files as beta.2 and beta.3; no new model evaluation was run for either later release. The full 576-call evaluation gate remains unmet. Tag installation identifies the source version; it does not constitute a new model evaluation.

[Results and limits](docs/evaluation.md) · [Design](docs/design.md) · [Maintenance](docs/maintenance.md) · [QA report (Korean, 2026-10-12)](docs/qa-2026-10-12.md)

MIT. [License](LICENSE).
