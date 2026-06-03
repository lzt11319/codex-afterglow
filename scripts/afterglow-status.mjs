#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseInstallerArgs, runInstaller, sha256File } from '../lib/installer.mjs';
import { loadManifest, validateManifest } from '../lib/manifest.mjs';

const args = parseInstallerArgs(process.argv.slice(2));
args.install = false;
args.rollback = null;
args.dryRun = true;
const result = await getStatus(args);
if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else if (result.ok) {
  console.log(`Codex target: ${result.targetBinary ?? 'unknown'}`);
  console.log(`Current SHA256: ${result.currentVendorSha256 ?? 'unknown'}`);
  console.log(`Afterglow release match: ${result.afterglowReleaseMatch}`);
  if (result.reapplyCommand) console.log(`Reapply: ${result.reapplyCommand}`);
} else {
  console.error(`Status failed: ${result.refusalReason ?? result.error ?? 'unknown'}`);
}
process.exit(result.ok ? 0 : 2);

async function getStatus(args) {
  const checkedAt = new Date().toISOString();
  const installerDryRun = await runInstaller(args);
  const status = {
    ok: installerDryRun.ok,
    checkedAt,
    refusalReason: installerDryRun.refusalReason,
    targetTriple: installerDryRun.targetTriple,
    codexPackageRoot: installerDryRun.codexPackageRoot,
    packageManager: installerDryRun.packageManager,
    targetBinary: installerDryRun.targetBinary,
    packageVersion: null,
    currentVendorSha256: null,
    releaseManifest: args.manifest ?? null,
    manifestValidation: installerDryRun.manifestValidation ?? null,
    releaseAsset: null,
    releaseAssetSha256: null,
    afterglowReleaseMatch: 'unknown',
    backupRoot: null,
    backupCount: 0,
    latestBackup: null,
    dryRun: installerDryRun,
    reapplyCommand: null,
    authConfigTouched: false,
    notes: [
      'Status is verify-only: no binary replacement, no wrapper mutation, and no auth/config reads.'
    ]
  };
  if (!installerDryRun.ok) return status;

  if (status.codexPackageRoot) {
    const packageJsonPath = path.join(status.codexPackageRoot, 'package.json');
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
      status.packageVersion = packageJson.version ?? null;
    }
  }

  if (status.targetBinary && existsSync(status.targetBinary)) {
    status.currentVendorSha256 = await sha256File(status.targetBinary);
    status.backupRoot = path.join(path.dirname(status.targetBinary), 'afterglow-backups');
    if (existsSync(status.backupRoot)) {
      const backups = (await readdir(status.backupRoot)).sort();
      status.backupCount = backups.length;
      status.latestBackup = backups.length ? path.join(status.backupRoot, backups[backups.length - 1]) : null;
    }
  }

  if (args.manifest) {
    const manifest = await loadManifest(args.manifest);
    status.manifestValidation = validateManifest(manifest);
    if (!status.manifestValidation.ok) {
      status.ok = false;
      status.refusalReason = 'MANIFEST_INVALID';
      return status;
    }
    const target = manifest.targets?.[status.targetTriple];
    if (target) {
      status.releaseAsset = target.asset;
      status.releaseAssetSha256 = target.sha256;
      if (target.sha256 && !target.sha256.startsWith('REPLACE_') && status.currentVendorSha256) {
        status.afterglowReleaseMatch = status.currentVendorSha256.toLowerCase() === target.sha256.toLowerCase();
      }
    }
  }

  const manifestArg = args.manifest ? ` --manifest ${quote(args.manifest)}` : '';
  const assetBaseArg = args.assetBaseUrl ? ` --asset-base-url ${quote(args.assetBaseUrl)}` : '';
  status.reapplyCommand = `node install/install.mjs --dry-run --json${manifestArg}${assetBaseArg}`;
  return status;
}

function quote(value) {
  if (process.platform === 'win32') return `"${String(value).replace(/"/g, '\\"')}"`;
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}
