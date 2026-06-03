# Safety Model

Codex Afterglow replaces a coding-agent vendor binary only after explicit install confirmation. That is a high-trust operation, so safety is part of the product contract.

## Hard rules

- Real auth/config contents must not be read, copied, hashed, uploaded, or modified.
- Official npm/bun wrappers must not be modified by default.
- Glow Mirror or other local wrapper chains must not be modified by default.
- Unknown install layouts must fail closed unless the user provides `--codex-binary <path>`.
- Every real replacement must create a backup first and print an exact rollback command.
- Failures after backup creation must include the rollback command, not only the backup path.

## Default CLI behavior

- No arguments: show help / safe dry-run guidance without inspecting or replacing files.
- `--dry-run`: inspect install target, version, asset, checksum, and planned backup without replacement.
- `--install`: perform replacement only after all gates pass.
- `--rollback <backup-dir>`: restore without network access.

## Trust gate

Before any public release, the project must decide and document:

- GitHub artifact attestations: planned / deferred.
- SBOM: planned / deferred.
- Binary signing: planned / deferred.
- Reproducible-build notes: planned / deferred.

Deferred items must be visible in README/release notes.
