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
  // `node:sqlite` only exists with its prefix; tsup strips it by default, which breaks the import at runtime.
  removeNodeProtocol: false,
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
