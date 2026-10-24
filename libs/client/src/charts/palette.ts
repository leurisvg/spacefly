import { signal } from '@angular/core';

/**
 * Design tokens used by charts, one set per theme, copied from apps/web/src/styles.css. ECharts needs
 * concrete colors rather than CSS custom properties, so the charts draw from this file;
 * `palette.spec.ts` fails if it drifts from the stylesheet.
 */
export const THEME_IDS = ['midnight', 'earth', 'dusk', 'frappe', 'macchiato', 'mocha'] as const;
export type ThemeId = (typeof THEME_IDS)[number];
export const DEFAULT_THEME: ThemeId = 'midnight';

export function isThemeId(value: unknown): value is ThemeId {
  return (THEME_IDS as readonly unknown[]).includes(value);
}

/** Typefaces are the same in every theme. */
export const FONT_VARS = {
  '--font-sans': "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  '--font-mono': "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
} as const;

const MIDNIGHT = {
  '--background': '#0a0e1a',
  '--chart-surface': '#111827',
  '--chart-ink': '#e2e8f0',
  '--chart-ink-2': '#94a3b8',
  '--chart-muted': '#64748b',
  '--chart-grid': '#1e293b',
  '--chart-axis': '#334155',
  '--chart-tooltip': '#0f172a',
  '--chart-on-fill': '#ffffff',
  '--money-income': '#199e70',
  '--money-expense': '#e66767',
  '--money-net': '#3987e5',
  '--money-savings': '#008300',
  '--money-budget': '#3987e5',
  '--money-revenue': '#9085e9',
  '--money-hub': '#64748b',
  '--money-deficit': '#d95926',
  '--money-other': '#475569',
  '--series-1': '#3987e5',
  '--series-2': '#d95926',
  '--series-3': '#199e70',
  '--series-4': '#c98500',
  '--series-5': '#d55181',
  '--series-6': '#008300',
  '--series-7': '#9085e9',
  '--series-8': '#e66767',
} as const;

export type PaletteVars = { readonly [K in keyof typeof MIDNIGHT]: string };

/**
 * Chart tokens per theme.
 * - midnight: validated with the dataviz palette validator on #111827 (dark band, >= 3:1, adjacent CVD ΔE >= 8
 *   except income/expense, which ships with signs + legend).
 * - earth: the surface (#3F4E4F) is a mid-tone, so a mark needs a lighter step to reach 3:1 on it than the dark band
 *   allows. Validated in `light` mode against #3F4E4F: band 0.43–0.77, chroma >= 0.10, adjacent CVD ΔE >= 8, normal
 *   vision ΔE >= 15, >= 3:1 contrast, with no income/expense exception. Passing meant a different slot order than
 *   midnight (green/orange next to each other fail under deuteranopia); money-* tokens keep their meaning
 *   (green income, red expense, blue net…) regardless of slot. money-hub/other are recessive neutrals, like midnight's.
 * - dusk: surface #464858, same validation in `light` mode (all five checks pass, no exceptions); a third slot order.
 * - frappe / macchiato / mocha (Catppuccin): page = Base, cards and charts = Mantle, sidebar = Mantle, accent = Mauve.
 *   The money-* tokens and the chrome are the flavor's own colors. The pastel accents sit above the validator's
 *   lightness band, so the series slots are each accent nudged (same hue, slightly darker and more saturated) until
 *   the palette passes in `light` mode on its card, Mantle (frappe #292c3c, macchiato #1e2030, mocha #181825): band,
 *   chroma, adjacent CVD ΔE >= 8, normal vision ΔE >= 15, >= 3:1 contrast, no exceptions; one slot order per flavor.
 */
