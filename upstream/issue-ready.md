# Codex CLI TUI remains sluggish after compaction because visible transcript replay is not compact-aware

## Summary

In long Codex CLI sessions, terminal interaction can remain sluggish after `/compact` or automatic compaction. My offline diagnosis suggests that model-history compaction succeeds, but the TUI keeps a separate visible transcript history and can continue to render/reflow pre-compaction UI cells.

In other words, compaction reduces model prompt pressure, but it does not necessarily reduce terminal rendering pressure.

## Environment diagnosed

- Codex target: `rust-v0.136.0`
- Commit: `7ca611348db9446711ed16ed81c84095e3721cee`
- Diagnosis type: offline/mock/source-level evidence plus synthetic fixture measurements
- Real OpenAI API calls: none
- Real auth/config reads: none
- Source edits during diagnosis: none

I can re-run or adapt the diagnosis on a newer commit if maintainers prefer a current-main reproduction target.

## Evidence summary

The diagnosis intentionally separated model-history pressure from TUI transcript rendering pressure:

| ID | Result | Interpretation |
| --- | --- | --- |
| H1 | confirmed / high | After successful compaction, model history is replaced; the old raw transcript does not keep linearly entering the model prompt. |
| H2 | inconclusive / medium | `replacement_history` avoids replaying the old prefix, but suffix growth still has proportional effects; real resume-to-prompt needs deeper instrumentation. |
| H3 | confirmed / medium | TUI `transcript_cells` are separate from model history and are not cleared by compaction; resize/reflow can still process UI history. |
| H4 | inconclusive / low | Terminal scrollback/profile was not A/B tested; it may amplify rendering work but was not proven as an independent root cause. |
| H5 | confirmed / medium | History insert / pre-wrap paths can produce bursts proportional to historical lines and wrapped rows. |
| H6 | rejected / medium | Synthetic large-draft keypress path did not exceed the visible-lag threshold in the offline proxy. |
| H7 | rejected / medium | Local resize/input/history rendering paths do not require model API/network calls. |

The relevant repo-relative evidence bundle is published in a companion proof-of-concept repository:

- Diagnosis report: https://github.com/lzt11319/codex-afterglow/blob/master/evidence/long-context-diagnosis/diagnosis-report.md
- Diagnosis matrix: https://github.com/lzt11319/codex-afterglow/blob/master/evidence/long-context-diagnosis/diagnosis-matrix.json
- Completion audit: https://github.com/lzt11319/codex-afterglow/blob/master/evidence/long-context-diagnosis/completion-audit.json

## Expected behavior

After successful compaction, Codex CLI should not keep paying visible rendering/reflow cost for the full pre-compaction transcript by default. It should preserve enough recent context for continuity while bounding old transcript rendering work.

## Actual behavior suggested by diagnosis

Compaction reduces model-context pressure, but visible UI transcript history is independent. Long pre-compaction UI history can remain in TUI data structures and still affect resize/reflow/history insertion behavior.

## Proposed upstream direction

Make TUI transcript replay compact-aware:

1. On successful compaction, define a compact boundary in the visible transcript.
2. Preserve all post-compaction content.
3. Preserve the final pre-compaction turn in lightweight form: user message + assistant final answer; heavy tool output/logs/diffs from that turn are folded.
4. Fold older pre-compaction UI history into a single marker/summary cell.
5. Keep persistent rollout/session audit data intact; this is about visible rendering, not deleting records.
6. Add a config fallback for users who prefer legacy full-history rendering.

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

## Companion proof-of-concept / workaround

A companion repo is available at https://github.com/lzt11319/codex-afterglow. It packages a compact-aware TUI patch and binary-first installer as an unofficial user workaround/proof-of-concept.

Published release: https://github.com/lzt11319/codex-afterglow/releases/tag/afterglow-v0.1.0-alpha.0

This is not an official OpenAI project and is not intended as a substitute for an upstream fix. I am happy to open a smaller upstream PR if this direction is acceptable.
