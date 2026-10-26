![sharpen-me](docs/assets/sharpen-me-title.png)

# sharpen-me

Eight skills for clarifying requests, reviewing changes, and refining code and documents in Codex and Claude Code.

[![Verify](https://github.com/soom-kang/sharpen-me/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/soom-kang/sharpen-me/actions/workflows/verify.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[한국어](docs/README.ko.md) · [Usage](docs/usage.md) · [GitHub Releases](https://github.com/soom-kang/sharpen-me/releases)

Current release: [v0.9.0-beta.6](https://github.com/soom-kang/sharpen-me/releases/tag/v0.9.0-beta.6), a GitHub Pre-release. It updates the release and installation documentation. The 24 skill files are unchanged from beta.2, beta.3, beta.4, and beta.5.

The revised checkout contains unreleased changes to all eight skills' selection boundaries and stopping rules, including assess's reasoning criteria and dedupe's semantic/action distinctions. These revisions are not included in the beta.6 tag and have no new model-evaluation result. See [revision scope and validation limits](docs/evaluation.md#unreleased-skill-revisions-2026-10-26).

## Install globally

Use Node.js 24.20.0 or later and Git, then run in your terminal.

```bash
npx skills add https://github.com/soom-kang/sharpen-me/tree/v0.9.0-beta.6 \
  --global --skill '*' --agent codex claude-code
```

Confirm the installation when prompted. This installs all eight skills from the beta.6 tag in your user scope. Rerunning the same tag installs the same release; choose a newer tag to update. Save local skill edits before reinstalling.

See [Usage](docs/usage.md) for skill selection, invocation examples, updates, and removal.

## Evaluation limits

The beta.2 candidate passed all 24 slots in a focused evaluation assembled from 68 calls. Beta.6 retains the same 24 skill files as beta.2, beta.3, beta.4, and beta.5; no new model evaluation was run for beta.3, beta.4, beta.5, or beta.6. The full 576-call evaluation gate remains unmet. Tag installation identifies the source version; it does not constitute a new model evaluation.

[Results and limits](docs/evaluation.md) · [Design](docs/design.md) · [Maintenance](docs/maintenance.md) · [QA report (Korean, 2026-10-12)](docs/qa-2026-10-12.md)

MIT. [License](LICENSE).