export const THEMES: Record<ThemeId, PaletteVars> = {
  midnight: MIDNIGHT,
  earth: {
    '--background': '#2c3639',
    '--chart-surface': '#3f4e4f',
    '--chart-ink': '#dcd7c9',
    '--chart-ink-2': '#bdbcb1',
    '--chart-muted': '#a5a79e',
    '--chart-grid': '#525e5e',
    '--chart-axis': '#66706e',
    '--chart-tooltip': '#2c3639',
    '--chart-on-fill': '#1b2224',
    '--money-income': '#82c170',
    '--money-expense': '#d98182',
    '--money-net': '#3db3e6',
    '--money-savings': '#3eae99',
    '--money-budget': '#3db3e6',
    '--money-revenue': '#9f93ed',
    '--money-hub': '#a3ada5',
    '--money-deficit': '#e99d59',
    '--money-other': '#7d8b87',
    '--series-1': '#b49718',
    '--series-2': '#de7ea0',
    '--series-3': '#82c170',
    '--series-4': '#9f93ed',
    '--series-5': '#3eae99',
    '--series-6': '#e99d59',
    '--series-7': '#3db3e6',
    '--series-8': '#d98182',
  },
  dusk: {
    '--background': '#0f3040',
    '--chart-surface': '#464858',
    '--chart-ink': '#f0d7cc',
    '--chart-ink-2': '#cebab5',
    '--chart-muted': '#b5a5a3',
    '--chart-grid': '#5a5966',
    '--chart-axis': '#716c75',
    '--chart-tooltip': '#0f3040',
    '--chart-on-fill': '#11151a',
    '--money-income': '#6eb15f',
    '--money-expense': '#dd7f7b',
    '--money-net': '#6ca9e1',
    '--money-savings': '#24bbab',
    '--money-budget': '#6ca9e1',
    '--money-revenue': '#b597f0',
    '--money-hub': '#9aa0b4',
    '--money-deficit': '#e0a165',
    '--money-other': '#7b8098',
    '--series-1': '#e0a165',
    '--series-2': '#6ca9e1',
    '--series-3': '#6eb15f',
    '--series-4': '#e294b3',
    '--series-5': '#b6951f',
    '--series-6': '#24bbab',
    '--series-7': '#b597f0',
    '--series-8': '#dd7f7b',
  },
  frappe: {
    '--background': '#303446',
    '--chart-surface': '#292c3c',
    '--chart-ink': '#c6d0f5',
    '--chart-ink-2': '#b5bfe2',
    '--chart-muted': '#838ba7',
    '--chart-grid': '#51576d',
    '--chart-axis': '#626880',
    '--chart-tooltip': '#232634',
    '--chart-on-fill': '#232634',
    '--money-income': '#a6d189',
    '--money-expense': '#e78284',
    '--money-net': '#8caaee',
    '--money-savings': '#81c8be',
    '--money-budget': '#8caaee',
    '--money-revenue': '#ca9ee6',
    '--money-hub': '#838ba7',
    '--money-deficit': '#ef9f76',
    '--money-other': '#737994',
    '--series-1': '#92bb76',
    '--series-2': '#de8ec9',
    '--series-3': '#d6ab5a',
    '--series-4': '#06bfa9',
    '--series-5': '#c592e8',
    '--series-6': '#d07c57',
    '--series-7': '#90aaf3',
    '--series-8': '#dd787c',
  },
  macchiato: {
    '--background': '#24273a',
    '--chart-surface': '#1e2030',
    '--chart-ink': '#cad3f5',
    '--chart-ink-2': '#b8c0e0',
    '--chart-muted': '#8087a2',
    '--chart-grid': '#494d64',
    '--chart-axis': '#5b6078',
    '--chart-tooltip': '#181926',
    '--chart-on-fill': '#181926',
    '--money-income': '#a6da95',
    '--money-expense': '#ed8796',
    '--money-net': '#8aadf4',
    '--money-savings': '#8bd5ca',
    '--money-budget': '#8aadf4',
    '--money-revenue': '#c6a0f6',
    '--money-hub': '#8087a2',
    '--money-deficit': '#f5a97f',
    '--money-other': '#6e738d',
    '--series-1': '#7c9df6',
    '--series-2': '#d97385',
    '--series-3': '#1fc8be',
    '--series-4': '#f69961',
    '--series-5': '#c49ff9',
    '--series-6': '#8ec471',
    '--series-7': '#da87c7',
    '--series-8': '#daa637',
  },
  mocha: {
    '--background': '#1e1e2e',
    '--chart-surface': '#181825',
    '--chart-ink': '#cdd6f4',
    '--chart-ink-2': '#bac2de',
    '--chart-muted': '#7f849c',
    '--chart-grid': '#45475a',
    '--chart-axis': '#585b70',
    '--chart-tooltip': '#11111b',
    '--chart-on-fill': '#11111b',
    '--money-income': '#a6e3a1',
    '--money-expense': '#f38ba8',
    '--money-net': '#89b4fa',
    '--money-savings': '#94e2d5',
    '--money-budget': '#89b4fa',
    '--money-revenue': '#cba6f7',
    '--money-hub': '#7f849c',
    '--money-deficit': '#fab387',
    '--money-other': '#6c7086',
    '--series-1': '#43c4b9',
    '--series-2': '#ec8f52',
    '--series-3': '#c881b9',
    '--series-4': '#cba747',
    '--series-5': '#eb91ae',
    '--series-6': '#8cb0f8',
    '--series-7': '#89c679',
    '--series-8': '#c69dfb',
  },
};

