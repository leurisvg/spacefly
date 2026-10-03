import { TestBed } from '@angular/core/testing';
import { formatTestProviders } from '../../../testing/format-providers';
import { FormatService } from './format.service';

function setup(lang = 'es') {
  const t = formatTestProviders(lang);
  TestBed.configureTestingModule({ providers: t.providers });
  return { f: TestBed.inject(FormatService), ...t };
}

describe('FormatService', () => {
  it('formats money with currency symbol and minus sign', () => {
    const { f } = setup();
    expect(f.money(1234.5)).toBe('RD$1,234.50');
    expect(f.money(-1234.5)).toBe('−RD$1,234.50');
    expect(f.money(12, 'USD', { signed: true })).toBe('+US$12.00');
    expect(f.money(-7, 'USD', { abs: true })).toBe('US$7.00');
    expect(f.money(1234.5, undefined, { decimals: 0 })).toBe('RD$1,235');
  });

  it('shows a dash for missing values', () => {
    const { f } = setup();
    expect(f.money(null)).toBe('—');
    expect(f.money(Number.NaN)).toBe('—');
    expect(f.compact(undefined)).toBe('—');
    expect(f.pct(null)).toBe('—');
    expect(f.pct(Infinity)).toBe('—');
    expect(f.date(null)).toBe('—');
  });

  it('uses the active currency from the filters when none is given', () => {
    const { f, currency } = setup();
    currency.set('USD');
    expect(f.money(5)).toBe('US$5.00');
  });

  it('falls back to the currency code for unknown currencies', () => {
    const { f } = setup();
    expect(f.symbol('CHF')).toBe('CHF');
    expect(f.symbol('EUR')).toBe('€');
  });

  it('formats compact amounts', () => {
    const { f } = setup('en');
    expect(f.compact(12900)).toBe('RD$12.9K');
    expect(f.compact(-1_500_000, 'USD')).toBe('−US$1.5M');
    expect(f.compact(950, false)).toBe('950');
  });

  it('formats percentages with a true minus sign', () => {
    const { f } = setup('en');
    expect(f.pct(0.1234)).toBe('12.3%');
    expect(f.pct(-0.05, 0)).toBe('−5%');
    expect(f.pct(0.05, 1, true)).toBe('+5.0%');
    expect(f.pct(0, 1, true)).toBe('0.0%');
  });

  it('formats dates in UTC without day drift', () => {
    const { f } = setup('en');
    expect(f.date('2026-09-01', 'short')).toBe('Sep 1');
    expect(f.date('2026-09-30T23:59:59-04:00', 'long')).toBe('September 30, 2026');
    expect(f.date('2026-09', 'month')).toBe('September 2026');
  });

  it('switches locale when the language changes', () => {
    const { f, lang$ } = setup('es');
    expect(f.locale()).toBe('es-DO');
    expect(f.date('2026-09-01', 'month')).toMatch(/septiembre/i);
    lang$.next('en');
    expect(f.locale()).toBe('en-US');
    expect(f.date('2026-09-01', 'month')).toBe('September 2026');
  });

  it('builds month labels and weekday names', () => {
    const { f } = setup('en');
    expect(f.monthLabel('2026-09')).toBe('Sep 26');
    expect(f.monthLabel('2026-09', false)).toBe('Sep');
    const days = f.weekdayNames();
    expect(days).toHaveLength(7);
    expect(days[0]).toBe('M');
  });
});
