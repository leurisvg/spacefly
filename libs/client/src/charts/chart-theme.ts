import { palette } from './palette';

export const seriesPalette = (): string[] => [...palette.series];

/** Escapes untrusted labels (Firefly names) before they go into tooltip HTML. */
export function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Tooltip row: short line key in the series color, value first (Strong), label after. `note` is a smaller secondary figure (a conversion). */
export function tooltipRow(color: string, label: string, value: string, note?: string): string {
  return `<div style="display:flex;align-items:center;gap:8px;line-height:1.6">
    <span style="display:inline-block;width:10px;height:2px;border-radius:1px;background:${color}"></span>
    <strong style="font-family:${palette.fontMono};font-weight:600;color:${palette.chartInk}">${esc(value)}</strong>${
      note ? `<span style="font-family:${palette.fontMono};font-size:10px;color:${palette.chartMuted}">${esc(note)}</span>` : ''
    }
    <span style="color:${palette.chartInk2}">${esc(label)}</span></div>`;
}

export function tooltipTitle(title: string): string {
  return `<div style="font-weight:600;margin-bottom:4px;color:${palette.chartInk}">${esc(title)}</div>`;
}

/** ECharts theme from the design tokens: recessive hairline grid/axes, thin marks, text in ink tokens. */
export function buildTheme() {
  const ink = palette.chartInk;
  const ink2 = palette.chartInk2;
  const muted = palette.chartMuted;
  const grid = palette.chartGrid;
  const axis = palette.chartAxis;
  const surface = palette.chartSurface;
  const font = palette.fontSans;
  const axisCommon = {
    axisLine: { show: true, lineStyle: { color: axis, width: 1 } },
    axisTick: { show: false },
    axisLabel: { color: muted, fontSize: 11, fontFamily: font },
    splitLine: { show: true, lineStyle: { color: grid, width: 1, type: 'solid' } },
    splitArea: { show: false },
  };
  return {
    color: seriesPalette(),
    backgroundColor: 'transparent',
    textStyle: { fontFamily: font, color: ink2 },
    title: { textStyle: { color: ink, fontWeight: 600, fontSize: 13 }, subtextStyle: { color: muted } },
    legend: { textStyle: { color: ink2, fontSize: 12 }, icon: 'roundRect', itemWidth: 12, itemHeight: 3, itemGap: 16 },
    tooltip: {
      backgroundColor: '#0f172a',
      borderColor: axis,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: ink, fontSize: 12, fontFamily: font },
      extraCssText: 'border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.45);',
      axisPointer: { lineStyle: { color: axis, width: 1 }, crossStyle: { color: axis } },
    },
    categoryAxis: { ...axisCommon, splitLine: { show: false } },
    valueAxis: { ...axisCommon, axisLine: { show: false } },
    timeAxis: axisCommon,
    line: { lineStyle: { width: 2, cap: 'round', join: 'round' }, symbolSize: 8, symbol: 'circle', smooth: false },
    bar: { barMaxWidth: 24, itemStyle: { borderRadius: [4, 4, 0, 0] } },
    pie: { itemStyle: { borderColor: surface, borderWidth: 2 } },
    sankey: { itemStyle: { borderWidth: 0 }, lineStyle: { opacity: 0.35 } },
    treemap: { itemStyle: { borderColor: surface, borderWidth: 2, gapWidth: 2 } },
    sunburst: { itemStyle: { borderColor: surface, borderWidth: 2 } },
    calendar: {
      itemStyle: { color: surface, borderColor: palette.background, borderWidth: 2 },
      splitLine: { show: false },
      dayLabel: { color: muted },
      monthLabel: { color: ink2 },
      yearLabel: { show: false },
    },
  };
}
