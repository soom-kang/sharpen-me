# Move to sharpen-me

The project was named refactor-me through `v0.8.10-beta.1`. The current checkout provides eight renamed skills; it does not install aliases for the previous names. The skill procedures and discovery descriptions are unchanged by this rename.

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

First inspect the installed paths with `npx skills list --agent codex claude-code`. Save any local edits outside the installed skill directories before removing them. Reconcile those edits with the new files after installation; do not overwrite them with an update command.

After the owner renames the GitHub repository and publishes the renamed files, run these commands from the project where you use the skills:

```bash
npx skills remove rm-scope rm-review rm-challenge rm-assess \
  rm-refine rm-review-fresh rm-brief rm-dedup
npx skills add soom-kang/sharpen-me --skill '*' --agent codex claude-code
npx skills list --agent codex claude-code
```

Choose Project scope. Inspect `.agents/skills/` and `.claude/skills/`: the selected new names should resolve to the new files, and the old eight names should be absent. Check a symlink's resolved destination as well as its label. Replace old names in your saved prompts and project instructions.

These commands target project installations. Global copies and unrelated skills remain in place. If a global copy still loads, inspect its path and choose how to handle it separately. No migration runs automatically.

The old tag still contains the old names. Changing a GitHub repository name does not change a tag's files. Use the current branch for the new names until a new release is published.
