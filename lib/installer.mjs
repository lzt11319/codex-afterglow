import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chmod, copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectTarget, TARGETS } from './targets.mjs';
import { loadManifest, validateManifest } from './manifest.mjs';

export function parseInstallerArgs(argv) {
  const args = { _: [], noArgs: argv.length === 0 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') args.json = true;
    else if (arg === '--install') args.install = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--simulate-post-install-hash-mismatch') args.simulatePostInstallHashMismatch = true;
    else if (arg === '--simulate-installer-exception-after-copy') args.simulateInstallerExceptionAfterCopy = true;
    else if (arg === '--allow-explicit-rollback-target') args.allowExplicitRollbackTarget = true;
    else if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      args[key] = argv[i + 1];
      i++;
    } else {
      args._.push(arg);
    }
  }
  if (!args.install && !args.rollback) args.dryRun = true;
  return args;
}

export async function runInstaller(args, env = process.env) {
  const mode = args.rollback ? 'rollback' : (args.install ? 'install' : 'dry-run');
  const startedAt = new Date().toISOString();
  const target = detectTargetFromArgs(args);
  const summary = {
    ok: false,
    mode,
    startedAt,
    targetTriple: target.targetTriple ?? null,
    packageManager: 'unknown',
    codexPackageRoot: null,
    targetBinary: null,
    oldSha256: null,
    newSha256: null,
    backupPath: null,
    rollbackCommand: null,
    downloadedAsset: args.asset ?? null,
    assetUrl: args.assetUrl ?? null,
    assetSha256: null,
    expectedAssetSha256: null,
    releaseManifest: args.manifest ?? null,
    manifestValidation: null,
    versionBefore: null,
    versionAfter: null,
    replaced: false,
    autoRollback: null,
    refusalReason: null,
    notes: []
  };

  let backupBinary = null;
  try {
    if (args.rollback) return await rollbackInstall(args.rollback, summary, args);
    if (!target.ok) return refuse(summary, target.refusalReason ?? 'TARGET_UNSUPPORTED');

    const manifestPath = args.manifest ?? path.join('manifest', 'afterglow.release.sample.json');
    summary.releaseManifest = manifestPath;
    if (isInsecureHttpUrl(manifestPath)) return refuse(summary, 'INSECURE_MANIFEST_URL');
    const manifest = await loadManifest(manifestPath);
    const manifestValidation = validateManifest(manifest);
    summary.manifestValidation = manifestValidation;
    if (!manifestValidation.ok) return refuse(summary, 'MANIFEST_INVALID');
    const manifestTarget = manifest.targets?.[target.targetTriple];
    if (!manifestTarget) return refuse(summary, 'TARGET_NOT_IN_MANIFEST');
    const expectedSha = args.expectedSha256 ?? manifestTarget.sha256;
    summary.expectedAssetSha256 = expectedSha ?? null;
    const assetUrl = resolveAssetUrl(args, manifestTarget);
    if (assetUrl) summary.assetUrl = assetUrl;
    if (assetUrl && isInsecureHttpUrl(assetUrl)) return refuse(summary, 'INSECURE_ASSET_URL');

    const resolved = await resolveInstallTarget(args, target, env);
    Object.assign(summary, resolved.summary);
    if (!resolved.ok) return refuse(summary, resolved.refusalReason);
    summary.backupPath = plannedBackupPath(summary.targetBinary, args);
    summary.rollbackCommand = rollbackCommand(summary.backupPath);

    if (mode === 'dry-run') {
      summary.ok = true;
      summary.notes.push('Dry-run only: no files were replaced.');
      summary.notes.push('Use --install explicitly after reviewing this output.');
      summary.notes.push('Use the emitted --backup-dir value if you want the final install to use this exact planned rollback path.');
      return summary;
    }

    if (!args.asset && !assetUrl) return refuse(summary, 'ASSET_REQUIRED_FOR_INSTALL');
    if (isPlaceholderSha(expectedSha)) return refuse(summary, 'ASSET_SHA256_REQUIRED_FOR_INSTALL');
    const assetPath = args.asset ? path.resolve(args.asset) : await downloadAsset(assetUrl, manifestTarget.asset);
    if (!existsSync(assetPath)) return refuse(summary, 'ASSET_NOT_FOUND');
    summary.downloadedAsset = assetPath;
    summary.assetSha256 = await sha256File(assetPath);
    if (expectedSha && !isPlaceholderSha(expectedSha) && expectedSha.toLowerCase() !== summary.assetSha256.toLowerCase()) {
      return refuse(summary, 'ASSET_SHA256_MISMATCH');
    }

    summary.oldSha256 = await sha256File(summary.targetBinary);
    await mkdir(summary.backupPath, { recursive: true });
    backupBinary = path.join(summary.backupPath, path.basename(summary.targetBinary) + '.before');
    await copyFile(summary.targetBinary, backupBinary);
    await writeFile(path.join(summary.backupPath, 'backup.json'), JSON.stringify({
      targetBinary: summary.targetBinary,
      backupBinary,
      oldSha256: summary.oldSha256,
      targetTriple: target.targetTriple,
      binaryName: target.binaryName,
      codexPackageRoot: summary.codexPackageRoot,
      packageManager: summary.packageManager,
      explicitPath: summary.packageManager === 'explicit-path',
      createdAt: new Date().toISOString()
    }, null, 2));

    await copyFile(assetPath, summary.targetBinary);
    await markExecutable(summary.targetBinary);
    if (args.simulateInstallerExceptionAfterCopy) throw new Error('simulated installer exception after copy');
    summary.newSha256 = await sha256File(summary.targetBinary);
    if (args.simulatePostInstallHashMismatch || summary.newSha256.toLowerCase() !== summary.assetSha256.toLowerCase()) {
      summary.refusalReason = 'POST_INSTALL_HASH_MISMATCH';
      summary.notes.push('Attempting automatic rollback after post-install hash mismatch.');
      await copyFile(backupBinary, summary.targetBinary);
      summary.replaced = false;
      summary.ok = false;
      return summary;
    }

    summary.ok = true;
    summary.replaced = true;
    summary.versionAfter = summary.versionBefore;
    summary.notes.push('Replacement complete. Restart terminal/Codex sessions for effect.');
    return summary;
  } catch (error) {
    summary.ok = false;
    summary.refusalReason = summary.refusalReason ?? 'INSTALLER_EXCEPTION';
    summary.error = error instanceof Error ? error.message : String(error);
    if (backupBinary && summary.targetBinary && existsSync(backupBinary)) {
      try {
        await copyFile(backupBinary, summary.targetBinary);
        summary.replaced = false;
        summary.autoRollback = 'succeeded';
        summary.notes.push('Automatic rollback succeeded after installer exception.');
      } catch (rollbackError) {
        summary.autoRollback = 'failed';
        summary.rollbackError = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
      }
    }
    return summary;
  }
}

