import { addMonths, presetPeriod, todayIso, type Period, type PeriodPreset } from '@spacefly/shared';

export interface PresetOption {
  /** Key under `period.presets` in the catalog. */
  key: string;
  preset: Exclude<PeriodPreset, 'custom'>;
  anchor: () => string;
}

/** The presets the period pickers offer, in display order. */
export const PERIOD_PRESET_OPTIONS: readonly PresetOption[] = [
  { key: 'thisMonth', preset: 'month', anchor: () => todayIso() },
  { key: 'lastMonth', preset: 'month', anchor: () => addMonths(todayIso(), -1) },
  { key: 'last30', preset: 'last30', anchor: () => todayIso() },
  { key: 'last6m', preset: 'last6m', anchor: () => todayIso() },
  { key: 'thisQuarter', preset: 'quarter', anchor: () => todayIso() },
  { key: 'thisYear', preset: 'year', anchor: () => todayIso() },
  { key: 'lastYear', preset: 'year', anchor: () => addMonths(todayIso(), -12) },
  { key: 'ytd', preset: 'ytd', anchor: () => todayIso() },
];

/** Whether `current` (with its preset) is exactly what choosing `option` would produce. */
export function isPresetSelected(option: PresetOption, preset: PeriodPreset, current: Period): boolean {
  const p = presetPeriod(option.preset, option.anchor());
  return preset === option.preset && p.start === current.start && p.end === current.end;
}

interface LabelDeps {
  date(iso: string, style: 'month' | 'short' | 'long'): string;
  translate(key: string): string;
}

/** The text a period picker shows for the active period: "September 2026", "Q3 2026", "2026", "YTD 2026" or a range. */
export function periodLabel(preset: PeriodPreset, p: Period, deps: LabelDeps): string {
  switch (preset) {
    case 'month':
      return deps.date(p.start, 'month');
    case 'quarter':
      return `${deps.translate('period.quarterShort')}${Math.floor((Number(p.start.slice(5, 7)) - 1) / 3) + 1} ${p.start.slice(0, 4)}`;
    case 'year':
      return p.start.slice(0, 4);
    case 'ytd':
      return `${deps.translate('period.ytdShort')} ${p.start.slice(0, 4)}`;
    default:
      return `${deps.date(p.start, 'short')} – ${deps.date(p.end, 'long')}`;
  }
}
