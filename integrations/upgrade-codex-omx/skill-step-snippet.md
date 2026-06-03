### Step 6.5. Codex Afterglow binary reapply（半自动，binary-first）

当用户明确要求“升级后保留 Codex Afterglow / compact-aware TUI rendering / 长上下文 compact 后折叠旧 TUI 历史”时，在 Codex 升级后、最终验证前执行本节。

默认本地仓库位置：

- `D:\Codex_Workshop\codex-afterglow`

默认策略：优先使用 `codex-afterglow` 的可信 binary release；源码 patch/build 只作为无兼容 release 时的显式 fallback。

1. 先做 verify-only status，不替换文件：

```powershell
Set-Location -LiteralPath 'D:\Codex_Workshop\codex-afterglow'
node scripts/afterglow-status.mjs --json `
  --manifest "https://github.com/lzt11319/codex-afterglow/releases/download/<afterglow-release-tag>/afterglow.release.json" `
  --asset-base-url "https://github.com/lzt11319/codex-afterglow/releases/download/<afterglow-release-tag>/"
```

2. 再做 installer dry-run，不替换文件：

```powershell
node install/install.mjs --dry-run --json `
  --manifest "https://github.com/lzt11319/codex-afterglow/releases/download/<afterglow-release-tag>/afterglow.release.json" `
  --asset-base-url "https://github.com/lzt11319/codex-afterglow/releases/download/<afterglow-release-tag>/"
```

3. 只有当 dry-run 明确给出安全 target、release sha、backup/rollback plan 且用户明确确认后，才执行：

```powershell
node install/install.mjs --install --json `
  --manifest "https://github.com/lzt11319/codex-afterglow/releases/download/<afterglow-release-tag>/afterglow.release.json" `
  --asset-base-url "https://github.com/lzt11319/codex-afterglow/releases/download/<afterglow-release-tag>/"
```

4. 安全边界：
   - 不读取、复制、hash 或修改真实 `.codex` auth/config 内容。
   - 不修改 npm/bun wrapper、Glow Mirror wrapper、native hooks 或 PowerShell wrapper。
   - 不静默替换当前全局 Codex vendor binary；必须先展示 dry-run 和 rollback。
   - 无兼容 binary release 时 fail closed，转为源码 patch/build 适配计划，不要 fuzzy apply。

5. 生效步骤：替换后必须重开终端/Codex/OMX 会话。

