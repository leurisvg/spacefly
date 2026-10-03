import type { EChartsCoreOption } from 'echarts/core';
import type { SankeyReport } from '@shared';
import type { FormatService } from '../../core/format/format.service';
import { cssVar, esc, tooltipRow, tooltipTitle } from './chart-theme';
import { money } from './series-colors';

/**
 * Option builders shared by every screen. They follow the mark specs: bars <= 24px with
 * 4px rounded data-ends, 2px lines, >= 8px end markers with a surface ring, hairline grid,
 * a legend whenever there are >= 2 series, one value axis only, escaped tooltip labels.
 */

type Fmt = FormatService;

const GRID = { left: 8, right: 16, top: 40, bottom: 8, containLabel: true };
const legendTop = (names: string[]) => ({ top: 0, left: 0, data: names });

function moneyAxis(f: Fmt) {
  return {
    type: 'value' as const,
    axisLabel: { formatter: (v: number) => f.compact(v) },
    splitNumber: 4,
  };
}

/** Columns for income vs expenses per month plus a net line — all on the same currency axis. */
export function incomeExpenseOption(
  f: Fmt,
  t: (k: string) => string,
  rows: { month: string; income: number; expense: number; net?: number }[],
): EChartsCoreOption {
  const names = [t('common.income'), t('common.expenses'), ...(rows.some((r) => r.net !== undefined) ? [t('common.net')] : [])];
  return {
    grid: GRID,
    legend: legendTop(names),
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(148,163,184,0.06)' } },
      formatter: (params: { dataIndex: number }[]) => {
        const r = rows[params[0].dataIndex];
        return (
          tooltipTitle(f.date(r.month, 'month')) +
          tooltipRow(money.income(), names[0], f.money(r.income)) +
          tooltipRow(money.expense(), names[1], f.money(-r.expense)) +
          (r.net !== undefined ? tooltipRow(money.net(), names[2], f.money(r.net, undefined, { signed: true })) : '')
        );
      },
    },
    xAxis: { type: 'category', data: rows.map((r) => f.monthLabel(r.month)) },
    yAxis: moneyAxis(f),
    series: [
      { name: names[0], type: 'bar', data: rows.map((r) => r.income), itemStyle: { color: money.income() }, barGap: '8%' },
      { name: names[1], type: 'bar', data: rows.map((r) => r.expense), itemStyle: { color: money.expense() } },
      ...(names[2]
        ? [
            {
              name: names[2],
              type: 'line',
              data: rows.map((r) => r.net ?? 0),
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
  return {
    tooltip: {
      trigger: 'item',
      formatter: (p: { dataIndex: number; percent: number }) => {
        const s = slices[p.dataIndex];
        return tooltipRow(s.color, `${s.name} · ${f.share(p.percent, 1)}`, f.money(s.value));
      },
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
      formatter: (params: { dataIndex: number; seriesIndex: number }[]) =>
        tooltipTitle(f.date(months[params[0].dataIndex], 'month')) +
        params
          .map((p) => series[p.seriesIndex])
          .map((s, i) => tooltipRow(s.color, s.name, f.money(s.values[params[i].dataIndex])))
          .join('') +
        (opts.stack && series.length > 1
          ? tooltipRow(money.ink2(), 'Σ', f.money(series.reduce((sum, s) => sum + s.values[params[0].dataIndex], 0)))
          : ''),
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
      endLabel: series.length <= 4 && !opts.stack ? { show: true, formatter: () => f.compact(s.values.at(-1) ?? 0), color: money.ink2(), fontSize: 11 } : undefined,
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
      formatter: (p: { dataIndex: number }) => {
        const r = shown[p.dataIndex];
        return tooltipRow(r.delta > 0 === upIsBad ? bad : good, r.name, f.money(r.delta, undefined, { signed: true }));
      },
    },
    xAxis: { type: 'value', axisLabel: { formatter: (v: number) => f.compact(v) }, splitNumber: 4 },
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
            formatter: () => f.compact(r.delta),
            color: money.ink2(),
            fontSize: 11,
          },
        })),
      },
    ],
  };
}

/** Horizontal ranking bars (single series → one hue, no legend). */
export function rankingBarsOption(f: Fmt, rows: { name: string; value: number }[], color: string): EChartsCoreOption {
  const shown = rows.slice(0, 12).reverse();
  return {
    grid: { left: 8, right: 64, top: 4, bottom: 4, containLabel: true },
    tooltip: { trigger: 'item', formatter: (p: { dataIndex: number }) => tooltipRow(color, shown[p.dataIndex].name, f.money(shown[p.dataIndex].value)) },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', data: shown.map((r) => r.name), axisLabel: { width: 130, overflow: 'truncate', color: money.ink2() }, axisLine: { show: false } },
    series: [
      {
        type: 'bar',
        barMaxWidth: 16,
        data: shown.map((r) => r.value),
        itemStyle: { color, borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right', formatter: (p: { value: number }) => f.compact(p.value), color: money.ink2(), fontSize: 11 },
      },
    ],
  };
}

export function treemapOption(f: Fmt, items: Slice[]): EChartsCoreOption {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return {
    tooltip: {
      formatter: (p: { dataIndex: number; data: { name: string; value: number; color: string } }) =>
        tooltipRow(p.data.color, `${p.data.name} · ${f.share((p.data.value / total) * 100, 1)}`, f.money(p.data.value)),
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
          formatter: (p: { name: string; value: number }) => `${p.name}\n${f.compact(p.value)}`,
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
      formatter: (p: { name: string; value: number; color: string; treePathInfo: { name: string }[] }) =>
        tooltipRow(p.color, p.treePathInfo.slice(1).map((x) => x.name).join(' › '), f.money(p.value)),
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
  const lo = cssVar('--chart-grid');
  const hi = money.expense();
  return {
    tooltip: {
      formatter: (p: { data: [string, number] }) => tooltipTitle(f.date(p.data[0], 'full')) + tooltipRow(hi, t('common.expenses'), f.money(p.data[1])),
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
      formatter: (v: number) => f.compact(v),
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
      formatter: (p: { data: [number, number, number] }) =>
        tooltipTitle(`${shown[p.data[1]].name} · ${f.date(months[p.data[0]], 'month')}`) + tooltipRow(money.expense(), '', f.money(p.data[2])),
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
      inRange: { color: [cssVar('--chart-grid'), money.expense()] },
      textStyle: { color: money.muted(), fontSize: 11 },
      formatter: (v: number) => f.compact(v),
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
      formatter: (p: { dataType: string; data: { name?: string; source?: string; target?: string; value: number } }) => {
        if (p.dataType === 'edge') {
          const s = byId.get(p.data.source!)!;
          const t = byId.get(p.data.target!)!;
          return tooltipTitle(`${label(s)} → ${label(t)}`) + `<div style="font-family:var(--font-mono)">${esc(f.money(p.data.value))}${esc(pctOf(p.data.value))}</div>`;
        }
        const n = byId.get(p.data.name!)!;
        return tooltipRow(SANKEY_COLORS[n.kind](), label(n), `${f.money(n.value)}${pctOf(n.value)}`);
      },
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
          formatter: (p: { name: string; value: number }) => {
            const n = byId.get(p.name)!;
            return vertical ? label(n) : `{name|${label(n)}}\n{value|${f.compact(n.value)}}`;
          },
          rich: { name: { color: money.ink(), fontSize: 11, lineHeight: 14 }, value: { color: money.muted(), fontSize: 10, fontFamily: cssVar('--font-mono') } },
          overflow: 'truncate',
          width: 140,
        },
      },
    ],
  };
}
