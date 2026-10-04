import { readFileSync } from 'node:fs';
import { PALETTE_VARS } from './palette';

/** Every stylesheet that must define the chart tokens with the same values as palette.ts. */
const STYLESHEETS = ['apps/web/src/styles.css', 'apps/mobile/src/app.css'];

function declared(css: string, name: string): string | undefined {
  const m = new RegExp(`${name}:\\s*([^;]+);`).exec(css);
  return m?.[1].trim();
}

describe('palette parity', () => {
  for (const file of STYLESHEETS) {
    it(`${file} defines the same tokens as palette.ts`, () => {
      const css = readFileSync(file, 'utf8');
      for (const [name, value] of Object.entries(PALETTE_VARS)) {
        expect(declared(css, name), `${name} in ${file}`).toBe(value);
      }
    });
  }
});
