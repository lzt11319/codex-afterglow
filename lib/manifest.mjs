import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { allTargetTriples } from './targets.mjs';

const REQUIRED_TOP = ['schemaVersion', 'codex', 'afterglow', 'targets', 'sourceAnchors', 'trust'];
const REQUIRED_TRUST = ['attestations', 'sbom', 'signing', 'reproducibleBuildNotes'];
const REQUIRED_ANCHORS = ['files', 'patchMarkers', 'semanticTests'];

export async function loadManifest(location) {
  const text = await readText(location);
  return JSON.parse(text);
}

async function readText(location) {
  if (/^https?:\/\//i.test(location)) {
    if (/^http:\/\//i.test(location)) {
      throw new Error(`Insecure manifest URL is not allowed: ${location}`);
    }
    const response = await fetch(location);
    if (!response.ok) {
      throw new Error(`Failed to fetch manifest ${location}: ${response.status} ${response.statusText}`);
    }
    return await response.text();
  }
  if (/^file:\/\//i.test(location)) {
    return await readFile(fileURLToPath(location), 'utf8');
  }
  return await readFile(location, 'utf8');
}

export function validateManifest(manifest) {
  const errors = [];
  for (const key of REQUIRED_TOP) requireKey(manifest, key, errors, 'manifest');
  if (manifest?.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  for (const key of ['tag', 'commit', 'workspaceVersion']) requireKey(manifest?.codex, key, errors, 'codex');
  for (const key of ['patchVersion', 'patchSha256']) requireKey(manifest?.afterglow, key, errors, 'afterglow');
  for (const key of REQUIRED_ANCHORS) requireKey(manifest?.sourceAnchors, key, errors, 'sourceAnchors');
  for (const key of REQUIRED_TRUST) requireKey(manifest?.trust, key, errors, 'trust');

  requireNonEmptyArray(manifest?.sourceAnchors?.files, errors, 'sourceAnchors.files');
  requireNonEmptyArray(manifest?.sourceAnchors?.patchMarkers, errors, 'sourceAnchors.patchMarkers');
  requireNonEmptyArray(manifest?.sourceAnchors?.semanticTests, errors, 'sourceAnchors.semanticTests');

  const targets = manifest?.targets ?? {};
  for (const triple of allTargetTriples()) {
    if (!targets[triple]) {
      errors.push(`targets missing ${triple}`);
      continue;
    }
    for (const key of ['asset', 'sha256', 'binaryName']) requireKey(targets[triple], key, errors, `targets.${triple}`);
  }

  return { ok: errors.length === 0, errors };
}

export function expectedAnchorSummary(manifest) {
  return {
    files: manifest?.sourceAnchors?.files ?? [],
    patchMarkers: manifest?.sourceAnchors?.patchMarkers ?? [],
    semanticTests: manifest?.sourceAnchors?.semanticTests ?? [],
    selfCheck: manifest?.sourceAnchors?.selfCheck ?? null
  };
}

function requireKey(object, key, errors, scope) {
  if (!object || object[key] === undefined || object[key] === null || object[key] === '') {
    errors.push(`${scope}.${key} is required`);
  }
}

function requireNonEmptyArray(value, errors, scope) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== 'string' || item.length === 0)) {
    errors.push(`${scope} must be a non-empty string array`);
  }
}
