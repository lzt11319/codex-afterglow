# Draft PR Plan: compact-aware TUI transcript rendering

Status: draft only. Do not open a PR without final confirmation.

## Intent

Upstream the compact-aware TUI rendering behavior without including any Codex Afterglow installer, release workflow, or binary replacement mechanics.

## Proposed source scope

Likely touched areas based on the proof-of-concept patch:

- `codex-rs/config/src/types.rs` — add TUI config flag.
- `codex-rs/core/config.schema.json` — expose schema entry.
- `codex-rs/core/src/config/mod.rs` and config tests — parse/default config behavior.
- `codex-rs/tui/src/app.rs` and app helpers — trigger compact-aware rebuild after compaction.
- `codex-rs/tui/src/chatwidget/replay.rs` — replay/fold visible transcript.
- `codex-rs/tui/src/resume_picker.rs` and transcript helpers — keep resume visible transcript compact-aware.
- TUI tests under `codex-rs/tui/src/.../tests`.

The final PR should be smaller than the companion patch if maintainers prefer a narrower design.

## Behavior contract

Default behavior:

- After successful compaction, visible transcript rendering keeps:
  - all content after the latest compaction;
  - the final pre-compaction turn in lightweight form;
  - one folded-history marker for older pre-compaction transcript.
- Persistent rollout/session history remains available; no audit deletion.
- Users can disable compact-aware rendering via config.

Fallback:

```toml
[tui]
compact_aware_rendering = false
```

## Test plan

- Config schema/default tests for `compact_aware_rendering`.
- Unit tests for compact boundary reconstruction.
- Replay tests proving old folded history does not re-expand into visible TUI after compaction.
- Resume tests proving same-thread resume remains compact-aware.
- Width/reflow tests proving bounded visible history is used after compaction.
- Regression test proving model-history compaction behavior is unchanged.

## Non-scope

- Codex Afterglow installer.
- GitHub release assets or checksums.
- npm/bun package replacement.
- Glow Mirror or local wrapper behavior.
- Real API-based performance tests.

## Evidence to cite in PR body

- H1/H3/H5 confirmed in offline diagnosis.
- H2/H4 inconclusive and not overclaimed.
- H6/H7 rejected for the local terminal-lag scope.
- Companion proof-of-concept effectiveness logs, if the user chooses to share them.

## Draft PR body skeleton

```text
This PR makes Codex CLI TUI rendering compact-aware after successful compaction.

Motivation:
- Model-history compaction already replaces the model prompt history.
- TUI transcript history is separate and can still drive visible rendering/reflow cost after compaction.

Change:
- Add compact-aware visible transcript rebuild after compaction.
- Preserve post-compaction content and the final pre-compaction turn.
- Fold older pre-compaction UI history into a marker.
- Add config fallback for full-history rendering.

Tests:
- <list exact cargo tests>

Notes:
- This does not change model-history compaction semantics.
- This does not delete rollout/session audit history.
```
