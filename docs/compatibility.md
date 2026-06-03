# Compatibility

Compatibility is evidence-gated, not guaranteed for every future Codex version.

## States

- `exact-supported`: manifest commit/version matches and the patch can be applied.
- `unpatched-compatible`: source appears compatible but exact patch state still needs apply verification.
- `already-patched`: reverse-apply or marker checks indicate the patch is already present.
- `drift-compatible`: Codex version drifted, but concrete source anchors are present and offline effectiveness passed.
- `unsupported-drift`: drifted version lacks anchors or required effectiveness evidence.
- `dirty-source`: relevant source tree is dirty before apply/verify.
- `effectiveness-failed`: offline semantic tests failed.
- `unsafe-install-target`: install target is not recognized as safe.
- `invalid-manifest`: manifest/schema gate failed.

## Concrete anchors

The manifest must name touched files, patch markers, semantic tests, and an optional binary self-check. Vague “source anchors” are not enough for drift compatibility.
