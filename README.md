![sharpen-me](docs/assets/sharpen-me-title.png)

# sharpen-me

Eight skills for clarifying requests, reviewing changes, and refining code and documents in Codex and Claude Code.

[![Verify](https://github.com/soom-kang/sharpen-me/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/soom-kang/sharpen-me/actions/workflows/verify.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[한국어](docs/README.ko.md) · [Usage](docs/usage.md) · [GitHub Releases](https://github.com/soom-kang/sharpen-me/releases)

Current release: [v0.9.0-beta.8](https://github.com/soom-kang/sharpen-me/releases/tag/v0.9.0-beta.8), a GitHub Pre-release adding the bounded beta.7 evaluation runner and report. All 24 shipping skill files are unchanged from beta.7, which clarified selection boundaries, stopping rules, assess's risk and reasoning criteria, and dedupe's consolidation decisions.

The revised instructions have a bounded 32-call evaluation: 21 PASS and 11 UNCLEAR. Two manually identified defects remain within the UNCLEAR group under the frozen aggregation rules. See [results and limits](docs/evaluation.md#beta7-focused-evaluation-2026-10-26).

## Install globally

Use Node.js 24.20.0 or later and Git, then run in your terminal.

```bash
npx skills add https://github.com/soom-kang/sharpen-me/tree/v0.9.0-beta.8 \
  --global --skill '*' --agent codex claude-code
```

Confirm the installation when prompted. This installs all eight skills from the beta.8 tag in your user scope. Rerunning the same tag installs the same release; choose a newer tag to update. Save local skill edits before reinstalling.

See [Usage](docs/usage.md) for skill selection, invocation examples, updates, and removal.

## Evaluation limits

The beta.2 candidate passed all 24 slots in a focused evaluation assembled from 68 calls. Beta.7's separate 32-call evaluation is single-version and single-repetition; it did not fully pass and does not establish improvement over beta.2. The full 576-call evaluation gate remains unmet. Tag installation identifies the source version; it does not constitute a model evaluation.

[Results and limits](docs/evaluation.md) · [Design](docs/design.md) · [Maintenance](docs/maintenance.md) · [QA report (Korean, 2026-10-12)](docs/qa-2026-10-12.md)

MIT. [License](LICENSE).
