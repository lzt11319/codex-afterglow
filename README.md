# Codex Afterglow

Codex Afterglow fixes a specific Codex CLI pain point: after a long session is compacted, the model context can shrink while the terminal still feels slow because the TUI keeps rendering old transcript history.

Afterglow is a binary-first companion patch for Codex CLI. It installs a compact-aware TUI renderer that folds pre-compaction transcript history, preserves the last pre-compaction turn and all post-compaction content, and keeps a config fallback for full-history rendering.

> Status: alpha staging. The local repo is ready for review, but public repo creation, first release publishing, and upstream issue/PR posting are still confirmation-gated. If no GitHub release assets exist yet, stop at dry-run and report that the binary release is not available.

## Easy Start

The easiest install path is to copy this prompt into a capable local coding agent:

```text
Please inspect https://github.com/lzt11319/codex-afterglow and install Codex Afterglow using the Binary release path. Prefer the published release binary and release manifest; do not use source-build unless no compatible binary release exists. First run dry-run/verification only and report my Codex install target, platform, version/commit if available, downloaded binary checksum, planned backup path, and exact rollback command. Do not read, copy, hash, or modify my real auth/config files. Do not modify npm/bun wrappers or local Codex wrapper chains. Only run the final --install replacement after all gates pass and I explicitly confirm.
```

Why this prompt is the recommended route: replacing a coding-agent binary is high trust. A local Agent can inspect your actual package layout, verify release checksums, confirm rollback, and stop if your Codex install is unsupported.

## Binary install path

After a release is published, the binary path is:

1. Clone or inspect this repository.
2. Run the installer in dry-run mode.
3. Verify the target binary, release manifest, SHA256, backup plan, and rollback command.
4. Run `--install` only after explicit user confirmation.

Example dry-run command, assuming a release named `afterglow-v0.1.0-alpha.0` exists:

```powershell
git clone https://github.com/lzt11319/codex-afterglow
Set-Location -LiteralPath '.\codex-afterglow'
node install/install.mjs --dry-run --json `
  --manifest "https://github.com/lzt11319/codex-afterglow/releases/download/afterglow-v0.1.0-alpha.0/afterglow.release.json" `
  --asset-base-url "https://github.com/lzt11319/codex-afterglow/releases/download/afterglow-v0.1.0-alpha.0/"
```

If dry-run succeeds and the user explicitly confirms replacement:

```powershell
node install/install.mjs --install --json `
  --manifest "https://github.com/lzt11319/codex-afterglow/releases/download/afterglow-v0.1.0-alpha.0/afterglow.release.json" `
  --asset-base-url "https://github.com/lzt11319/codex-afterglow/releases/download/afterglow-v0.1.0-alpha.0/"
```

The installer prints a rollback command. Save it before restarting Codex.

## What this project provides

- Binary-first releases for official npm/bun-managed `@openai/codex` native targets.
- A default-safe installer: no-argument/help and dry-run first; real replacement requires explicit `--install`.
- Backup and rollback for the current official Codex vendor binary.
- Release manifest and SHA256 verification before replacement.
- Source patch metadata and source-build instructions for users who prefer auditing over speed.
- Upstream issue/PR drafts focused on native Codex TUI behavior rather than installer mechanics.

## Safety summary

- Does not read, copy, hash, upload, or modify real Codex auth/config contents.
- Does not replace npm/bun wrappers or local Glow Mirror/wrapper chains by default.
- Refuses unknown install styles unless the user provides `--codex-binary <path>`.
- Creates a backup before replacement and prints a rollback command.
- Public repo creation, release publishing, and upstream issue/PR posting remain separately confirmation-gated during development.

See [SAFETY.md](SAFETY.md), [docs/installer.md](docs/installer.md), and [docs/rollback.md](docs/rollback.md).

## Why compaction alone does not solve this

The offline diagnosis behind this project found:

- Model history replacement after compaction works: old raw transcript does not keep linearly entering the model prompt.
- TUI transcript history is separate from model history: old UI cells can still be retained and reflowed after compaction.
- History insert and pre-wrap paths can produce bursty terminal writes proportional to historical lines and wrapped rows.

Afterglow targets the TUI layer: when compaction succeeds, the renderer folds pre-compaction UI history into a lightweight marker while keeping the last pre-compaction turn plus all post-compaction content visible. Full rendering can be restored by config.

## Compatibility

V1 targets official npm/bun-managed `@openai/codex` packages for these target triples:

- `x86_64-unknown-linux-musl`
- `aarch64-unknown-linux-musl`
- `x86_64-apple-darwin`
- `aarch64-apple-darwin`
- `x86_64-pc-windows-msvc`
- `aarch64-pc-windows-msvc`

Compatibility is evidence-gated, not promised for every future Codex release. Exact supported target is `rust-v0.136.0` / `7ca611348db9446711ed16ed81c84095e3721cee`; newer Codex versions require anchor checks and offline effectiveness evidence before being treated as drift-compatible.

Other install methods are advanced mode only and require an explicit `--codex-binary <path>`.

## Full-history fallback

If the upstream-compatible patch is installed but you want the old full transcript rendering behavior:

```toml
[tui]
compact_aware_rendering = false
```

Restart Codex after changing the config.

## Repository layout

| Path | Purpose |
| --- | --- |
| `install/` | Installer entrypoints. |
| `lib/` | Shared manifest, target, compatibility, and installer logic. |
| `manifest/` | Release/source manifest schema and examples. |
| `patches/` | Imported compact-aware TUI patch metadata. |
| `docs/` | Safety, compatibility, source-build, release, rollback, and design docs. |
| `evidence/` | Repo-relative diagnosis evidence for upstream drafts. |
| `integrations/` | Local integration snippets, including `upgrade-codex-omx`. |
| `upstream/` | Draft issue/PR materials for OpenAI Codex. |
| `fixtures/` | Disposable package fixtures for installer tests. |
| `tests/` | Fixture-based test harness. |
| `.github/workflows/` | Draft release workflow. |

## Development and verification

```powershell
npm test
node scripts/verify-source.mjs --manifest-only --json
node scripts/afterglow-status.mjs --json
```

These tests use fixtures and local metadata. They do not call real OpenAI APIs and do not read real auth/config contents.

For release/source evidence, run `verify-source` with an isolated OpenAI Codex checkout so source anchors are actually checked:

```powershell
node scripts/verify-source.mjs --repo-root '<isolated-openai-codex-source-root>' --json
```

## Relation to upstream Codex

This companion repository is a workaround/proof-of-concept. The preferred long-term solution is an upstream Codex TUI change. See [docs/upstream.md](docs/upstream.md), [upstream/issue-draft.md](upstream/issue-draft.md), and [upstream/pr-plan.md](upstream/pr-plan.md).