function resolveAssetUrl(args, manifestTarget) {
  if (args.assetUrl) return args.assetUrl;
  if (!args.assetBaseUrl || !manifestTarget?.asset) return null;
  return new URL(manifestTarget.asset, ensureTrailingSlash(args.assetBaseUrl)).href;
}

function ensureTrailingSlash(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

function isPlaceholderSha(value) {
  return !value || value.startsWith('REPLACE_');
}

function isInsecureHttpUrl(value) {
  return /^http:\/\//i.test(String(value));
}

async function downloadAsset(assetUrl, assetName = 'codex-afterglow-asset') {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'afterglow-download-'));
  const outPath = path.join(tempDir, path.basename(assetName));
  if (/^file:\/\//i.test(assetUrl)) {
    await copyFile(fileURLToPath(assetUrl), outPath);
    return outPath;
  }
  if (/^http:\/\//i.test(assetUrl)) {
    throw new Error(`Insecure asset URL is not allowed: ${assetUrl}`);
  }
  if (!/^https:\/\//i.test(assetUrl)) {
    throw new Error(`Unsupported asset URL scheme: ${assetUrl}`);
  }
  const response = await fetch(assetUrl);
  if (!response.ok) {
    throw new Error(`Failed to download asset ${assetUrl}: ${response.status} ${response.statusText}`);
  }
  const data = Buffer.from(await response.arrayBuffer());
  await writeFile(outPath, data);
  return outPath;
}

