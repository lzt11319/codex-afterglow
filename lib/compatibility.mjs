export const COMPATIBILITY_STATES = Object.freeze([
  'exact-supported',
  'drift-compatible',
  'already-patched',
  'unpatched-compatible',
  'unsupported-drift',
  'dirty-source',
  'effectiveness-failed',
  'unsafe-install-target',
  'invalid-manifest'
]);

export function assessCompatibility({
  manifest,
  actualCommit,
  actualVersion,
  patchState = 'unknown',
  anchorsOk = false,
  dirtySource = false,
  effectiveness = 'not-run',
  unsafeInstallTarget = false,
  manifestValid = true
} = {}) {
  if (!manifestValid) return state('invalid-manifest', false, 'MANIFEST_INVALID');
  if (unsafeInstallTarget) return state('unsafe-install-target', false, 'UNSAFE_INSTALL_TARGET');
  if (dirtySource) return state('dirty-source', false, 'DIRTY_SOURCE');
  if (effectiveness === 'failed') return state('effectiveness-failed', false, 'EFFECTIVENESS_FAILED');
  if (patchState === 'already-applied') return state('already-patched', true);

  const exact = actualCommit === manifest?.codex?.commit && actualVersion === manifest?.codex?.workspaceVersion;
  if (exact && patchState === 'unpatched') return state('exact-supported', true);
  if (exact && patchState === 'unknown') return state('unpatched-compatible', true);

  if (!exact) {
    if (anchorsOk && (patchState === 'unpatched' || patchState === 'unknown') && effectiveness === 'passed') {
      return state('drift-compatible', true);
    }
    return state('unsupported-drift', false, anchorsOk ? 'EFFECTIVENESS_REQUIRED_FOR_DRIFT' : 'SOURCE_ANCHOR_MISSING');
  }

  return state('unpatched-compatible', true);
}

function state(compatibilityState, ok, refusalReason = null) {
  return { ok, compatibilityState, refusalReason };
}
