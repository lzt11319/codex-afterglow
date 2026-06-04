# Draft issue: Codex CLI TUI can remain sluggish after compaction because visible transcript rendering is not compact-aware

Status: draft only. Do not post without final confirmation.

## Summary

In long Codex CLI sessions, terminal interaction can remain sluggish after `/compact` or automatic compaction. The offline diagnosis suggests model-history compaction succeeds, but the TUI keeps a separate transcript history and can continue to reflow/render pre-compaction UI cells. This makes compaction reduce model prompt pressure without necessarily reducing terminal rendering pressure.

## Environment under diagnosis

- Codex target: `rust-v0.136.0`
- Commit: `7ca611348db9446711ed16ed81c84095e3721cee`
- Diagnosis type: offline/mock/source-level evidence plus synthetic fixture measurements
- Real API calls: none
- Real auth/config reads: none
- Source edits during diagnosis: none

## Evidence summary

Repo-relative evidence bundle paths before posting:

- Diagnosis report: `evidence/long-context-diagnosis/diagnosis-report.md`
- Diagnosis matrix: `evidence/long-context-diagnosis/diagnosis-matrix.json`
- Completion audit: `evidence/long-context-diagnosis/completion-audit.json`
- Patch quality gate: `evidence/long-context-diagnosis/patch-quality-gate.json`
- Evidence README: `evidence/long-context-diagnosis/README.md`

Hypothesis results:

| ID | Result | Evidence-bound interpretation |
| --- | --- | --- |
| H1 | confirmed / high | After successful compaction, model history is replaced; old raw transcript does not keep linearly entering the model prompt. |
| H2 | inconclusive / medium | `replacement_history` avoids replaying old prefix, but suffix growth still has proportional effects; real resume-to-prompt needs instrumentation. |
| H3 | confirmed / medium | TUI `transcript_cells` are separate from model history and are not cleared by compaction; resize/reflow can still process UI history. |
| H4 | inconclusive / low | Terminal scrollback/profile was not A/B tested; it may amplify rendering work but was not proven as the independent root cause. |
| H5 | confirmed / medium | History insert / pre-wrap paths can produce bursts proportional to historical lines and wrapped rows. |
| H6 | rejected / medium | Synthetic large-draft keypress path did not exceed the visible-lag threshold in the offline proxy. |
| H7 | rejected / medium | Local resize/input/history rendering paths do not require model API/network calls. |

## Expected behavior

After successful compaction, the TUI should not keep paying rendering/reflow cost for the full pre-compaction visible transcript by default. It should preserve enough recent context for continuity while bounding old transcript rendering work.

## Actual behavior suggested by diagnosis

Compaction reduces model-context pressure, but visible UI transcript history is independent. Long pre-compaction UI history can remain in TUI data structures and still affect resize/reflow/history insertion behavior.

## Proposed upstream direction

Make TUI transcript rendering compact-aware:

1. On successful compaction, rebuild the visible transcript around a compact boundary.
2. Preserve all post-compaction content.
3. Preserve the final pre-compaction turn in a lightweight form.
4. Fold older pre-compaction UI history into a single marker/summary cell.
5. Keep rollout/session audit data intact; this is about visible rendering, not record deletion.
6. Add a config fallback for users who prefer full-history rendering.

Possible config shape:

```toml
[tui]
compact_aware_rendering = true
```

Set to `false` to retain legacy full visible-history rendering.

## Suggested tests

- Unit test that compaction creates a compact boundary and TUI replay starts from the compact-aware visible window.
- Resume test that pre-compaction folded history does not expand back into visible transcript by default.
- Resize/reflow test that bounded visible history is used after compaction.
- Config test that `compact_aware_rendering = false` restores legacy full-rendering behavior.
- Regression test that model-history compaction remains independent from UI transcript folding.

## Companion proof-of-concept/workaround

A companion repo is available at https://github.com/lzt11319/codex-afterglow. It packages a compact-aware TUI patch and binary-first installer as a user workaround/proof-of-concept. It is not official and should not be treated as a substitute for an upstream fix.

## Posting checklist

- [ ] Attach or summarize the evidence bundle in a maintainer-readable way.
- [ ] Link to the companion repo only after the diagnosis/proposal.
- [x] Evidence paths are repo-relative; re-check before posting that no local private paths remain.
- [ ] Confirm current upstream Codex version and whether the issue still reproduces.
