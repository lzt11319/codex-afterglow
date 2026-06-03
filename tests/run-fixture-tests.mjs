#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { validateManifest, loadManifest } from '../lib/manifest.mjs';
import { detectTarget, allTargetTriples } from '../lib/targets.mjs';
import { assessCompatibility } from '../lib/compatibility.mjs';

const manifest = await loadManifest('manifest/afterglow.release.sample.json');
const validation = validateManifest(manifest);
assert.equal(validation.ok, true, validation.errors.join('\n'));
assert.equal(allTargetTriples().length, 6);
assert.equal(detectTarget({ platform: 'win32', arch: 'x64' }).targetTriple, 'x86_64-pc-windows-msvc');
assert.equal(detectTarget({ platform: 'linux', arch: 'arm64' }).targetTriple, 'aarch64-unknown-linux-musl');
assert.equal(detectTarget({ platform: 'freebsd', arch: 'x64' }).ok, false);

assert.equal(assessCompatibility({ manifest, actualCommit: manifest.codex.commit, actualVersion: manifest.codex.workspaceVersion, patchState: 'unpatched', manifestValid: true }).compatibilityState, 'exact-supported');
assert.equal(assessCompatibility({ manifest, actualCommit: 'drift', actualVersion: '0.137.0', patchState: 'unpatched', anchorsOk: true, effectiveness: 'passed', manifestValid: true }).compatibilityState, 'drift-compatible');
assert.equal(assessCompatibility({ manifest, actualCommit: 'drift', actualVersion: '0.137.0', anchorsOk: false, effectiveness: 'passed', manifestValid: true }).compatibilityState, 'unsupported-drift');
assert.equal(assessCompatibility({ manifest, manifestValid: true, dirtySource: true }).compatibilityState, 'dirty-source');
assert.equal(assessCompatibility({ manifest, manifestValid: true, effectiveness: 'failed' }).compatibilityState, 'effectiveness-failed');

const verify = run(['scripts/verify-source.mjs', '--manifest-only', '--json']);
assert.equal(verify.status, 0, verify.stderr || verify.stdout);
assert.equal(JSON.parse(verify.stdout).validation.ok, true);
assert.equal(JSON.parse(verify.stdout).mode, 'manifest-only');

const sourceRequired = run(['scripts/verify-source.mjs', '--json']);
assert.equal(sourceRequired.status, 1);
assert.equal(JSON.parse(sourceRequired.stdout).refusalReason, 'SOURCE_REPO_ROOT_REQUIRED');

const helpNoArgs = run(['install/install.mjs']);
assert.equal(helpNoArgs.status, 0, helpNoArgs.stderr || helpNoArgs.stdout);
assert.match(helpNoArgs.stdout, /Usage: node install\/install\.mjs/);

