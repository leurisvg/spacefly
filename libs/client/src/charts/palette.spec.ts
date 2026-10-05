import { readFileSync } from 'node:fs';
import { buildTheme } from './chart-theme';
import { activeTheme, FONT_VARS, palette, paletteOf, setPaletteTheme, THEME_IDS, THEME_SWATCH, THEMES, type ThemeId } from './palette';

const WEB = readFileSync('apps/web/src/styles.css', 'utf8');
const MOBILE = readFileSync('apps/mobile/src/app.css', 'utf8');

/** Body of the first rule whose selector matches (rules in these stylesheets don't nest). */
function block(css: string, selector: RegExp, where: string): string {
  const m = selector.exec(css);
  if (!m) throw new Error(`${where}: no rule matches ${selector}`);
  const start = css.indexOf('{', m.index) + 1;
  return css.slice(start, css.indexOf('}', start));
}

function declarations(body: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) out.set(m[1], m[2].trim().toLowerCase());
  return out;
}

const webBlock = (id: ThemeId) => block(WEB, new RegExp(`\\[data-theme='${id}'\\][^{]*\\{`), 'styles.css');
/** Mobile: each theme is a class the theme host puts on the root view (NativeScript does not match `:root` on its own). */
const mobileBlock = (id: ThemeId) => block(MOBILE, new RegExp(`^\\.theme-${id}\\s*\\{`, 'm'), 'app.css');

describe('palette parity', () => {
  for (const id of THEME_IDS) {
    describe(id, () => {
      const web = declarations(webBlock(id));
      const mobile = declarations(mobileBlock(id));

      it('styles.css defines the same chart tokens as palette.ts', () => {
        for (const [name, value] of Object.entries(THEMES[id])) {
          expect(web.get(name), `${name} in styles.css`).toBe(value.toLowerCase());
        }
      });

      it('app.css defines the same chart tokens as palette.ts', () => {
        for (const [name, value] of Object.entries(THEMES[id])) {
          expect(mobile.get(name), `${name} in app.css`).toBe(value.toLowerCase());
        }
      });

      it('the picker swatch is the theme background and --primary', () => {
        expect(THEME_SWATCH[id].background).toBe(THEMES[id]['--background']);
        expect(THEME_SWATCH[id].accent).toBe(web.get('--primary'));
      });

      it('every token app.css declares for the theme matches the web value', () => {
        for (const [name, value] of mobile) {
          if (web.has(name)) expect(value, `${name} in app.css`).toBe(web.get(name));
        }
      });
    });
  }

  it('every theme defines the same set of tokens on the web', () => {
    const [first, ...rest] = THEME_IDS.map((id) => [...declarations(webBlock(id)).keys()].sort());
    for (const names of rest) expect(names).toEqual(first);
  });

  it('every theme defines the same set of tokens on mobile', () => {
    const [first, ...rest] = THEME_IDS.map((id) => [...declarations(mobileBlock(id)).keys()].sort());
    for (const names of rest) expect(names).toEqual(first);
  });

  it('the fonts are declared once, in a shared :root rule, with the same value in both stylesheets', () => {
    for (const css of [WEB, MOBILE]) {
      const root = declarations(block(css, /^:root\s*\{/m, 'stylesheet'));
      for (const [name, value] of Object.entries(FONT_VARS)) expect(root.get(name)).toBe(value.toLowerCase());
    }
  });
});

describe('active theme', () => {
  afterEach(() => setPaletteTheme('midnight'));

  it('palette follows setPaletteTheme', () => {
    expect(activeTheme()).toBe('midnight');
    expect(palette.chartSurface).toBe(THEMES.midnight['--chart-surface']);
    setPaletteTheme('earth');
    expect(palette.chartSurface).toBe(THEMES.earth['--chart-surface']);
    expect(palette.series).toHaveLength(8);
    expect(palette.series[2]).toBe(THEMES.earth['--series-3']);
  });

  it('buildTheme takes the tooltip color and series from the requested theme', () => {
    expect(buildTheme('earth').tooltip.backgroundColor).toBe(paletteOf('earth').chartTooltip);
    expect(buildTheme('midnight').color).toEqual([...paletteOf('midnight').series]);
    setPaletteTheme('earth');
    expect(buildTheme().color).toEqual([...paletteOf('earth').series]);
  });
});
