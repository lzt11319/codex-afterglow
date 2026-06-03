# Release Trust Gate

Codex Afterglow replaces a coding-agent vendor binary, so releases need a visible trust model.

## V1 release position

Before any public non-draft release, the release notes must state the exact status of:

| Item | V1 status | User-visible rule |
| --- | --- | --- |
| SHA256 manifest | required | Installer refuses mismatched assets. |
| GitHub draft release | required first | Draft must be reviewed before publish. |
| Artifact attestations | planned gate | Do not claim attestation until workflow emits and verifies it. |
| SBOM | deferred unless implemented | If deferred, release notes must say no SBOM is included. |
| Binary signing | deferred unless implemented | If deferred, release notes must say binaries are unsigned beyond GitHub provenance/checksums. |
| Reproducible builds | documented limitation | Rust/GitHub-hosted runner builds are not claimed bit-reproducible unless proven. |

## Minimum release checklist

- Workflow run is tied to a Git tag and exact OpenAI Codex commit.
- Release manifest contains all six target triples or explicitly omits unsupported ones.
- Every asset SHA256 matches the manifest.
- Installer fixture tests pass.
- Source verifier passes.
- README, SAFETY, rollback docs, and release notes disclose trust limitations.

## References for maintainers

- GitHub hosted runner labels: https://docs.github.com/en/actions/reference/github-hosted-runners-reference
- GitHub artifact attestations: https://docs.github.com/en/actions/security-guides/using-artifact-attestations-to-establish-provenance-for-builds