/** Page and accent color of each theme, for the pickers' preview swatch (the accent is `--primary`; `palette.spec.ts` checks it). */
export const THEME_SWATCH: Record<ThemeId, { readonly background: string; readonly accent: string }> = {
  midnight: { background: MIDNIGHT['--background'], accent: '#818cf8' },
  earth: { background: '#2c3639', accent: '#a27b5c' },
  dusk: { background: '#0f3040', accent: '#a56f63' },
  frappe: { background: '#303446', accent: '#ca9ee6' },
  macchiato: { background: '#24273a', accent: '#c6a0f6' },
  mocha: { background: '#1e1e2e', accent: '#cba6f7' },
};

function build(id: ThemeId) {
  const v = THEMES[id];
  return {
    fontSans: FONT_VARS['--font-sans'],
    fontMono: FONT_VARS['--font-mono'],
    background: v['--background'],
    chartSurface: v['--chart-surface'],
    chartInk: v['--chart-ink'],
    chartInk2: v['--chart-ink-2'],
    chartMuted: v['--chart-muted'],
    chartGrid: v['--chart-grid'],
    chartAxis: v['--chart-axis'],
    chartTooltip: v['--chart-tooltip'],
    /** Label color on a filled mark (treemap tile, sunburst slice). */
    chartOnFill: v['--chart-on-fill'],
    moneyIncome: v['--money-income'],
    moneyExpense: v['--money-expense'],
    moneyNet: v['--money-net'],
    moneySavings: v['--money-savings'],
    moneyBudget: v['--money-budget'],
    moneyRevenue: v['--money-revenue'],
    moneyHub: v['--money-hub'],
    moneyDeficit: v['--money-deficit'],
    moneyOther: v['--money-other'],
    /** Categorical slots, in assignment order. */
    series: [v['--series-1'], v['--series-2'], v['--series-3'], v['--series-4'], v['--series-5'], v['--series-6'], v['--series-7'], v['--series-8']] as readonly string[],
  } as const;
}

export type Palette = ReturnType<typeof build>;

const BUILT = Object.fromEntries(THEME_IDS.map((id) => [id, build(id)])) as Record<ThemeId, Palette>;

const active = signal<ThemeId>(DEFAULT_THEME);

/** The theme the charts draw with. A signal, so anything computed from `palette` follows a theme change. */
export const activeTheme = active.asReadonly();

export function setPaletteTheme(id: ThemeId): void {
  active.set(id);
}

/** Plain palette of one theme (no signal read): for registering every theme with ECharts. */
export function paletteOf(id: ThemeId): Palette {
  return BUILT[id];
}

/**
 * The palette of the active theme. Every field is a getter that reads `activeTheme()`, so a `computed()` that
 * builds a chart option from it recomputes when the theme changes, and no builder needs to know about themes.
 */
export const palette: Palette = Object.defineProperties(
  {} as Palette,
  Object.fromEntries(
    (Object.keys(BUILT[DEFAULT_THEME]) as (keyof Palette)[]).map((key) => [key, { enumerable: true, get: () => BUILT[active()][key] }]),
  ),
);
