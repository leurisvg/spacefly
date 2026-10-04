import type { EChartsCoreOption } from 'echarts/core';
import type { AccountDay, SankeyReport } from '@spacefly/shared';
import type { FormatService } from '../format/format.service';
import { esc, tooltipRow, tooltipTitle } from './chart-theme';
import { palette } from './palette';
import { byIndex, byKey, byName, constant, tagged } from './portable';
import { money } from './series-colors';

/**
 * Option builders shared by every screen. They follow the mark specs: bars <= 24px with
 * 4px rounded data-ends, 2px lines, >= 8px end markers with a surface ring, hairline grid,
 * a legend whenever there are >= 2 series, one value axis only, escaped tooltip labels.
 */

type Fmt = FormatService;

const GRID = { left: 8, right: 16, top: 40, bottom: 8, containLabel: true };
const legendTop = (names: string[]) => ({ top: 0, left: 0, data: names });

/** `f.compact` as a portable formatter. `field: 'value'` reads `{ value }` (series labels) instead of the bare number (axes). `currency` picks the symbol (default: the display currency). */
const compactFmt = (f: Fmt, field: 'self' | 'value' = 'self', blankZero = false, currency?: string) =>
  tagged({ k: 'compact', ...f.compactParts(currency), field, blankZero }, (arg: number | { value: number }) => {
    const v = field === 'self' ? (arg as number) : (arg as { value: number }).value;
    return blankZero && !v ? '' : f.compact(v, currency);
  });

function moneyAxis(f: Fmt, currency?: string) {
  return {
    type: 'value' as const,
    axisLabel: { formatter: compactFmt(f, 'self', false, currency) },
    splitNumber: 4,
  };
}

/** Columns for income vs expenses per month plus a net line — all on the same currency axis. */
export function incomeExpenseOption(
  f: Fmt,
  t: (k: string) => string,
  rows: { month: string; income: number; expense: number; net?: number; own?: { income: number; expense: number } }[],
  /** Currency the account keeps its money in: when given (and rows carry `own`) it is plotted and the conversion goes in the tooltip. */
  own?: string,
): EChartsCoreOption {
  const mine = (r: (typeof rows)[number]) => (own && r.own ? r.own : r);
  const names = [t('common.income'), t('common.expenses'), ...(rows.some((r) => r.net !== undefined) ? [t('common.net')] : [])];
  return {
    grid: GRID,
    legend: legendTop(names),
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(148,163,184,0.06)' } },
      formatter: byIndex(rows.length, (i) => {
        const r = rows[i];
        const m = mine(r);
        const ownNet = own && r.own ? r.own.income - r.own.expense : r.net;
        const conv = (v: number) => (m === r ? undefined : f.money(v));
        return (
          tooltipTitle(f.date(r.month, 'month')) +
          tooltipRow(money.income(), names[0], f.money(m.income, own), conv(r.income)) +
          tooltipRow(money.expense(), names[1], f.money(-m.expense, own), conv(-r.expense)) +
          (r.net !== undefined ? tooltipRow(money.net(), names[2], f.money(ownNet, own, { signed: true }), conv(r.net)) : '')
        );
      }),
    },
    xAxis: { type: 'category', data: rows.map((r) => f.monthLabel(r.month)) },
    yAxis: moneyAxis(f, own),
    series: [
      { name: names[0], type: 'bar', data: rows.map((r) => mine(r).income), itemStyle: { color: money.income() }, barGap: '8%' },
      { name: names[1], type: 'bar', data: rows.map((r) => mine(r).expense), itemStyle: { color: money.expense() } },
      ...(names[2]
        ? [
            {
              name: names[2],
              type: 'line',
              data: rows.map((r) => (own && r.own ? r.own.income - r.own.expense : (r.net ?? 0))),
              itemStyle: { color: money.net(), borderColor: money.surface(), borderWidth: 2 },
              lineStyle: { color: money.net(), width: 2 },
              symbolSize: 8,
              z: 3,
            },
          ]
        : []),
    ],
  };
}

export interface Slice {
  id: string | null;
  name: string;
  value: number;
  color: string;
}

