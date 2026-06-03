#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { loadManifest, validateManifest, expectedAnchorSummary } from '../lib/manifest.mjs';
import { assessCompatibility } from '../lib/compatibility.mjs';

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printHelp();
  process.exit(0);
}

const manifestPath = args.manifest ?? path.join('manifest', 'afterglow.release.sample.json');
const manifest = await loadManifest(manifestPath);
const validation = validateManifest(manifest);
const manifestOnly = args.manifestOnly === true;
const anchorCheck = args.repoRoot
  ? checkSourceAnchors(args.repoRoot, manifest)
  : { ok: manifestOnly, checked: false, missingFiles: [], missingMarkers: [], refusalReason: manifestOnly ? null : 'SOURCE_REPO_ROOT_REQUIRED' };
const compatibility = assessCompatibility({
  manifest,
  actualCommit: args.actualCommit ?? manifest.codex?.commit,
  actualVersion: args.actualVersion ?? manifest.codex?.workspaceVersion,
  patchState: args.patchState ?? 'unknown',
  anchorsOk: anchorCheck.ok,
  dirtySource: args.dirtySource === 'true',
  effectiveness: args.effectiveness ?? 'not-run',
  unsafeInstallTarget: args.unsafeInstallTarget === 'true',
  manifestValid: validation.ok
});

const result = {
  ok: validation.ok && anchorCheck.ok && compatibility.ok,
  mode: manifestOnly ? 'manifest-only' : 'source-anchors',
  refusalReason: anchorCheck.refusalReason ?? compatibility.refusalReason ?? (validation.ok ? null : 'MANIFEST_INVALID'),
  manifestPath,
  validation,
  anchors: {
    ...expectedAnchorSummary(manifest),
    checked: anchorCheck.checked,
    refusalReason: anchorCheck.refusalReason ?? null,
    missingFiles: anchorCheck.missingFiles,
    missingMarkers: anchorCheck.missingMarkers
  },
  compatibility
};

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(result.ok ? 'verify-source passed' : 'verify-source failed');
  if (!result.ok) console.log(JSON.stringify(result, null, 2));
}
process.exit(result.ok ? 0 : 1);

function checkSourceAnchors(repoRoot, manifest) {
  const root = path.resolve(repoRoot);
  const missingFiles = [];
  const missingMarkers = [];
  const files = manifest.sourceAnchors?.files ?? [];
  const markers = manifest.sourceAnchors?.patchMarkers ?? [];
  let corpus = '';
  for (const rel of files) {
    const file = path.join(root, rel);
    if (!existsSync(file)) {
      missingFiles.push(rel);
      continue;
    }
    corpus += '\n' + readFileSync(file, 'utf8');
  }
  if (missingFiles.length === 0) {
    for (const marker of markers) {
      if (!corpus.includes(marker)) missingMarkers.push(marker);
    }
  }
  return { ok: missingFiles.length === 0 && missingMarkers.length === 0, checked: true, missingFiles, missingMarkers };
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') out.help = true;
    else if (arg === '--json') out.json = true;
    else if (arg === '--manifest-only') out.manifestOnly = true;
    else if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      out[key] = argv[i + 1];
      i++;
    }
  }
  return out;
}

function printHelp() {
  console.log(`Usage: node scripts/verify-source.mjs [--manifest path] [--repo-root path|--manifest-only] [--json]\n\nValidates the Afterglow manifest, concrete source anchors, and compatibility state.\nRelease/source evidence mode requires --repo-root so source files and markers are checked. Use --manifest-only only for fixture/package metadata smoke tests.`);
}
