# PR title

Make TUI transcript replay compact-aware after compaction

# PR body

## Summary

This PR makes Codex CLI TUI transcript replay compact-aware after successful context compaction.

The goal is to bound visible transcript rendering/reflow work after compaction without changing model-history compaction semantics and without deleting persistent session/audit data.

## Motivation

The issue this addresses is that model-history compaction and visible TUI transcript replay are separate concerns:

- Model-history compaction can successfully replace the model prompt history.
- The TUI can still retain/replay/reflow old pre-compaction transcript cells.
- Long sessions can therefore remain terminal-sluggish even after model-context pressure has been reduced.

## Behavior

Default behavior after the latest compaction:

- Preserve all post-compaction content.
- Preserve the final pre-compaction turn in lightweight form:
  - user message;
  - assistant final answer.
- Fold older pre-compaction transcript history into a lightweight marker.
- Fold heavy tool output/log/diff content from the final pre-compaction turn into a summary marker.

Persistent rollout/session records are not deleted. This only affects visible TUI replay/rendering.

## Config fallback

Users can restore legacy full visible-history rendering with:

```toml
[tui]
compact_aware_rendering = false
```

The default is `true`.

## Commit structure prepared locally

The local review branch is intentionally split into three commits:

1. `Add compact-aware TUI replay planning config`
   - config flag and schema;
   - compact-aware replay planner;
   - planner/config tests.
2. `Apply compact-aware replay to TUI history and resume`
   - chat history replay;
   - resume picker transcript/preview;
   - replay/resume regression tests.
3. `Rebuild visible transcript after compaction`
   - live compaction event handling;
   - visible transcript rebuild;
   - suppression for already replayed post-compaction suffix events.

This avoids including any companion installer, binary release workflow, package manager replacement logic, or local wrapper behavior.

## Tests

Targeted offline tests from the proof-of-concept/release validation:

```bash
cargo test -p codex-core compact_aware -- --nocapture
cargo test -p codex-tui compact_aware -- --nocapture
cargo test -p codex-tui compact_rebuild -- --nocapture
cargo test -p codex-core config_schema -- --nocapture
```

Additional local validation before opening this PR:

- `just fmt` completed successfully in `codex-rs`.
- `git diff --check` completed successfully.
- Patch series applies cleanly on `rust-v0.136.0` / `7ca611348db9446711ed16ed81c84095e3721cee`.
- Current-main adaptation was applied against `openai/codex@55aa071b17c825bdb66fac99cde2e7a7acfbdee7`.
- `Cargo.lock` version churn from the companion build is excluded from the upstream patch series.

I attempted current-main scoped local checks on Windows (`just test -p codex-tui compact_aware` and `cargo check -p codex-tui`). They were blocked before compiling the PR code by local third-party native build environment issues (`aws-lc-sys` C/ASM/CMake generator configuration, then `v8` requiring symlink privileges). I am relying on repository CI for full cross-platform compilation/testing.

## Non-goals

- No Codex Afterglow installer logic.
- No binary replacement workflow.
- No npm/bun package mutation mechanics.
- No local wrapper / Glow Mirror behavior.
- No real API-based performance benchmark in the PR.

## Maintainer questions

1. Is the `tui.compact_aware_rendering` config shape acceptable, or would maintainers prefer a different name/location?
2. Should resume-picker compact-aware preview be included in the first PR, or split into a follow-up?
3. Should the default be enabled immediately, or guarded behind a temporary opt-in flag for one release?
4. Would maintainers prefer the live transcript rebuild commit to land separately after replay/resume support?

## Related evidence / proof of concept

Companion proof-of-concept and offline diagnosis:

- Repo: https://github.com/lzt11319/codex-afterglow
- Evidence report: https://github.com/lzt11319/codex-afterglow/blob/master/evidence/long-context-diagnosis/diagnosis-report.md
- Published proof-of-concept release: https://github.com/lzt11319/codex-afterglow/releases/tag/afterglow-v0.1.0-alpha.0

This companion repo is unofficial and only used here as evidence/proof-of-concept context.
