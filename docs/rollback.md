# Rollback

Every real install must create a backup before replacing the Codex vendor binary.

## Installer output

A successful install JSON includes:

- `targetBinary`
- `oldSha256`
- `newSha256`
- `backupPath`
- `rollbackCommand`
- `replaced: true`

Save `rollbackCommand` before restarting Codex.

## Roll back

From the `codex-afterglow` repository:

```powershell
node install/install.mjs --rollback '<backupPath-from-installer>' --json
```

The rollback command restores only the backed-up Codex vendor binary. It does not read auth/config files and does not change npm/bun wrappers.

Rollback validates backup metadata before copying:

- the backup binary must live inside the chosen backup directory;
- the recorded package root must contain an official `@openai/codex` or `@openai/codex-*` `package.json`;
- the target must match a recognized official Codex vendor binary path for the recorded target triple;
- the backup file hash must match the recorded old SHA256;
- advanced explicit-path backups require an explicit override.

## If install failed after backup

The installer should either auto-rollback or return enough information for manual recovery:

- backup path;
- exact rollback command;
- target binary path;
- old/new hashes when known;
- failure reason.

If the rollback command itself fails, keep the backup directory intact and inspect `backup.json` inside it.
