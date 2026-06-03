# Local Upgrade Integration

This document describes how to keep Codex Afterglow across local `upgrade-codex-omx` runs without replacing the current global Codex binary silently.

## Default stance

- Prefer trusted Codex Afterglow release binaries over local source rebuilds.
- Run verify/dry-run first.
- Only run `--install` after explicit user confirmation.
- Preserve npm/bun wrappers, Glow Mirror wrappers, native hooks, PowerShell wrappers, and real `.codex` auth/config contents.
- If no compatible release exists, stop and report; use source patch/build only as an explicit fallback.

## Verify-only status command

From this repo:

```powershell
node scripts/afterglow-status.mjs --json `
  --manifest "https://github.com/lzt11319/codex-afterglow/releases/download/afterglow-v0.1.0-alpha.0/afterglow.release.json" `
  --asset-base-url "https://github.com/lzt11319/codex-afterglow/releases/download/afterglow-v0.1.0-alpha.0/"
```

The status script reports the Codex vendor binary path and hash, package version, release target asset/sha, backup inventory if present, and a reapply dry-run command. It does not replace files.

## Upgrade skill insertion point

Use or merge the Step 6.5 snippet in `integrations/upgrade-codex-omx/skill-step-snippet.md` at the Codex Afterglow/compact-aware-render integration point before final upgrade validation.

Do not run the final install command as part of the upgrade skill unless the user explicitly confirms the binary replacement after seeing dry-run output.