async function markExecutable(file) {
  if (process.platform === 'win32') return;
  await chmod(file, 0o755);
}

function detectTargetFromArgs(args) {
  if (args.targetTriple) {
    const target = Object.values(TARGETS).find((entry) => entry.targetTriple === args.targetTriple);
    if (!target) return { ok: false, refusalReason: 'TARGET_UNSUPPORTED', targetTriple: args.targetTriple };
    return { ok: true, ...target };
  }
  return detectTarget();
}

async function resolveInstallTarget(args, target, env) {
  const summary = {};
  if (args.codexBinary) {
    const targetBinary = path.resolve(args.codexBinary);
    if (!existsSync(targetBinary)) return { ok: false, refusalReason: 'TARGET_BINARY_NOT_FOUND', summary: { targetBinary } };
    return { ok: true, summary: { targetBinary, packageManager: 'explicit-path' } };
  }

  const packageRoot = args.packageRoot ?? env.CODEX_MANAGED_PACKAGE_ROOT;
  if (!packageRoot) return { ok: false, refusalReason: 'PACKAGE_ROOT_REQUIRED_OR_USE_CODEX_BINARY', summary };
  const root = path.resolve(packageRoot);
  const packageJsonPath = path.join(root, 'package.json');
  if (!existsSync(packageJsonPath)) return { ok: false, refusalReason: 'PACKAGE_JSON_NOT_FOUND', summary: { codexPackageRoot: root } };
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  if (!isOfficialCodexPackageName(packageJson.name)) {
    return { ok: false, refusalReason: 'NOT_OFFICIAL_CODEX_PACKAGE', summary: { codexPackageRoot: root } };
  }

  const direct = path.join(root, 'vendor', target.targetTriple, 'bin', target.binaryName);
  const optional = path.join(root, 'node_modules', target.platformPackage, 'vendor', target.targetTriple, 'bin', target.binaryName);
  const legacy = path.join(root, 'vendor', target.targetTriple, 'codex', target.binaryName);
  const binary = [direct, optional, legacy].find((candidate) => existsSync(candidate));
  if (!binary) {
    return { ok: false, refusalReason: 'VENDOR_BINARY_NOT_FOUND', summary: { codexPackageRoot: root } };
  }
  return { ok: true, summary: { codexPackageRoot: root, targetBinary: binary, packageManager: packageJson.name === '@openai/codex' ? 'npm-or-bun' : 'platform-package' } };
}

async function rollbackInstall(backupDir, summary, args = {}) {
  const backupPath = path.resolve(backupDir);
  summary.backupPath = backupPath;
  const metadataPath = path.join(backupPath, 'backup.json');
  if (!existsSync(metadataPath)) return refuse(summary, 'BACKUP_METADATA_NOT_FOUND');
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
  if (!metadata.targetBinary || !metadata.backupBinary || !existsSync(metadata.backupBinary)) return refuse(summary, 'BACKUP_BINARY_NOT_FOUND');
  const validation = await validateRollbackMetadata(metadata, backupPath, args);
  summary.rollbackValidation = validation;
  if (!validation.ok) return refuse(summary, validation.refusalReason);
  if (metadata.oldSha256) {
    const backupSha256 = await sha256File(metadata.backupBinary);
    if (backupSha256.toLowerCase() !== metadata.oldSha256.toLowerCase()) return refuse(summary, 'BACKUP_SHA256_MISMATCH');
  }
  await copyFile(metadata.backupBinary, metadata.targetBinary);
  summary.targetBinary = metadata.targetBinary;
  summary.rollbackCommand = rollbackCommand(backupPath);
  summary.oldSha256 = metadata.oldSha256 ?? null;
  summary.newSha256 = await sha256File(metadata.targetBinary);
  summary.ok = true;
  summary.replaced = false;
  summary.notes.push('Rollback complete. Restart terminal/Codex sessions for effect.');
  return summary;
}