/** Donut for part-to-whole with few slices (others already folded). */
export function donutOption(f: Fmt, slices: Slice[], centerLabel: string, total: number): EChartsCoreOption {
  const donutTotal = slices.reduce((sum, s) => sum + s.value, 0);
  return {
    tooltip: {
      trigger: 'item',
      // The live formatter uses ECharts' own `percent`; the portable table derives it from the values.
      formatter: tagged(
        { k: 'byKey', key: 'index', table: slices.map((s) => tooltipRow(s.color, `${s.name} · ${f.share(donutTotal ? (s.value / donutTotal) * 100 : 0, 1)}`, f.money(s.value))) },
        (p: { dataIndex: number; percent: number }) => {
          const s = slices[p.dataIndex];
          return tooltipRow(s.color, `${s.name} · ${f.share(p.percent, 1)}`, f.money(s.value));
        },
      ),
    },
    legend: { show: false },
    title: {
      text: f.compact(total),
      subtext: centerLabel,
      left: 'center',
      top: '40%',
      textStyle: { fontSize: 18, fontWeight: 600, color: money.ink() },
      subtextStyle: { fontSize: 11, color: money.muted() },
      itemGap: 4,
    },
    series: [
      {
        type: 'pie',
        radius: ['58%', '82%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        data: slices.map((s) => ({ name: s.name, value: s.value, itemStyle: { color: s.color } })),
        emphasis: { scale: true, scaleSize: 4 },
      },
    ],
  };
}

export interface LineSeries {
  id: string | null;
  name: string;
  values: number[];
  color: string;
  area?: boolean;
}

/** Multi-series lines over months (legend + end markers). */
export function linesOption(f: Fmt, months: string[], series: LineSeries[], opts: { stack?: boolean; zeroBased?: boolean } = {}): EChartsCoreOption {
  return {
    grid: { ...GRID, top: series.length > 1 ? 40 : 16 },
    legend: series.length > 1 ? { ...legendTop(series.map((s) => s.name)), type: 'scroll' } : { show: false },
    tooltip: {
      trigger: 'axis',
      // Axis tooltips list every series at the hovered month, so they depend on the month only.
      formatter: byIndex(
        months.length,
        (i) =>
          tooltipTitle(f.date(months[i], 'month')) +
          series.map((s) => tooltipRow(s.color, s.name, f.money(s.values[i]))).join('') +
          (opts.stack && series.length > 1 ? tooltipRow(money.ink2(), 'Σ', f.money(series.reduce((sum, s) => sum + s.values[i], 0))) : ''),
      ),
    },
    xAxis: { type: 'category', data: months.map((m) => f.monthLabel(m)), boundaryGap: false },
    yAxis: { ...moneyAxis(f), scale: !opts.zeroBased && !opts.stack },
    series: series.map((s) => ({
      name: s.name,
      type: 'line',
      stack: opts.stack ? 'total' : undefined,
      data: s.values,
      showSymbol: months.length <= 13,
      symbolSize: 8,
      itemStyle: { color: s.color, borderColor: money.surface(), borderWidth: 2 },
      lineStyle: { color: s.color, width: 2 },
      areaStyle: s.area || opts.stack ? { color: s.color, opacity: opts.stack ? 0.35 : 0.1 } : undefined,
      emphasis: { focus: 'series' },
      endLabel: series.length <= 4 && !opts.stack ? { show: true, formatter: constant(f.compact(s.values.at(-1) ?? 0)), color: money.ink2(), fontSize: 11 } : undefined,
    })),
  };
}

/** Horizontal diverging bars for deltas (blue = lower, red = higher spending), gray-free midpoint at 0. */
export function divergingOption(
  f: Fmt,
  rows: { name: string; delta: number }[],
  upIsBad = true,
): EChartsCoreOption {
  const shown = rows.slice(0, 15).reverse();
  const bad = money.expense();
  const good = money.net();
  return {
    grid: { left: 8, right: 56, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'item',
      formatter: byIndex(shown.length, (i) => {
        const r = shown[i];
        return tooltipRow(r.delta > 0 === upIsBad ? bad : good, r.name, f.money(r.delta, undefined, { signed: true }));
      }),
    },
    xAxis: { type: 'value', axisLabel: { formatter: compactFmt(f) }, splitNumber: 4 },
    yAxis: { type: 'category', data: shown.map((r) => r.name), axisLabel: { width: 120, overflow: 'truncate' }, axisLine: { show: false } },
    series: [
      {
        type: 'bar',
        barMaxWidth: 16,
        data: shown.map((r) => ({
          value: r.delta,
          itemStyle: { color: r.delta > 0 === upIsBad ? bad : good, borderRadius: r.delta >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4] },
          label: {
            show: true,
            position: r.delta >= 0 ? 'right' : 'left',
            formatter: constant(f.compact(r.delta)),
            color: money.ink2(),
            fontSize: 11,
          },
        })),
      },
    ],
  };
}

