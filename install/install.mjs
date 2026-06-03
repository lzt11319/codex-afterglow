#!/usr/bin/env node
import { parseInstallerArgs, runInstaller } from '../lib/installer.mjs';

const args = parseInstallerArgs(process.argv.slice(2));
if (args.help || args.noArgs) {
  printHelp();
  process.exit(0);
}
const result = await runInstaller(args);
if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else if (result.ok) {
  console.log(result.notes?.join('\n') || 'ok');
  if (result.rollbackCommand) console.log(`Rollback: ${result.rollbackCommand}`);
} else {
  console.error(`Refused: ${result.refusalReason}`);
  if (result.rollbackCommand) console.error(`Rollback: ${result.rollbackCommand}`);
  if (result.error) console.error(result.error);
}
process.exit(result.ok ? 0 : 2);

function printHelp() {
  console.log(`Usage: node install/install.mjs [--dry-run|--install|--rollback <backup-dir>] [options]\n\nDefault is safe dry-run/help behavior. Real replacement requires explicit --install.\n\nOptions:\n  --json\n  --manifest <path-or-url>\n  --package-root <official @openai/codex package root>\n  --codex-binary <explicit advanced binary path>\n  --target-triple <triple>\n  --asset <local release binary path>\n  --asset-url <remote release binary url>\n  --asset-base-url <base url used with manifest target asset name>\n  --expected-sha256 <sha256>\n  --backup-dir <path>\n`);
}
