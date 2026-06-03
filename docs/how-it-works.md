# How Codex Afterglow Works

Codex Afterglow addresses terminal/TUI work, not model-context construction.

## Diagnosis basis

The offline long-context lab for Codex CLI `rust-v0.136.0` found:

| Hypothesis | Result | Meaning for Afterglow |
| --- | --- | --- |
| H1 | confirmed / high | Successful compaction replaces model history; old raw transcript is not the main post-compaction prompt-growth source. |
| H3 | confirmed / medium | TUI `transcript_cells` history is separate from model history and is not cleared by compaction. |
| H5 | confirmed / medium | History insertion and pre-wrap paths can scale with historical lines and wrapped rows, creating bursty terminal writes. |
| H2 | inconclusive / medium | Resume replay may still have suffix-growth effects; this needs later instrumentation. |
| H4 | inconclusive / low | Terminal scrollback may amplify H3/H5, but was not proven as the independent root cause. |
| H6 | rejected / medium | Large draft/popup sync was not the primary local-lag explanation in the offline proxy. |
| H7 | rejected / medium | Local resize/input/history rendering paths do not depend on real API/network calls. |

## Patch idea

The patch makes the TUI compact-aware:

1. Detect successful context compaction events.
2. Rebuild the visible transcript so pre-compaction UI history is folded.
3. Preserve:
   - all content after the latest compaction;
   - the final pre-compaction turn in lightweight form;
   - a visible folded-history marker.
4. Avoid deleting persistent rollout/session audit data.
5. Allow full old behavior through config.

## Why not create a new session?

Starting a new session after compaction can avoid rendering pressure, but it changes thread/resume semantics and forces users to adopt a new command. Afterglow targets the lower layer: compaction should naturally reduce TUI rendering pressure in the same session.

## Fallback config

```toml
[tui]
compact_aware_rendering = false
```

After changing this setting, restart Codex.

## Non-goals

- Do not change model-history compaction semantics.
- Do not prune rollout audit history.
- Do not call real APIs during verification.
- Do not modify app-server behavior in this patch line.
