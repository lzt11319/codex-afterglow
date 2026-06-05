# Upstream PR Review Package

Status: prepared for user review only. Do not open an OpenAI Codex issue or PR without final confirmation.

## Local upstream branch

A clean local OpenAI Codex worktree was created at:

`D:\Codex_Workshop\_tmp\openai-codex-upstream-pr-check`

Branch:

`afterglow/compact-aware-tui-rendering`

Base:

`rust-v0.136.0` / `7ca611348db9446711ed16ed81c84095e3721cee`

Commits:

1. `8fab386 Add compact-aware TUI replay planning config`
2. `6f7c427 Apply compact-aware replay to TUI history and resume`
3. `b7bbafd Rebuild visible transcript after compaction`

## Patch files

These are split for review and can be applied in order:

1. `upstream/pr-series/0001-config-and-compact-replay-planner.patch`
2. `upstream/pr-series/0002-apply-compact-aware-replay-to-history-and-resume.patch`
3. `upstream/pr-series/0003-rebuild-live-transcript-after-compaction.patch`

A combined patch is also available:

`upstream/compact-aware-tui-rendering.upstream.patch`

The patch series excludes `Cargo.lock` version churn and all Codex Afterglow installer/release logic.

## Recommended upstream sequence

1. Open the issue first using `upstream/issue-ready.md`.
2. Wait for maintainer signal on config/default/scope if possible.
3. If maintainers want code immediately, open a PR using `upstream/pr-ready.md` and the local branch above.
4. If they prefer smaller PRs, open only commits 1-2 first, then follow with commit 3 after replay/resume behavior is accepted.

## Commands after final user confirmation only

Create issue:

```powershell
gh issue create --repo openai/codex `
  --title "Codex CLI TUI remains sluggish after compaction because visible transcript replay is not compact-aware" `
  --body-file upstream/issue-ready.md
```

Prepare a fork/branch and PR from the local upstream worktree:

```powershell
Set-Location -LiteralPath 'D:\Codex_Workshop\_tmp\openai-codex-upstream-pr-check'
# If no fork remote exists yet, create or add one before pushing.
# gh repo fork openai/codex --remote --remote-name lzt11319
# git push -u lzt11319 afterglow/compact-aware-tui-rendering
# gh pr create --repo openai/codex --head lzt11319:afterglow/compact-aware-tui-rendering --base main --title "Make TUI transcript replay compact-aware after compaction" --body-file 'D:\Codex_Workshop\codex-afterglow\upstream\pr-ready.md'
```

Do not run these commands until the user explicitly approves posting/submission.
