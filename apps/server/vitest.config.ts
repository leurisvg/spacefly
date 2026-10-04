import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@shared': fileURLToPath(new URL('../../libs/shared/src/index.ts', import.meta.url)) },
  },
  test: {
    root: fileURLToPath(new URL('.', import.meta.url)),
    include: ['test/**/*.spec.ts'],
    environment: 'node',
  },
});
