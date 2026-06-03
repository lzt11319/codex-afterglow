#!/usr/bin/env node
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { loadManifest } from '../lib/manifest.mjs';

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log('Usage: node scripts/generate-release-manifest.mjs --base manifest/afterglow.release.sample.json --metadata-dir dist/metadata --out dist/afterglow.release.json');
  process.exit(0);
}
const base = await loadManifest(args.base ?? path.join('manifest', 'afterglow.release.sample.json'));
const metadataDir = path.resolve(args.metadataDir ?? 'dist/metadata');
const outPath = path.resolve(args.out ?? 'dist/afterglow.release.json');
const entries = await readdir(metadataDir);
const targets = {};
for (const entry of entries.filter((name) => name.endsWith('.asset.json'))) {
  const item = JSON.parse(await readFile(path.join(metadataDir, entry), 'utf8'));
  targets[item.targetTriple] = {
    asset: item.asset,
    sha256: item.sha256,
    binaryName: item.binaryName
  };
}
const manifest = { ...base, targets, generatedAt: new Date().toISOString() };
await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ ok: true, out: outPath, targetCount: Object.keys(targets).length }, null, 2));

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') out.help = true;
    else if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      out[key] = argv[i + 1];
      i++;
    }
  }
  return out;
}