function plannedBackupPath(targetBinary, args) {
  return args.backupDir ? path.resolve(args.backupDir) : path.join(path.dirname(targetBinary), 'afterglow-backups', timestamp());
}

async function validateRollbackMetadata(metadata, backupPath, args) {
  const backupBinary = path.resolve(metadata.backupBinary);
  if (!isPathInsideOrSame(backupBinary, backupPath)) return { ok: false, refusalReason: 'BACKUP_BINARY_OUTSIDE_BACKUP_DIR' };
  if (path.basename(backupBinary) !== `${path.basename(metadata.targetBinary)}.before`) return { ok: false, refusalReason: 'BACKUP_BINARY_NAME_MISMATCH' };
  if (metadata.explicitPath) {
    return args.allowExplicitRollbackTarget ? { ok: true } : { ok: false, refusalReason: 'EXPLICIT_ROLLBACK_TARGET_REQUIRES_OVERRIDE' };
  }
  if (!metadata.codexPackageRoot || !metadata.targetTriple) return { ok: false, refusalReason: 'BACKUP_METADATA_INCOMPLETE' };
  const target = Object.values(TARGETS).find((entry) => entry.targetTriple === metadata.targetTriple);
  if (!target) return { ok: false, refusalReason: 'TARGET_UNSUPPORTED' };
  const root = path.resolve(metadata.codexPackageRoot);
  const packageJsonPath = path.join(root, 'package.json');
  if (!existsSync(packageJsonPath)) return { ok: false, refusalReason: 'BACKUP_PACKAGE_JSON_NOT_FOUND' };
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  if (!isOfficialCodexPackageName(packageJson.name)) return { ok: false, refusalReason: 'BACKUP_PACKAGE_NOT_OFFICIAL_CODEX' };
  const targetBinary = path.resolve(metadata.targetBinary);
  if (!isPathInsideOrSame(targetBinary, root)) return { ok: false, refusalReason: 'ROLLBACK_TARGET_OUTSIDE_PACKAGE_ROOT' };
  if (path.basename(targetBinary) !== target.binaryName) return { ok: false, refusalReason: 'ROLLBACK_TARGET_BINARY_NAME_MISMATCH' };
  const candidates = [
    path.join(root, 'vendor', target.targetTriple, 'bin', target.binaryName),
    path.join(root, 'node_modules', target.platformPackage, 'vendor', target.targetTriple, 'bin', target.binaryName),
    path.join(root, 'vendor', target.targetTriple, 'codex', target.binaryName)
  ];
  if (!candidates.some((candidate) => samePath(path.resolve(candidate), targetBinary))) return { ok: false, refusalReason: 'ROLLBACK_TARGET_NOT_RECOGNIZED_VENDOR_BINARY' };
  return { ok: true };
}

function isOfficialCodexPackageName(name) {
  return name === '@openai/codex' || name?.startsWith('@openai/codex-');
}

function isPathInsideOrSame(child, parent) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function samePath(a, b) {
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function refuse(summary, reason) {
  summary.ok = false;
  summary.refusalReason = reason;
  if (summary.backupPath && !summary.rollbackCommand) summary.rollbackCommand = rollbackCommand(summary.backupPath);
  return summary;
}

export async function sha256File(file) {
  const buf = await readFile(file);
  return createHash('sha256').update(buf).digest('hex');
}

function rollbackCommand(backupPath) {
  const escaped = backupPath.replace(/'/g, "''");
  return `node install/install.mjs --rollback '${escaped}' --json`;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}
