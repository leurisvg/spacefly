// Fails when the Flutter files generated from the TypeScript/JSON sources (models, theme tokens, strings) are out of date.
// It regenerates them in place and compares the result with what was on disk, so uncommitted work elsewhere does not matter.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIRS = ['apps/mobile/lib/api', 'apps/mobile/lib/theme', 'apps/mobile/lib/i18n'];
const GENERATED = /\.g\.dart$|\.i18n\.json$/;

function snapshot() {
  const out = new Map();
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (GENERATED.test(name)) out.set(path, createHash('sha256').update(readFileSync(path)).digest('hex'));
    }
  };
  DIRS.forEach(walk);
  return out;
}

const before = snapshot();
execSync('npm run --silent gen:mobile', { stdio: 'inherit' });
const after = snapshot();

const stale = [...new Set([...before.keys(), ...after.keys()])].filter((path) => before.get(path) !== after.get(path));
if (stale.length > 0) {
  console.error(`\nGenerated Flutter files are out of date (they were regenerated; commit them):\n${stale.map((p) => `  ${p}`).join('\n')}`);
  process.exit(1);
}
console.log('Flutter generated files are up to date.');
