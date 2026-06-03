# Codex CLI 长上下文 / 多次 compaction 终端卡顿离线诊断报告

- Primary target: rust-v0.136.0 / `7ca611348db9446711ed16ed81c84095e3721cee`
- 实验类型：离线 / mock / synthetic fixture + source-level evidence。
- 未修改源码；未调用真实 API；未读取或复制真实 auth；运行状态隔离到 `_isolated_runs`。
- H1-H7 状态汇总：confirmed=3, inconclusive=2, rejected=2。

## 结论摘要

1. **H1 confirmed/high**：源码与合成 payload 证明 successful compaction 后 model history 被替换，旧 raw transcript 不再作为模型 prompt 线性增长来源。
2. **H3 confirmed/medium**：TUI `transcript_cells` 是独立 UI 历史容器，`InsertHistoryCell` 会持续 push；compaction 不会清理它。resize reflow 会基于 UI cells 重建终端 scrollback（Windows Terminal auto cap 9001 rows）。
3. **H5 confirmed/medium**：history insertion / pre-wrap 路径对每条历史 line 做 wrap 并对每个 wrapped row 输出终端写入；长输出、resume replay、resize replay 都可能产生 burst。
4. **H2 inconclusive/medium（本离线代理）**：modern replacement_history 使 resume reconstruction 从 newest replacement base + suffix replay 开始；synthetic 5k suffix 绝对耗时未达到 1000ms threshold，但 suffix 增长有明显比例效应，真实 resume-to-prompt 仍需交互式/二进制 instrumentation 才能定性。
5. **H4 inconclusive/low**：没有修改或 A/B Windows Terminal profile；只能确认终端 scrollback cap 会放大 H3/H5，不能证明 emulator 是 dominant root cause。
6. **H6 rejected/medium（本机 1MB synthetic draft）**：存在 full-text clone/scan 的 O(n) 源码模式，但代理测量未超过 100ms keypress threshold。
7. **H7 rejected/medium（local terminal lag 范围）**：resize/input/history insertion 路径不依赖 model API；本诊断未调用真实 API。

## 最可能的问题定位

- **主因候选 A：UI transcript 与 model history 分离**。模型上下文被 compact 后变小，但 TUI 的 `transcript_cells` 仍保留历史 UI cell；因此终端渲染/重排并不会因为 model prompt 变小而自动变轻。
- **主因候选 B：历史插入和 resize reflow 的 wrap/terminal write burst**。即使 0.136 已有 Windows Terminal 9001-row cap，仍可能在 resize、resume、initial replay、长输出插入时产生可感知 burst。
- **放大器：Windows Terminal scrollback/profile**。当前离线实验未做 profile A/B；它更像 H3/H5 的放大器而不是已独立确认的单一根因。

## 后续可行缓解 / 修复候选（未实施）

- C1：transcript virtualization / bounded reflow，只渲染最近窗口，完整审计仍保留在 rollout。
- C2：compact-aware UI folding，在 TUI 中把 pre-compaction UI 历史折叠为摘要 cell，而不是删除持久历史。
- C4：pre-wrap cache with width invalidation，避免相同 width 下重复 wrap/replay。
- C6：用户侧临时缓解：降低 terminal scrollback / Codex terminal_resize_reflow max_rows；但需要独立 profile A/B 验证后再建议具体值。

## Evidence

### H1 — confirmed / high

- Layer: `model_history`
- Evidence: .omx/long-context-lab/results/v0.136-h1-model-history.json, .omx/long-context-lab/results/v0.136-code-evidence.json
- Counter-evidence / boundary: Compaction request itself is built from pre-compact history before replacement; the bounded claim applies after successful replacement.
- Next action: If later fixing TUI lag, keep model-history replacement semantics separate from UI transcript retention.

### H2 — inconclusive / medium

- Layer: `rollout_replay_resume`
- Evidence: .omx/long-context-lab/results/v0.136-h2-rollout-replay.json, .omx/long-context-lab/results/v0.136-code-evidence.json
- Counter-evidence / boundary: This is a source-faithful Python replay proxy, not an instrumented Rust TUI resume measurement.
- Next action: Only run v0.135 control or Rust instrumentation if real resume-to-prompt p95 exceeds 1000ms.

### H3 — confirmed / medium

- Layer: `tui_transcript_reflow`
- Evidence: .omx/long-context-lab/results/v0.136-h3-tui-transcript.json, .omx/long-context-lab/results/v0.136-code-evidence.json
- Counter-evidence / boundary: 0.136 caps Windows Terminal resize reflow to 9001 rows, so this is not full raw-history replay on resize. Actual terminal p95 needs interactive PTY/terminal instrumentation.
- Next action: Future fix candidate C1/C2: virtualize/fold UI transcript after compaction while preserving rollout audit history.

### H4 — inconclusive / low

- Layer: `terminal_scrollback`
- Evidence: .omx/long-context-lab/results/v0.136-h4-terminal-scrollback.json, .omx/long-context-lab/results/v0.136-code-evidence.json
- Counter-evidence / boundary: The lab did not mutate or A/B Windows Terminal profiles, so emulator scrollback dominance cannot be proven offline.
- Next action: If user authorizes terminal-profile A/B, run an isolated Windows Terminal profile with scrollback 1000 vs 9001/32767 and scripted resize/key capture.

### H5 — confirmed / medium

- Layer: `history_insert_pre_wrap`
- Evidence: .omx/long-context-lab/results/v0.136-h5-history-insert.json, .omx/long-context-lab/results/v0.136-code-evidence.json
- Counter-evidence / boundary: Proxy excludes actual terminal emulator rendering cost; real p95 should be captured later before code patching.
- Next action: Future fix candidate C4: cache pre-wrap results by width / avoid replaying unchanged history rows.

### H6 — rejected / medium

- Layer: `input_draft_popup_sync`
- Evidence: .omx/long-context-lab/results/v0.136-h6-input-draft.json, .omx/long-context-lab/results/v0.136-code-evidence.json
- Counter-evidence / boundary: Synthetic 1MB draft proxy stays below the visible threshold on this machine if status is rejected; real IME/paste/popups may differ.
- Next action: Keep C5 as a lower-priority candidate unless real keypress p95 for large drafts exceeds 100ms.

### H7 — rejected / medium

- Layer: `api_dry_run`
- Evidence: .omx/long-context-lab/results/v0.136-h7-api-dry-run.json, .omx/long-context-lab/results/v0.136-code-evidence.json
- Counter-evidence / boundary: This rejects API/network as the cause of local keypress/resize/history-insert lag, not all perceived waiting during streaming model turns.
- Next action: For streaming wait complaints, isolate with local mock endpoint separately; do not use real API unless explicitly authorized.
