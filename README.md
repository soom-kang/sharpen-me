![sharpen-me](docs/assets/sharpen-me-title.png)

# sharpen-me

Eight skills for clarifying requests, reviewing changes, and refining code and documents in Codex and Claude Code.

[![Verify](https://github.com/soom-kang/sharpen-me/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/soom-kang/sharpen-me/actions/workflows/verify.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[한국어](docs/README.ko.md) · [Usage](docs/usage.md) · [GitHub Releases](https://github.com/soom-kang/sharpen-me/releases)

Current release: [v0.9.0-beta.4](https://github.com/soom-kang/sharpen-me/releases/tag/v0.9.0-beta.4), a GitHub Pre-release. It fixes evaluator redaction, call records, dispatch stopping, and Skill access grading, and adds Homebrew distribution. The 24 skill files are unchanged from beta.2 and beta.3.

## Install globally

Use Node.js 24.20.0 or later and Git, then run in your terminal.

```bash
npx skills add soom-kang/sharpen-me --global --skill '*' --agent codex claude-code
```

Confirm the installation when prompted. This installs skills from the current default branch in your user scope. Rerun this command to receive later changes, preserving any local skill edits first.

### Homebrew

Install the release package, then register its skills with your agents:

```bash
brew install soom-kang/sharpen-me/sharpen-me
npx skills add "$(brew --prefix sharpen-me)/share/sharpen-me" \
  --global --skill '*' --agent codex claude-code
```

Homebrew installs the package under its own prefix. It does not register or modify your agent skills. After `brew upgrade`, rerun the registration command to refresh agent copies; `brew uninstall sharpen-me` leaves those copies in place. Save local skill edits before reinstalling. The [tap](https://github.com/soom-kang/homebrew-sharpen-me) contains the formula.

See [Usage](docs/usage.md) for skill selection, invocation examples, updates, and removal.

## Evaluation limits

The beta.2 candidate passed all 24 slots in a focused evaluation assembled from 68 calls. Beta.4 retains the same 24 skill files as beta.2 and beta.3; no new model evaluation was run for either later release. The full 576-call evaluation gate remains unmet. Installing the default branch does not establish equivalence to an evaluated release.

[Results and limits](docs/evaluation.md) · [Design](docs/design.md) · [Maintenance](docs/maintenance.md) · [QA report (Korean, 2026-10-12)](docs/qa-2026-10-12.md)

MIT. [License](LICENSE).
