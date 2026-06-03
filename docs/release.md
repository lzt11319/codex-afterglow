# Release Workflow

The release workflow is manual (`workflow_dispatch`) and draft-first. It must not publish a public release by accident.

## Artifact shape

V1 publishes raw target binaries plus `afterglow.release.json`. The installer intentionally does not need archive extraction or package-manager mutation:

1. download the release manifest;
2. select the current platform target;
3. download the raw binary named by the manifest;
4. verify SHA256;
5. back up and replace the official Codex vendor binary;
6. verify the installed hash and print rollback.

## Runner labels

The matrix uses GitHub-hosted runner labels that match current GitHub documentation as of June 3, 2026:

- `ubuntu-latest` for Linux x64.
- `ubuntu-24.04-arm` for Linux arm64.
- `windows-latest` for Windows x64.
- `windows-11-arm` for Windows arm64.
- `macos-15-intel` for macOS Intel.
- `macos-latest` for macOS arm64.

Reference: https://docs.github.com/en/actions/reference/github-hosted-runners-reference

## Trust gate

Before a non-draft public release, decide and document:

- Artifact attestations.
- SBOM.
- Signing.
- Reproducible-build limitations.

The workflow currently keeps top-level permissions read-only and grants `contents: write` only to the optional draft-release job. Attestation/SBOM/signing permissions should be added only when those gates are implemented and verified.

## Public release gate

`create_draft_release` defaults to `false`. Even when true, the workflow creates a draft release; publishing the draft remains a separate confirmation step.
