# Move to sharpen-me

Save local skill edits before replacing an `rm-*` installation. The project was named refactor-me through `v0.8.10-beta.1`; the new names have no compatibility aliases.

## Names

| Previous name | Current name |
| --- | --- |
| `rm-scope` | `sharpen-clarify` |
| `rm-review` | `sharpen-review` |
| `rm-challenge` | `sharpen-challenge` |
| `rm-assess` | `sharpen-assess` |
| `rm-refine` | `sharpen-refine` |
| `rm-review-fresh` | `sharpen-cold-review` |
| `rm-brief` | `sharpen-brief` |
| `rm-dedup` | `sharpen-dedupe` |

## Replace an existing project installation

Run these steps from the project where you use the skills.

1. Inspect the installation paths and save local edits **outside** the installed skill directories:

   ```bash
   npx skills list --agent codex claude-code
   ```

2. Remove the eight old names from this project:

   ```bash
   npx skills remove rm-scope rm-review rm-challenge rm-assess \
     rm-refine rm-review-fresh rm-brief rm-dedup
   ```

3. Install the new names from the current branch of `soom-kang/sharpen-me` and choose **Project** scope:

   ```bash
   npx skills add soom-kang/sharpen-me --skill '*' --agent codex claude-code
   ```

4. Check the installed list, `.agents/skills/`, and `.claude/skills/`. Confirm that the old names are absent and the new names point to the new files, including symlink destinations.

   ```bash
   npx skills list --agent codex claude-code
   ```

5. Reconcile saved edits with the new files and update skill names in saved prompts and project instructions. Do not overwrite your edits with an update command.

These steps leave global copies and unrelated skills in place. If an agent still loads a global copy, inspect that path and decide how to handle it separately. No migration runs automatically.

The rename commit preserved the skill procedures. The published [`v0.9.0-beta.1` Pre-release](https://github.com/soom-kang/sharpen-me/releases/tag/v0.9.0-beta.1) includes later instruction changes and supports the new names. See [fixed-version installation](../README.md#install).

The old `v0.8.10-beta.1` tag still contains the old names. Renaming the GitHub repository does not change files in existing tags.