/** Horizontal ranking bars (single series → one hue, no legend). */
export function rankingBarsOption(f: Fmt, rows: { name: string; value: number; own?: number }[], color: string, own?: string): EChartsCoreOption {
  const shown = rows.slice(0, 12).reverse();
  const plotted = (r: (typeof shown)[number]) => (own && r.own !== undefined ? r.own : r.value);
  return {
    grid: { left: 8, right: 64, top: 4, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'item',
      formatter: byIndex(shown.length, (i) => {
        const r = shown[i];
        return own && r.own !== undefined ? tooltipRow(color, r.name, f.money(r.own, own), f.money(r.value)) : tooltipRow(color, r.name, f.money(r.value));
      }),
    },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', data: shown.map((r) => r.name), axisLabel: { width: 130, overflow: 'truncate', color: money.ink2() }, axisLine: { show: false } },
    series: [
      {
        type: 'bar',
        barMaxWidth: 16,
        data: shown.map(plotted),
        itemStyle: { color, borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right', formatter: compactFmt(f, 'value', false, own), color: money.ink2(), fontSize: 11 },
      },
    ],
  };
}

export function treemapOption(f: Fmt, items: Slice[]): EChartsCoreOption {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return {
    tooltip: {
      formatter: byName(
        items.map((i) => [i.name, tooltipRow(i.color, `${i.name} · ${f.share((i.value / total) * 100, 1)}`, f.money(i.value))]),
        'dataName',
      ),
    },
    series: [
      {
        type: 'treemap',
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        label: {
          show: true,
          formatter: byName(items.map((i) => [i.name, `${i.name}\n${f.compact(i.value)}`])),
          color: '#fff',
          fontSize: 12,
          lineHeight: 16,
          overflow: 'truncate',
        },
        upperLabel: { show: false },
        itemStyle: { borderColor: money.surface(), borderWidth: 2, gapWidth: 2, borderRadius: 4 },
        data: items.map((i) => ({ name: i.name, value: i.value, id: i.id, color: i.color, itemStyle: { color: i.color } })),
      },
    ],
  };
}

/** Sunburst: inner ring = budgets, outer ring = categories within each budget. */
export function sunburstOption(
  f: Fmt,
  groups: { id: string | null; name: string; color: string; children: { id: string | null; name: string; value: number }[] }[],
): EChartsCoreOption {
  return {
    tooltip: {
      formatter: byKey(
        'path',
        Object.fromEntries(
          groups.flatMap((g) => [
            [g.name, tooltipRow(g.color, g.name, f.money(g.children.reduce((sum, c) => sum + c.value, 0)))],
            ...g.children.map((c) => [`${g.name} › ${c.name}`, tooltipRow(g.color, `${g.name} › ${c.name}`, f.money(c.value))]),
          ]),
        ),
      ),
    },
    series: [
      {
        type: 'sunburst',
        radius: ['12%', '92%'],
        sort: undefined,
        nodeClick: false,
        itemStyle: { borderColor: money.surface(), borderWidth: 2 },
        label: { color: '#fff', fontSize: 11, minAngle: 12, overflow: 'truncate' },
        levels: [{}, { r0: '12%', r: '45%', label: { rotate: 0 } }, { r0: '45%', r: '92%', label: { rotate: 'tangential' }, itemStyle: { opacity: 0.85 } }],
        data: groups.map((g) => ({
          name: g.name,
          itemStyle: { color: g.color },
          children: g.children.map((c) => ({ name: c.name, value: c.value, itemStyle: { color: g.color } })),
        })),
      },
    ],
  };
}

/** Year calendar heatmap: sequential single-hue (expense red) ramp from the surface up. */
export function yearHeatmapOption(f: Fmt, t: (k: string) => string, year: number, days: { date: string; expense: number }[], max: number, compactLayout: boolean): EChartsCoreOption {
  const lo = palette.chartGrid;
  const hi = money.expense();
  return {
    tooltip: {
      formatter: byIndex(days.length, (i) => tooltipTitle(f.date(days[i].date, 'full')) + tooltipRow(hi, t('common.expenses'), f.money(days[i].expense))),
    },
    visualMap: {
      min: 0,
      max: Math.max(max, 1),
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      itemWidth: 10,
      itemHeight: 120,
      inRange: { color: [lo, hi] },
      textStyle: { color: money.muted(), fontSize: 11 },
      formatter: compactFmt(f),
    },
    calendar: {
      range: String(year),
      orient: compactLayout ? 'vertical' : 'horizontal',
      top: compactLayout ? 30 : 24,
      left: compactLayout ? 30 : 36,
      right: compactLayout ? 10 : 8,
      bottom: compactLayout ? 50 : 48,
      cellSize: compactLayout ? ['auto', 14] : ['auto', 16],
      dayLabel: { firstDay: 1, nameMap: f.weekdayNames(), color: money.muted(), fontSize: 10 },
      monthLabel: { nameMap: Array.from({ length: 12 }, (_, i) => f.monthLabel(`${year}-${String(i + 1).padStart(2, '0')}`, false)), color: money.ink2(), fontSize: 11 },
      itemStyle: { color: lo, borderColor: money.surface(), borderWidth: 2 },
      splitLine: { show: false },
    },
    series: [{ type: 'heatmap', coordinateSystem: 'calendar', data: days.map((d) => [d.date, d.expense]) }],
  };
}

/** Month × category matrix for the annual report. */
export function matrixHeatmapOption(f: Fmt, months: string[], categories: { name: string; values: number[] }[]): EChartsCoreOption {
  const max = Math.max(1, ...categories.flatMap((c) => c.values));
  const shown = categories.slice(0, 15);
  return {
    grid: { left: 8, right: 8, top: 8, bottom: 40, containLabel: true },
    tooltip: {
      formatter: byIndex(
        shown.reduce((n, c) => n + c.values.length, 0),
        // Cells are laid out category by category, so the data index walks the rows in the same order.
        (i) => {
          const offsets = shown.map((c) => c.values.length);
          let y = 0;
          let rest = i;
          while (y < offsets.length - 1 && rest >= offsets[y]) rest -= offsets[y++];
          return tooltipTitle(`${shown[y].name} · ${f.date(months[rest], 'month')}`) + tooltipRow(money.expense(), '', f.money(shown[y].values[rest]));
        },
      ),
    },
    xAxis: { type: 'category', data: months.map((m) => f.monthLabel(m, false)), splitArea: { show: false }, axisLine: { show: false } },
    yAxis: { type: 'category', data: shown.map((c) => c.name), inverse: true, axisLabel: { width: 120, overflow: 'truncate' }, axisLine: { show: false } },
    visualMap: {
      min: 0,
      max,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      itemHeight: 120,
      itemWidth: 10,
      inRange: { color: [palette.chartGrid, money.expense()] },
      textStyle: { color: money.muted(), fontSize: 11 },
      formatter: compactFmt(f),
    },
    series: [
      {
        type: 'heatmap',
        data: shown.flatMap((c, y) => c.values.map((v, x) => [x, y, v])),
        itemStyle: { borderColor: money.surface(), borderWidth: 2, borderRadius: 3 },
        emphasis: { itemStyle: { borderColor: money.ink(), borderWidth: 1 } },
      },
    ],
  };
}

export const SANKEY_COLORS = {
  revenue: () => money.revenue(),
  income_cat: () => money.income(),
  hub: () => money.hub(),
  budget: () => money.budget(),
  tag: () => money.budget(),
  category: () => money.expense(),
  savings: () => money.savings(),
  deficit: () => money.deficit(),
  other: () => money.other(),
};

/** Interactive Sankey: hover highlights the whole path (trinity), nodes are draggable. */
export function sankeyOption(
  f: Fmt,
  report: SankeyReport,
  label: (n: SankeyReport['nodes'][number]) => string,
  vertical: boolean,
): EChartsCoreOption {
  const byId = new Map(report.nodes.map((n) => [n.id, n]));
  const pctOf = (v: number) => (report.totalIncome ? ` · ${f.share((v / report.totalIncome) * 100, 1)}` : '');
  return {
    tooltip: {
      trigger: 'item',
      formatter: byKey('sankey', {
        ...Object.fromEntries(
          report.links.map((l) => {
            const s = byId.get(l.source)!;
            const t = byId.get(l.target)!;
            return [
              `${l.source}→${l.target}`,
              tooltipTitle(`${label(s)} → ${label(t)}`) + `<div style="font-family:${palette.fontMono}">${esc(f.money(l.value))}${esc(pctOf(l.value))}</div>`,
            ];
          }),
        ),
        ...Object.fromEntries(report.nodes.map((n) => [n.id, tooltipRow(SANKEY_COLORS[n.kind](), label(n), `${f.money(n.value)}${pctOf(n.value)}`)])),
      }),
    },
    series: [
      {
        type: 'sankey',
        orient: vertical ? 'vertical' : 'horizontal',
        left: vertical ? 8 : 4,
        right: vertical ? 8 : 150,
        top: vertical ? 8 : 12,
        bottom: vertical ? 100 : 12,
        nodeGap: vertical ? 8 : 12,
        nodeWidth: vertical ? 14 : 16,
        nodeAlign: 'justify',
        layoutIterations: 64,
        draggable: true,
        emphasis: { focus: 'trinity' },
        data: report.nodes.map((n) => ({ name: n.id, value: n.value, itemStyle: { color: SANKEY_COLORS[n.kind](), borderWidth: 0 } })),
        links: report.links,
        lineStyle: { color: 'gradient', opacity: 0.32, curveness: 0.5 },
        label: {
          color: money.ink(),
          fontSize: 11,
          position: vertical ? 'bottom' : 'right',
          rotate: vertical ? 90 : 0,
          align: vertical ? 'left' : undefined,
          formatter: byName(report.nodes.map((n) => [n.id, vertical ? label(n) : `{name|${label(n)}}\n{value|${f.compact(n.value)}}`])),
          rich: { name: { color: money.ink(), fontSize: 11, lineHeight: 14 }, value: { color: money.muted(), fontSize: 10, fontFamily: palette.fontMono } },
          overflow: 'truncate',
          width: 140,
        },
      },
    ],
  };
}

const dayLabel = (f: Fmt, days: { date: string }[]) => (d: { date: string }) => (days.length <= 31 ? d.date.slice(8) : f.date(d.date, 'short'));
const zoomFor = (count: number) => (count > 60 ? [{ type: 'inside', zoomLock: false }] : []);

/** Balance at the end of each day (future days stay empty), with a zero line when it dips below it. */
export function dailyBalanceOption(f: Fmt, label: string, days: AccountDay[], own?: string): EChartsCoreOption {
  const color = money.net();
  const known = days.filter((d) => d.balance !== null);
  const plotted = (d: AccountDay) => (own ? d.balanceOriginal : d.balance);
  return {
    grid: { left: 8, right: 16, top: 16, bottom: days.length > 60 ? 28 : 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      formatter: byIndex(days.length, (i) => {
        const d = days[i];
        const now = plotted(d);
        if (now === null || d.balance === null) return '';
        const before = i > 0 ? plotted(days[i - 1]) : null;
        const prev = i > 0 ? days[i - 1].balance : null;
        return (
          tooltipTitle(f.date(d.date, 'full')) +
          tooltipRow(color, label, f.money(now, own), own ? f.money(d.balance) : undefined) +
          (before !== null && prev !== null
            ? tooltipRow(money.ink2(), 'Δ', f.money(now - before, own, { signed: true }), own ? f.money(d.balance - prev, undefined, { signed: true }) : undefined)
            : '')
        );
      }),
    },
    dataZoom: zoomFor(days.length),
    xAxis: { type: 'category', data: days.map(dayLabel(f, days)), boundaryGap: false },
    yAxis: { ...moneyAxis(f, own), scale: true },
    series: [
      {
        name: label,
        type: 'line',
        data: days.map(plotted),
        showSymbol: days.length <= 31,
        symbolSize: 8,
        itemStyle: { color, borderColor: money.surface(), borderWidth: 2 },
        lineStyle: { color, width: 2 },
        areaStyle: { color, opacity: 0.1 },
        markLine: known.some((d) => (plotted(d) ?? 0) < 0)
          ? { silent: true, symbol: 'none', lineStyle: { color: palette.chartAxis, type: 'solid' }, label: { show: false }, data: [{ yAxis: 0 }] }
          : undefined,
      },
    ],
  };
}

/** One series over fixed categories (weekdays): single hue, value labels, no legend. */
export function categoryBarsOption(f: Fmt, labels: string[], values: number[], color: string, name: string, own?: { currency: string; values: number[] }): EChartsCoreOption {
  const plotted = own?.values ?? values;
  return {
    grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(148,163,184,0.06)' } },
      formatter: byIndex(labels.length, (i) => tooltipRow(color, `${name} · ${labels[i]}`, f.money(plotted[i], own?.currency), own ? f.money(values[i]) : undefined)),
    },
    xAxis: { type: 'category', data: labels },
    yAxis: moneyAxis(f, own?.currency),
    series: [
      {
        name,
        type: 'bar',
        data: plotted,
        itemStyle: { color },
        label: { show: true, position: 'top', formatter: compactFmt(f, 'value', true, own?.currency), color: money.ink2(), fontSize: 11 },
      },
    ],
  };
}
