# Installer Behavior

The installer is intentionally conservative.

## Modes

- no arguments: print help and safe examples; no replacement.
- `--dry-run`: inspect only; no replacement.
- `--install`: explicit replacement after all gates pass.
- `--rollback <backup-dir>`: restore from backup without network access.

## Binary release inputs

The installer accepts either:

- `--asset <local-binary>` plus an expected checksum; or
- `--manifest <path-or-url>` plus `--asset-base-url <release-url>/`, where the manifest names the target binary and checksum.

Release assets are raw Codex binaries, not archives. This keeps install logic small and auditable: download, checksum, backup, replace, verify installed hash, print rollback.

All replacement installs require a non-placeholder trusted SHA256. Dry-run may report a placeholder SHA from the sample manifest, but the final `--install` path refuses placeholder checksums. Remote manifests/assets must use `https://`; local fixture tests may use `file://` or local paths. `http://` is refused.

Dry-run computes a planned `backupPath` and `rollbackCommand` without creating the backup directory. To preserve that exact path for the final install, pass the emitted path back with `--backup-dir`.

Example after a release exists:

```powershell
node install/install.mjs --dry-run --json `
  --manifest "https://github.com/lzt11319/codex-afterglow/releases/download/afterglow-v0.1.0-alpha.0/afterglow.release.json" `
  --asset-base-url "https://github.com/lzt11319/codex-afterglow/releases/download/afterglow-v0.1.0-alpha.0/"
```

## Real-machine auth/config rule

The installer must not open, copy, hash, or write real auth/config files. Fixture tests may use sentinel files to prove non-mutation; real runs avoid those paths entirely.

## Failure behavior

If a backup exists, every failure response must include `backupPath` and `rollbackCommand` in JSON output.
