export const TARGETS = Object.freeze({
  'linux:x64': {
    targetTriple: 'x86_64-unknown-linux-musl',
    platformPackage: '@openai/codex-linux-x64',
    binaryName: 'codex',
    archiveExt: 'tar.gz'
  },
  'linux:arm64': {
    targetTriple: 'aarch64-unknown-linux-musl',
    platformPackage: '@openai/codex-linux-arm64',
    binaryName: 'codex',
    archiveExt: 'tar.gz'
  },
  'darwin:x64': {
    targetTriple: 'x86_64-apple-darwin',
    platformPackage: '@openai/codex-darwin-x64',
    binaryName: 'codex',
    archiveExt: 'tar.gz'
  },
  'darwin:arm64': {
    targetTriple: 'aarch64-apple-darwin',
    platformPackage: '@openai/codex-darwin-arm64',
    binaryName: 'codex',
    archiveExt: 'tar.gz'
  },
  'win32:x64': {
    targetTriple: 'x86_64-pc-windows-msvc',
    platformPackage: '@openai/codex-win32-x64',
    binaryName: 'codex.exe',
    archiveExt: 'zip'
  },
  'win32:arm64': {
    targetTriple: 'aarch64-pc-windows-msvc',
    platformPackage: '@openai/codex-win32-arm64',
    binaryName: 'codex.exe',
    archiveExt: 'zip'
  }
});

export function detectTarget({ platform = process.platform, arch = process.arch } = {}) {
  const target = TARGETS[`${platform}:${arch}`];
  if (!target) {
    return { ok: false, refusalReason: 'TARGET_UNSUPPORTED', platform, arch };
  }
  return { ok: true, platform, arch, ...target };
}

export function allTargetTriples() {
  return Object.values(TARGETS).map((target) => target.targetTriple);
}
