// Fails when more than one copy of @angular/core is installed: the mobile app must reuse the
// root copy (see CLAUDE.md). Run through `npm run check:deps`.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';

const out = execFileSync('npm', ['ls', '@angular/core', '--all', '--json', '--long=false'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
}).toString();

const versions = new Set();
const walk = (node, name) => {
  if (name === '@angular/core' && node.version) versions.add(`${node.version} @ ${node.resolved ?? node.path ?? 'root'}`);
  for (const [n, child] of Object.entries(node.dependencies ?? {})) walk(child, n);
};
walk(JSON.parse(out), '');

const installed = new Set([...versions].map((v) => v.split(' ')[0]));
if (installed.size > 1) {
  console.error(`More than one @angular/core version installed: ${[...installed].join(', ')}`);
  process.exit(1);
}
console.log(`@angular/core ${[...installed][0]}: single copy`);

// Two copies of the same version would still break DI, so also look for physical duplicates.
const copies = ['node_modules'];
for (const group of ['apps', 'libs']) {
  for (const dir of readdirSync(group)) copies.push(`${group}/${dir}/node_modules`);
}
const duplicates = copies.filter((c) => existsSync(`${c}/@angular/core/package.json`));
if (duplicates.length > 1) {
  console.error(`@angular/core is installed in more than one place: ${duplicates.join(', ')}`);
  process.exit(1);
}
