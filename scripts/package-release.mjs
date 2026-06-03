#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.asset || !args.targetTriple) {
  console.log('Usage: node scripts/package-release.mjs --asset <archive> --target-triple <triple> --codex-tag <tag> --patch-version <version> [--out-dir dist/metadata]');
  process.exit(args.help ? 0 : 2);
}
const asset = path.resolve(args.asset);
const outDir = path.resolve(args.outDir ?? 'dist/metadata');
await mkdir(outDir, { recursive: true });
const sha256 = await sha256File(asset);
const metadata = {
  targetTriple: args.targetTriple,
  asset: path.basename(asset),
  sha256,
  binaryName: args.binaryName ?? (args.targetTriple.includes('windows') || args.targetTriple.includes('pc-windows') ? 'codex.exe' : 'codex'),
  codexTag: args.codexTag ?? null,
  patchVersion: args.patchVersion ?? null,
  createdAt: new Date().toISOString()
};
const out = path.join(outDir, `${args.targetTriple}.asset.json`);
await writeFile(out, JSON.stringify(metadata, null, 2));
console.log(JSON.stringify({ ok: true, metadataPath: out, metadata }, null, 2));

async function sha256File(file) {
  const data = await readFile(file);
  return createHash('sha256').update(data).digest('hex');
}
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
