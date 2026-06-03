# Long-context diagnosis evidence

This folder contains repo-relative evidence for the Codex CLI long-context / post-compaction terminal lag diagnosis behind Codex Afterglow.

## Included

- `diagnosis-report.md` — human-readable H1-H7 offline diagnosis report.
- `diagnosis-matrix.json` — machine-readable H1-H7 status/evidence matrix.
- `completion-audit.json` — evaluator completion audit confirming isolation/no real API/no real auth read for the diagnosis run.
- `patch-quality-gate.json` — local patch verification gate summary.

## Summary

- H1: confirmed/high — model history is replaced after successful compaction.
- H3: confirmed/medium — TUI transcript cells remain separate from model history and are not cleared by compaction.
- H5: confirmed/medium — history insert/pre-wrap paths can produce bursty terminal writes.
- H2/H4: inconclusive with explicit boundaries.
- H6/H7: rejected for the local terminal-lag scope.

The diagnosis was offline/mock/source-level. It did not call real APIs and did not read/copy real auth keys.
