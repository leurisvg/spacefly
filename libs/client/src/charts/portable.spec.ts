import { TestBed } from '@angular/core/testing';
import type { SankeyReport } from '@spacefly/shared';
import { formatTestProviders } from '../../testing/format-providers';
import { FormatService } from '../format/format.service';
import { PrivacyStore } from '../state/privacy.store';
import {
  categoryBarsOption,
  dailyBalanceOption,
  divergingOption,
  donutOption,
  incomeExpenseOption,
  linesOption,
  matrixHeatmapOption,
  rankingBarsOption,
  sankeyOption,
  sunburstOption,
  treemapOption,
  yearHeatmapOption,
} from './builders';
import { hydrateOption, hydrateSource, tagged, toPortableOption, type FormatterSpec } from './portable';

const t = (k: string) => k;
const months = ['2026-01', '2026-02', '2026-03'];
const slices = [
  { id: '1', name: 'Comida', value: 12500.5, color: '#3987e5' },
  { id: '2', name: 'Casa', value: 8000, color: '#d95926' },
  { id: null, name: 'Sin categoría', value: 450, color: '#199e70' },
];
const days = Array.from({ length: 40 }, (_, i) => ({
  date: `2026-0${1 + Math.floor(i / 31)}-${String((i % 31) + 1).padStart(2, '0')}`,
  income: i % 5 === 0 ? 1000 : 0,
  expense: i * 37.5,
  transferIn: 0,
  transferOut: 0,
  count: i % 3,
  balance: i < 35 ? 10000 - i * 120 : null,
}));
const sankey: SankeyReport = {
  nodes: [
    { id: 'rev', label: 'Salario', kind: 'revenue', value: 5000 },
    { id: 'hub', label: 'Ingresos', labelKey: 'sankey.hub', kind: 'hub', value: 5000 },
    { id: 'cat', label: 'Comida', kind: 'category', value: 3000 },
    { id: 'sav', label: 'Ahorro', kind: 'savings', value: 2000 },
  ],
  links: [
    { source: 'rev', target: 'hub', value: 5000 },
    { source: 'hub', target: 'cat', value: 3000 },
    { source: 'hub', target: 'sav', value: 2000 },
  ],
  totalIncome: 5000,
  totalExpense: 3000,
  savings: 2000,
  savingsLabel: 'savings',
};

function builders(f: FormatService): Record<string, () => unknown> {
  const rows = months.map((month, i) => ({ month, income: 5000 + i * 100, expense: 3000 + i * 250.75, net: 2000 - i * 150 }));
  return {
    incomeExpense: () => incomeExpenseOption(f, t, rows),
    incomeExpenseNoNet: () => incomeExpenseOption(f, t, rows.map((r) => ({ month: r.month, income: r.income, expense: r.expense }))),
    donut: () => donutOption(f, slices, 'Gastos', 20950.5),
    lines: () => linesOption(f, months, [{ id: '1', name: 'A', values: [1, 2, 3], color: '#111', area: true }, { id: '2', name: 'B', values: [3, 2, 1], color: '#222' }]),
    linesStacked: () => linesOption(f, months, [{ id: '1', name: 'A', values: [1, 2, 3], color: '#111' }, { id: '2', name: 'B', values: [3, 2, 1], color: '#222' }], { stack: true }),
    diverging: () => divergingOption(f, [{ name: 'Comida', delta: 1500 }, { name: 'Casa', delta: -700 }]),
    rankingBars: () => rankingBarsOption(f, [{ name: 'Comida', value: 12500 }, { name: 'Casa', value: 8000 }], '#3987e5'),
    treemap: () => treemapOption(f, slices),
    sunburst: () =>
      sunburstOption(f, [
        { id: '1', name: 'Hogar', color: '#3987e5', children: [{ id: '1', name: 'Luz', value: 100 }, { id: '2', name: 'Agua', value: 50 }] },
        { id: '2', name: 'Ocio', color: '#d95926', children: [{ id: '3', name: 'Cine', value: 25 }] },
      ]),
    yearHeatmap: () => yearHeatmapOption(f, t, 2026, days, 1500, false),
    yearHeatmapCompact: () => yearHeatmapOption(f, t, 2026, days, 1500, true),
    matrixHeatmap: () => matrixHeatmapOption(f, months, [{ name: 'Comida', values: [100, 200, 300] }, { name: 'Casa', values: [50, 0, 25] }]),
    sankeyHorizontal: () => sankeyOption(f, sankey, (n) => n.label, false),
    sankeyVertical: () => sankeyOption(f, sankey, (n) => n.label, true),
    dailyBalance: () => dailyBalanceOption(f, 'Balance', days),
    categoryBars: () => categoryBarsOption(f, ['L', 'M', 'X'], [10, 0, 2500], '#3987e5', 'Gasto'),
  };
}

/** The hydrate function exactly as the WebView receives it: evaluated from its source text, no closure. */
const webViewHydrate = new Function(`return ${hydrateSource()}`)() as typeof hydrateOption;

const NUMBERS = [0, 7, -950, 1234.5, 98_765.4321, 1_500_000, null, undefined];

