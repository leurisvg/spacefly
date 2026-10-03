import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Period, PeriodPreset } from '@shared';
import { formatTestProviders } from '../../../testing/format-providers';
import { FiltersStore } from '../../core/state/filters.store';
import { PeriodPicker } from './period-picker';

const T = { period: { previous: 'Previous period', next: 'Next period', quarterShort: 'Q', ytdShort: 'YTD' } };

function setup(preset: PeriodPreset, period: Period) {
  const filters = { preset: signal(preset), period: signal(period), shift: vi.fn(), setPreset: vi.fn(), setCustom: vi.fn() };
  const t = formatTestProviders('en', T);
  TestBed.configureTestingModule({ providers: [...t.providers, { provide: FiltersStore, useValue: filters }] });
  const fixture = TestBed.createComponent(PeriodPicker);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, filters, el, label: () => el.querySelector('button span.truncate')!.textContent!.trim() };
}

describe('PeriodPicker', () => {
  it('labels a month, quarter, year, ytd and custom range', () => {
    expect(setup('month', { start: '2026-09-01', end: '2026-09-30' }).label()).toBe('September 2026');
    TestBed.resetTestingModule();
    expect(setup('quarter', { start: '2026-04-01', end: '2026-06-30' }).label()).toBe('Q2 2026');
    TestBed.resetTestingModule();
    expect(setup('year', { start: '2026-01-01', end: '2026-12-31' }).label()).toBe('2026');
    TestBed.resetTestingModule();
    expect(setup('ytd', { start: '2026-01-01', end: '2026-09-15' }).label()).toBe('YTD 2026');
    TestBed.resetTestingModule();
    expect(setup('custom', { start: '2026-01-10', end: '2026-02-20' }).label()).toBe('Jan 10 – February 20, 2026');
  });

  it('moves the period with the labelled arrow buttons', () => {
    const { el, filters } = setup('month', { start: '2026-09-01', end: '2026-09-30' });
    el.querySelector<HTMLButtonElement>('button[aria-label="Previous period"]')!.click();
    el.querySelector<HTMLButtonElement>('button[aria-label="Next period"]')!.click();
    expect(filters.shift.mock.calls).toEqual([[-1], [1]]);
  });

  it('only applies a valid custom range', () => {
    const { fixture, filters } = setup('month', { start: '2026-09-01', end: '2026-09-30' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cmp = fixture.componentInstance as any;
    cmp.customStart = '2026-05-10';
    cmp.customEnd = '2026-05-01';
    cmp.applyCustom();
    expect(filters.setCustom).not.toHaveBeenCalled();
    cmp.customEnd = '2026-05-20';
    cmp.applyCustom();
    expect(filters.setCustom).toHaveBeenCalledWith({ start: '2026-05-10', end: '2026-05-20' });
  });

  it('seeds the custom inputs with the current period when opened', () => {
    const { fixture } = setup('month', { start: '2026-09-01', end: '2026-09-30' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cmp = fixture.componentInstance as any;
    cmp.openPicker();
    expect([cmp.customStart, cmp.customEnd]).toEqual(['2026-09-01', '2026-09-30']);
  });
});
