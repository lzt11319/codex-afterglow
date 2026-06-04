# Security Policy

Codex Afterglow replaces a local Codex CLI vendor binary only when a user explicitly runs the installer with `--install`. Treat all binary replacement workflows as high trust.

## Supported scope

Current alpha support is limited to the release manifests and target binaries published by this repository for official npm/bun-managed `@openai/codex` native packages.

Unsupported or advanced layouts should fail closed unless a user explicitly provides `--codex-binary <path>`.

## Reporting concerns

Please open a GitHub issue for:

- installer target detection bugs;
- checksum or manifest mismatches;
- unsafe replacement or rollback behavior;
- compatibility drift against newer Codex releases.

Do not paste real Codex auth tokens, API keys, private config contents, or private transcripts into issues. Use redacted paths and minimal reproduction details.

## Current trust limitations

Before the first non-draft binary release, maintainers must disclose the status of:

- artifact attestations;
- SBOM;
- binary signing;
- reproducible-build limitations.

See [SAFETY.md](SAFETY.md) and [docs/release-trust.md](docs/release-trust.md).