/**
 * Parameters ECharts would hand a formatter, built from what the spec knows about its table. Each entry is a
 * list of alternative shapes for the same target (item triggers pass an object, axis triggers an array).
 */
function sampleParams(spec: FormatterSpec): unknown[][] {
  if (spec.k === 'compact') return NUMBERS.map((n) => [spec.field === 'self' ? n : { value: n }]);
  if (spec.k === 'const') return [[undefined]];
  const keys = Array.isArray(spec.table) ? spec.table.map((_, i) => String(i)) : Object.keys(spec.table);
  return keys.map((key): unknown[] => {
    switch (spec.key) {
      case 'index':
        return [{ dataIndex: Number(key) }, [{ dataIndex: Number(key) }]];
      case 'name':
        return [{ name: key }];
      case 'dataName':
        return [{ data: { name: key } }];
      case 'path':
        return [{ treePathInfo: ['root', ...key.split(' › ')].map((name) => ({ name })) }];
      case 'sankey':
        return key.includes('→') ? [{ dataType: 'edge', data: { source: key.split('→')[0], target: key.split('→')[1] } }] : [{ dataType: 'node', data: { name: key } }];
    }
  });
}

/** Walks the live option and its hydrated twin together and checks every formatter answers the same. */
function expectSameFormatters(live: unknown, portable: unknown, hydrated: unknown, path = 'option'): number {
  if (typeof live === 'function') {
    const spec = (portable as { __fn: FormatterSpec }).__fn;
    const fn = hydrated as (p: unknown) => string;
    let checked = 0;
    for (const shapes of sampleParams(spec)) {
      const answered = shapes.some((params) => {
        // The live donut formatter reads ECharts' own `percent`; give it the same one the table derives.
        const arg = isIndexParams(params) ? { percent: percentOf(params), ...params } : params;
        let expected: string;
        try {
          expected = (live as (p: unknown) => string)(arg);
        } catch {
          return false; // this formatter takes the other shape (object vs array)
        }
        expect(fn(params), `${path} ${JSON.stringify(params)}`).toBe(expected);
        return true;
      });
      expect(answered, `${path}: live formatter accepts one of ${JSON.stringify(shapes)}`).toBe(true);
      checked++;
    }
    return checked;
  }
  if (Array.isArray(live)) return live.reduce((n, v, i) => n + expectSameFormatters(v, (portable as unknown[])[i], (hydrated as unknown[])[i], `${path}[${i}]`), 0);
  if (live && typeof live === 'object') {
    return Object.keys(live).reduce(
      (n, k) =>
        n + expectSameFormatters((live as Record<string, unknown>)[k], (portable as Record<string, unknown>)[k], (hydrated as Record<string, unknown>)[k], `${path}.${k}`),
      0,
    );
  }
  expect(hydrated, path).toEqual(live);
  return 0;
}

const isIndexParams = (p: unknown): p is { dataIndex: number } => !!p && typeof p === 'object' && !Array.isArray(p) && 'dataIndex' in p;

const percentOf = (params: { dataIndex: number }): number => {
  const total = slices.reduce((s, x) => s + x.value, 0);
  return ((slices[params.dataIndex]?.value ?? 0) / total) * 100;
};

describe('portable chart options', () => {
  for (const lang of ['es', 'en'] as const) {
    for (const hidden of [false, true]) {
      describe(`${lang}, privacy ${hidden ? 'on' : 'off'}`, () => {
        let f: FormatService;
        beforeEach(() => {
          TestBed.configureTestingModule({ providers: formatTestProviders(lang).providers });
          f = TestBed.inject(FormatService);
          TestBed.inject(PrivacyStore).set(hidden);
        });

        it('serializes every shared builder and rebuilds identical formatters in the WebView', () => {
          const all = builders(f);
          for (const [name, build] of Object.entries(all)) {
            const live = build();
            const portable = toPortableOption(live);
            const json = JSON.parse(JSON.stringify(portable)) as unknown;
            const checked = expectSameFormatters(live, json, webViewHydrate(json), name);
            expect(checked, `${name} has formatters to compare`).toBeGreaterThan(0);
          }
        });
      });
    }
  }

  it('rejects an untagged formatter and says where it is', () => {
    expect(() => toPortableOption({ series: [{ label: { formatter: (v: number) => String(v) } }] })).toThrow(/option\.series\[0\]\.label\.formatter/);
  });

  it('keeps tagged formatters callable as the original function', () => {
    const fn = tagged({ k: 'const', value: 'x' }, () => 'live');
    expect(fn()).toBe('live');
    expect(toPortableOption({ a: fn })).toEqual({ a: { __fn: { k: 'const', value: 'x' } } });
  });

  it('hydrates without any outer reference (its source runs in an empty scope)', () => {
    const out = webViewHydrate({ axisLabel: { formatter: { __fn: { k: 'compact', locale: 'en-US', symbol: 'US$', hidden: false, field: 'self', blankZero: false } } } }) as {
      axisLabel: { formatter: (v: number) => string };
    };
    expect(out.axisLabel.formatter(-12_900)).toBe('−US$12.9K');
  });
});