const temp = await mkdtemp(path.join(os.tmpdir(), 'afterglow-fixture-'));
try {
  const packageRoot = path.join(temp, 'codex-package');
  const vendorBin = path.join(packageRoot, 'node_modules', '@openai', 'codex-win32-x64', 'vendor', 'x86_64-pc-windows-msvc', 'bin');
  await mkdir(vendorBin, { recursive: true });
  await writeFile(path.join(packageRoot, 'package.json'), JSON.stringify({ name: '@openai/codex', version: '0.136.0' }));
  const targetBinary = path.join(vendorBin, 'codex.exe');
  await writeFile(targetBinary, 'original-codex-binary');
  const wrapper = path.join(packageRoot, 'bin', 'codex.js');
  await mkdir(path.dirname(wrapper), { recursive: true });
  await writeFile(wrapper, 'wrapper-should-not-change');
  const asset = path.join(temp, 'patched-codex.exe');
  await writeFile(asset, 'patched-codex-binary');
  const assetSha = sha256('patched-codex-binary');

  const noArgs = run(['install/install.mjs', '--json', '--package-root', packageRoot, '--target-triple', 'x86_64-pc-windows-msvc']);
  assert.equal(noArgs.status, 0, noArgs.stderr || noArgs.stdout);
  const noArgsJson = JSON.parse(noArgs.stdout);
  assert.equal(noArgsJson.mode, 'dry-run');
  assert.equal(noArgsJson.replaced, false);
  assert.ok(noArgsJson.backupPath);
  assert.ok(noArgsJson.rollbackCommand);
  assert.equal(await readFile(targetBinary, 'utf8'), 'original-codex-binary');

  if (process.platform === 'win32') {
    const psWrapper = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'install/install.ps1', '-DryRun', '-Json', '--package-root', packageRoot, '--target-triple', 'x86_64-pc-windows-msvc'], { encoding: 'utf8' });
    assert.equal(psWrapper.status, 0, psWrapper.stderr || psWrapper.stdout);
    assert.equal(JSON.parse(psWrapper.stdout).codexPackageRoot, packageRoot);
  }

  const invalidManifestPath = path.join(temp, 'invalid-manifest.json');
  await writeFile(invalidManifestPath, JSON.stringify({ schemaVersion: 1, targets: {} }));
  const invalidManifest = run(['install/install.mjs', '--dry-run', '--json', '--package-root', packageRoot, '--target-triple', 'x86_64-pc-windows-msvc', '--manifest', invalidManifestPath]);
  assert.equal(invalidManifest.status, 2);
  assert.equal(JSON.parse(invalidManifest.stdout).refusalReason, 'MANIFEST_INVALID');
  const invalidStatus = run(['scripts/afterglow-status.mjs', '--json', '--package-root', packageRoot, '--target-triple', 'x86_64-pc-windows-msvc', '--manifest', invalidManifestPath]);
  assert.equal(invalidStatus.status, 2);
  assert.equal(JSON.parse(invalidStatus.stdout).refusalReason, 'MANIFEST_INVALID');

  const untrustedLocalAsset = run(['install/install.mjs', '--install', '--json', '--package-root', packageRoot, '--target-triple', 'x86_64-pc-windows-msvc', '--asset', asset]);
  assert.equal(untrustedLocalAsset.status, 2);
  assert.equal(JSON.parse(untrustedLocalAsset.stdout).refusalReason, 'ASSET_SHA256_REQUIRED_FOR_INSTALL');
  assert.equal(await readFile(targetBinary, 'utf8'), 'original-codex-binary');

  const httpManifest = run(['install/install.mjs', '--dry-run', '--json', '--package-root', packageRoot, '--target-triple', 'x86_64-pc-windows-msvc', '--manifest', 'http://example.test/afterglow.release.json']);
  assert.equal(httpManifest.status, 2);
  assert.equal(JSON.parse(httpManifest.stdout).refusalReason, 'INSECURE_MANIFEST_URL');

  const install = run(['install/install.mjs', '--install', '--json', '--package-root', packageRoot, '--target-triple', 'x86_64-pc-windows-msvc', '--asset', asset, '--expected-sha256', assetSha]);
  assert.equal(install.status, 0, install.stderr || install.stdout);
  const installJson = JSON.parse(install.stdout);
  assert.equal(installJson.replaced, true);
  assert.ok(installJson.backupPath);
  assert.ok(installJson.rollbackCommand);
  assert.equal(installJson.manifestValidation.ok, true);
  assert.equal(await readFile(targetBinary, 'utf8'), 'patched-codex-binary');
  assert.equal(await readFile(wrapper, 'utf8'), 'wrapper-should-not-change');

  const rollback = run(['install/install.mjs', '--rollback', installJson.backupPath, '--json']);
  assert.equal(rollback.status, 0, rollback.stderr || rollback.stdout);
  assert.equal(await readFile(targetBinary, 'utf8'), 'original-codex-binary');

  const remoteManifestPath = path.join(temp, 'afterglow.release.json');
  const remoteManifest = structuredClone(manifest);
  remoteManifest.targets['x86_64-pc-windows-msvc'].asset = path.basename(asset);
  remoteManifest.targets['x86_64-pc-windows-msvc'].sha256 = assetSha;
  await writeFile(remoteManifestPath, JSON.stringify(remoteManifest, null, 2));
  const remoteInstall = run([
    'install/install.mjs',
    '--install',
    '--json',
    '--package-root',
    packageRoot,
    '--target-triple',
    'x86_64-pc-windows-msvc',
    '--manifest',
    remoteManifestPath,
    '--asset-base-url',
    pathToFileURL(temp + path.sep).href
  ]);
  assert.equal(remoteInstall.status, 0, remoteInstall.stderr || remoteInstall.stdout);
  const remoteInstallJson = JSON.parse(remoteInstall.stdout);
  assert.equal(remoteInstallJson.replaced, true);
  assert.equal(remoteInstallJson.assetUrl, pathToFileURL(asset).href);
  assert.equal(await readFile(targetBinary, 'utf8'), 'patched-codex-binary');
  const remoteRollback = run(['install/install.mjs', '--rollback', remoteInstallJson.backupPath, '--json']);
  assert.equal(remoteRollback.status, 0, remoteRollback.stderr || remoteRollback.stdout);
  assert.equal(await readFile(targetBinary, 'utf8'), 'original-codex-binary');

  const insecureAssetUrl = run(['install/install.mjs', '--install', '--json', '--package-root', packageRoot, '--target-triple', 'x86_64-pc-windows-msvc', '--manifest', remoteManifestPath, '--asset-url', 'http://example.test/codex.exe']);
  assert.equal(insecureAssetUrl.status, 2);
  assert.equal(JSON.parse(insecureAssetUrl.stdout).refusalReason, 'INSECURE_ASSET_URL');
  assert.equal(await readFile(targetBinary, 'utf8'), 'original-codex-binary');

  const tamperedBackup = path.join(temp, 'tampered-backup');
  await mkdir(tamperedBackup, { recursive: true });
  const tamperedTarget = path.join(temp, 'not-codex.txt');
  const tamperedBackupBinary = path.join(tamperedBackup, 'not-codex.txt.before');
  await writeFile(tamperedTarget, 'do-not-overwrite');
  await writeFile(tamperedBackupBinary, 'malicious');
  await writeFile(path.join(tamperedBackup, 'backup.json'), JSON.stringify({
    targetBinary: tamperedTarget,
    backupBinary: tamperedBackupBinary,
    oldSha256: sha256('malicious'),
    targetTriple: 'x86_64-pc-windows-msvc',
    binaryName: 'codex.exe',
    codexPackageRoot: packageRoot,
    packageManager: 'npm-or-bun',
    explicitPath: false
  }, null, 2));
  const tamperedRollback = run(['install/install.mjs', '--rollback', tamperedBackup, '--json']);
  assert.equal(tamperedRollback.status, 2);
  assert.equal(JSON.parse(tamperedRollback.stdout).refusalReason, 'ROLLBACK_TARGET_OUTSIDE_PACKAGE_ROOT');
  assert.equal(await readFile(tamperedTarget, 'utf8'), 'do-not-overwrite');

  const fakePackageRoot = path.join(temp, 'fake-not-codex-package');
  const fakeVendorBin = path.join(fakePackageRoot, 'vendor', 'x86_64-pc-windows-msvc', 'bin');
  await mkdir(fakeVendorBin, { recursive: true });
  await writeFile(path.join(fakePackageRoot, 'package.json'), JSON.stringify({ name: 'not-codex', version: '1.0.0' }));
  const fakeTargetBinary = path.join(fakeVendorBin, 'codex.exe');
  await writeFile(fakeTargetBinary, 'fake-package-target');
  const fakeBackup = path.join(temp, 'fake-package-backup');
  await mkdir(fakeBackup, { recursive: true });
  const fakeBackupBinary = path.join(fakeBackup, 'codex.exe.before');
  await writeFile(fakeBackupBinary, 'malicious-fake-package-rollback');
  await writeFile(path.join(fakeBackup, 'backup.json'), JSON.stringify({
    targetBinary: fakeTargetBinary,
    backupBinary: fakeBackupBinary,
    oldSha256: sha256('malicious-fake-package-rollback'),
    targetTriple: 'x86_64-pc-windows-msvc',
    binaryName: 'codex.exe',
    codexPackageRoot: fakePackageRoot,
    packageManager: 'npm-or-bun',
    explicitPath: false
  }, null, 2));
  const fakePackageRollback = run(['install/install.mjs', '--rollback', fakeBackup, '--json']);
  assert.equal(fakePackageRollback.status, 2);
  assert.equal(JSON.parse(fakePackageRollback.stdout).refusalReason, 'BACKUP_PACKAGE_NOT_OFFICIAL_CODEX');
  assert.equal(await readFile(fakeTargetBinary, 'utf8'), 'fake-package-target');

  const status = run(['scripts/afterglow-status.mjs', '--json', '--package-root', packageRoot, '--target-triple', 'x86_64-pc-windows-msvc', '--manifest', remoteManifestPath]);
  assert.equal(status.status, 0, status.stderr || status.stdout);
  const statusJson = JSON.parse(status.stdout);
  assert.equal(statusJson.packageVersion, '0.136.0');
  assert.equal(statusJson.currentVendorSha256, sha256('original-codex-binary'));
  assert.equal(statusJson.afterglowReleaseMatch, false);
  assert.equal(statusJson.authConfigTouched, false);

  const badHash = run(['install/install.mjs', '--install', '--json', '--package-root', packageRoot, '--target-triple', 'x86_64-pc-windows-msvc', '--asset', asset, '--expected-sha256', 'bad']);
  assert.equal(badHash.status, 2);
  assert.equal(JSON.parse(badHash.stdout).refusalReason, 'ASSET_SHA256_MISMATCH');
  assert.equal(await readFile(targetBinary, 'utf8'), 'original-codex-binary');

  const mismatch = run(['install/install.mjs', '--install', '--json', '--package-root', packageRoot, '--target-triple', 'x86_64-pc-windows-msvc', '--asset', asset, '--expected-sha256', assetSha, '--simulate-post-install-hash-mismatch']);
  assert.equal(mismatch.status, 2);
  const mismatchJson = JSON.parse(mismatch.stdout);
  assert.equal(mismatchJson.refusalReason, 'POST_INSTALL_HASH_MISMATCH');
  assert.ok(mismatchJson.rollbackCommand);
  assert.equal(await readFile(targetBinary, 'utf8'), 'original-codex-binary');

  const exceptionAfterCopy = run(['install/install.mjs', '--install', '--json', '--package-root', packageRoot, '--target-triple', 'x86_64-pc-windows-msvc', '--asset', asset, '--expected-sha256', assetSha, '--simulate-installer-exception-after-copy']);
  assert.equal(exceptionAfterCopy.status, 2);
  const exceptionJson = JSON.parse(exceptionAfterCopy.stdout);
  assert.equal(exceptionJson.refusalReason, 'INSTALLER_EXCEPTION');
  assert.equal(exceptionJson.autoRollback, 'succeeded');
  assert.ok(exceptionJson.rollbackCommand);
  assert.equal(await readFile(targetBinary, 'utf8'), 'original-codex-binary');


  const packageAsset = path.join(temp, 'fake-release.zip');
  await writeFile(packageAsset, 'fake-release-asset');
  const packageResult = run(['scripts/package-release.mjs', '--asset', packageAsset, '--target-triple', 'x86_64-pc-windows-msvc', '--binary-name', 'codex.exe', '--codex-tag', 'rust-v0.136.0', '--patch-version', '0.1.0-alpha.0', '--out-dir', path.join(temp, 'metadata')]);
  assert.equal(packageResult.status, 0, packageResult.stderr || packageResult.stdout);
  const packageJson = JSON.parse(packageResult.stdout);
  assert.equal(packageJson.metadata.targetTriple, 'x86_64-pc-windows-msvc');
  const manifestResult = run(['scripts/generate-release-manifest.mjs', '--metadata-dir', path.join(temp, 'metadata'), '--out', path.join(temp, 'afterglow.release.json')]);
  assert.equal(manifestResult.status, 0, manifestResult.stderr || manifestResult.stdout);
  assert.equal(JSON.parse(manifestResult.stdout).targetCount, 1);

  const unknown = run(['install/install.mjs', '--dry-run', '--json', '--target-triple', 'x86_64-pc-windows-msvc']);
  assert.equal(unknown.status, 2);
  assert.equal(JSON.parse(unknown.stdout).refusalReason, 'PACKAGE_ROOT_REQUIRED_OR_USE_CODEX_BINARY');
} finally {
  await rm(temp, { recursive: true, force: true });
}

console.log('fixture smoke passed: installer, manifest, target mapping, compatibility, verify-source, backup/replace/rollback, and failure atomicity checks.');

function run(args) {
  return spawnSync(process.execPath, args, { encoding: 'utf8', env: { ...process.env, CODEX_MANAGED_PACKAGE_ROOT: '' } });
}
function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

