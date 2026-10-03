import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { main: 'src/main.ts' },
  outDir: '../dist/server',
  format: ['esm'],
  platform: 'node',
  target: 'node24',
  sourcemap: true,
  clean: true,
  tsconfig: 'tsconfig.json',
  // Bundle everything (incl. node_modules) so the runtime image only needs this folder.
  noExternal: [/.*/],
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
