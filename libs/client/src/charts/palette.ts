import { signal } from '@angular/core';

/**
 * Design tokens used by charts, one set per theme, copied from apps/web/src/styles.css (web) and
 * apps/mobile/src/app.css (mobile). Charts can't read CSS custom properties on mobile (and ECharts needs
 * concrete colors anyway), so both apps draw from this file; `palette.spec.ts` fails if it drifts from the
 * stylesheets.
 */
export const THEME_IDS = ['midnight', 'earth'] as const;
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
};

/** Page and accent color of each theme, for the pickers' preview swatch (the accent is `--primary`; `palette.spec.ts` checks it). */
export const THEME_SWATCH: Record<ThemeId, { readonly background: string; readonly accent: string }> = {
  midnight: { background: MIDNIGHT['--background'], accent: '#818cf8' },
  earth: { background: '#2c3639', accent: '#a27b5c' },
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
