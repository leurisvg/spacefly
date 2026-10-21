import { presetPeriod } from '@spacefly/shared';
import { PERIOD_PRESET_OPTIONS, isPresetSelected, periodLabel } from './period-presets';

const deps = { date: (iso: string, style: string) => `${style}:${iso}`, translate: (k: string) => (k === 'period.quarterShort' ? 'Q' : 'YTD') };

describe('period presets', () => {
  it('labels each preset', () => {
    expect(periodLabel('month', { start: '2026-09-01', end: '2026-09-30' }, deps)).toBe('month:2026-09-01');
    expect(periodLabel('quarter', { start: '2026-07-01', end: '2026-09-30' }, deps)).toBe('Q3 2026');
    expect(periodLabel('year', { start: '2026-01-01', end: '2026-12-31' }, deps)).toBe('2026');
    expect(periodLabel('ytd', { start: '2026-01-01', end: '2026-10-20' }, deps)).toBe('YTD 2026');
    expect(periodLabel('custom', { start: '2026-09-03', end: '2026-09-09' }, deps)).toBe('short:2026-09-03 – long:2026-09-09');
  });

  it('recognises the option that produced the current period', () => {
    const thisMonth = PERIOD_PRESET_OPTIONS.find((o) => o.key === 'thisMonth')!;
    const lastMonth = PERIOD_PRESET_OPTIONS.find((o) => o.key === 'lastMonth')!;
    const current = presetPeriod('month', thisMonth.anchor());
    expect(isPresetSelected(thisMonth, 'month', current)).toBe(true);
    expect(isPresetSelected(thisMonth, 'year', current)).toBe(false);
    expect(isPresetSelected(lastMonth, 'month', current)).toBe(false);
  });
});
