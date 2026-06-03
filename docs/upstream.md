# Upstream Strategy

Codex Afterglow is a companion workaround and proof-of-concept. The preferred long-term fix is upstream Codex TUI behavior.

## What should go upstream

- Compact-aware TUI transcript folding/pruning after successful compaction.
- A config fallback for full pre-compaction transcript rendering.
- Tests proving model-history compaction and UI transcript folding are separate.
- Tests for resume/replay so old hidden UI history does not re-enter visible rendering unexpectedly.

## What should not go upstream

- Codex Afterglow installer logic.
- Binary replacement workflow.
- Local wrapper/npm/bun package mutation mechanics.
- Third-party branding.

## Posting stance

The issue/PR should lead with diagnosis and maintainability, not with the companion repo. Mention `codex-afterglow` only as a proof-of-concept/workaround after the evidence and upstream proposal.

Drafts:

- `upstream/issue-draft.md`
- `upstream/pr-plan.md`
