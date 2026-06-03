# Source Build Path

Binary release is the default user path. Source build exists for auditing, development, and users who do not trust third-party binaries.

## Safety rules

- Build only inside an isolated checkout.
- Do not replace the global Codex binary as part of source build.
- Do not read or copy real `.codex` auth/config contents.
- Do not call real OpenAI APIs for build verification.

## Expected source target

The v1 patch target is:

- Codex tag: `rust-v0.136.0`
- Commit: `7ca611348db9446711ed16ed81c84095e3721cee`
- Workspace version: `0.136.0`

Future versions may be accepted only if source anchors, patch applicability/reverse-applicability, and offline effectiveness checks pass.

## Outline

```powershell
git clone https://github.com/openai/codex upstream-codex
Set-Location -LiteralPath '.\upstream-codex'
git checkout 7ca611348db9446711ed16ed81c84095e3721cee
git apply '..\codex-afterglow\patches\codex-tui-compact-aware-render\codex-tui-compact-aware-render.patch'
Set-Location -LiteralPath '.\codex-rs'
cargo test -p codex-tui compact_aware -- --nocapture
cargo test -p codex-tui compact_rebuild -- --nocapture
cargo test -p codex-core compact_aware -- --nocapture
cargo test -p codex-core config_schema -- --nocapture
cargo build --release -p codex-cli
```

A full optimized local build can take a long time. That is why normal users should prefer release binaries.

## Source patch metadata

See:

- `patches/codex-tui-compact-aware-render/manifest.json`
- `patches/codex-tui-compact-aware-render/codex-tui-compact-aware-render.patch`
- `patches/codex-tui-compact-aware-render/diff-numstat.txt`
