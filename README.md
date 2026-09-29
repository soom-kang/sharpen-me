![sharpen-me](docs/assets/sharpen-me-title.png)

# sharpen-me

Eight skills for clarifying requests, reviewing changes, and refining code and documents in Codex and Claude Code.

[![Verify](https://github.com/soom-kang/sharpen-me/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/soom-kang/sharpen-me/actions/workflows/verify.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[한국어](docs/README.ko.md) · [Usage](docs/usage.md) · [GitHub Releases](https://github.com/soom-kang/sharpen-me/releases)

## Install globally

Use Node.js 24.20.0 or later and Git, then run in your terminal.

```bash
npx skills add soom-kang/sharpen-me --global --skill '*' --agent codex claude-code
```

Confirm the installation when prompted. This installs skills from the current default branch in your user scope. Run an update to receive later changes.

See [Usage](docs/usage.md) for skill selection, invocation examples, updates, and removal.

## Evaluation limits

The public beta passed all 24 candidate slots in a focused evaluation assembled from 68 calls. The full 576-call evaluation gate remains unmet. Installing the default branch does not establish equivalence to an evaluated release.

[Results and limits](docs/evaluation.md) · [Design](docs/design.md) · [Maintenance](docs/maintenance.md)

MIT. [License](LICENSE).
