# Codex TUI compact-aware render patch

This patch package applies the local TUI-only compact-aware rendering change for Codex CLI `rust-v0.136.0` / commit `7ca611348db9446711ed16ed81c84095e3721cee`.

## Safety model

- Fails closed when target commit/version does not match.
- Fails closed when the patch neither applies nor reverse-applies cleanly.
- Does not modify npm wrappers, Glow Mirror, user `.codex` auth/config, or current global Codex CLI.
- Effectiveness checks are offline Cargo/rustfmt tests only; no real OpenAI API calls.

## Usage

From the Codex source repo root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .omx\patches\codex-tui-compact-aware-render\verify.ps1 -RepoRoot .
```

If `patchState` is `unpatched`, apply only after explicit confirmation:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .omx\patches\codex-tui-compact-aware-render\apply.ps1 -RepoRoot .
```

Then verify effectiveness:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .omx\patches\codex-tui-compact-aware-render\effectiveness.ps1 -RepoRoot . -Quick
```

Full fallback rendering can be restored by setting this in Codex config:

```toml
[tui]
compact_aware_rendering = false
```
