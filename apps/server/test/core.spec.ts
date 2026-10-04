import { describe, expect, it } from 'vitest';
import {
  addMonths,
  endOfMonth,
  monthsInRange,
  presetPeriod,
  previousPeriod,
  samePeriodLastYear,
  shiftPeriod,
  weekdayMon0,
} from '@spacefly/shared';
import { Sealer } from '../src/auth/crypto';
import { CurrencyService } from '../src/core/currency.service';
import { applyFilter } from '../src/core/ledger';
import { ctxFor, fx, SEP, sepSplits } from './helpers';

describe('dates', () => {
  it('handles month arithmetic with clamping', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2026-03-15', -3)).toBe('2025-12-15');
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28');
  });

  it('computes previous and year-ago periods', () => {
    expect(previousPeriod(SEP)).toEqual({ start: '2026-08-01', end: '2026-08-31' });
    expect(previousPeriod({ start: '2026-07-01', end: '2026-09-30' })).toEqual({ start: '2026-04-01', end: '2026-06-30' });
    expect(previousPeriod({ start: '2026-09-10', end: '2026-09-19' })).toEqual({ start: '2026-08-31', end: '2026-09-09' });
    expect(samePeriodLastYear(SEP)).toEqual({ start: '2025-09-01', end: '2025-09-30' });
  });

  it('builds and shifts presets', () => {
    expect(presetPeriod('quarter', '2026-08-15')).toEqual({ start: '2026-07-01', end: '2026-09-30' });
    expect(presetPeriod('ytd', '2026-08-15')).toEqual({ start: '2026-01-01', end: '2026-08-15' });
    expect(shiftPeriod('month', SEP, 1)).toEqual({ start: '2026-10-01', end: '2026-10-31' });
    expect(shiftPeriod('year', presetPeriod('year', '2026-01-01'), -1)).toEqual({ start: '2025-01-01', end: '2025-12-31' });
    expect(monthsInRange('2025-11-15', '2026-02-01')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });

  it('uses Monday-first weekdays like Python calendar.monthrange', () => {
    expect(weekdayMon0('2026-09-01')).toBe(1); // Tuesday
    expect(weekdayMon0('2026-06-01')).toBe(0); // Monday
  });
});

describe('Sealer (AES-GCM)', () => {
  it('round-trips and rejects tampering or other keys', () => {
    const a = new Sealer('x'.repeat(32));
    const sealed = a.seal('secret-token');
    expect(sealed).not.toContain('secret-token');
    expect(a.open(sealed)).toBe('secret-token');
    expect(new Sealer('y'.repeat(32)).open(sealed)).toBeNull();
    const tampered = sealed.slice(0, -2) + (sealed.endsWith('A') ? 'BB' : 'AA');
    expect(a.open(tampered)).toBeNull();
  });
});

describe('CurrencyService', () => {
  it('uses the latest Firefly rate on or before the date', () => {
    const s = fx();
    expect(s.toPrimary('USD', '2026-08-15')).toMatchObject({ rate: 60, source: 'firefly' });
    expect(s.toPrimary('USD', '2026-09-01')).toMatchObject({ rate: 61, source: 'firefly' });
    expect(s.toPrimary('USD', '2026-12-31')).toMatchObject({ rate: 61 });
    expect(s.toPrimary('DOP', '2026-09-01')).toMatchObject({ rate: 1, source: 'identity' });
  });

  it('accepts rates stored in either direction', () => {
    const s = new CurrencyService('DOP', [{ from_currency_code: 'DOP', to_currency_code: 'EUR', rate: '0.015', date: '2026-01-01' }], null);
    expect(s.toPrimary('EUR', '2026-02-01').rate).toBeCloseTo(1 / 0.015, 6);
  });

  it('falls back to the provider when Firefly has no applicable rate', () => {
    const s = new CurrencyService('DOP', [], { day: '2026-10-02', rates: { USD: 62.5 } });
    expect(s.toPrimary('USD', '2026-09-10')).toMatchObject({ rate: 62.5, source: 'fallback' });
    expect(s.toPrimary('EUR', '2026-09-10')).toMatchObject({ rate: 1, source: 'missing' });
  });

  it('converts DOP→USD by dividing by the USD→DOP rate of the date', () => {
    const s = fx();
    expect(s.convert(6100, 'DOP', 'USD', '2026-09-10').value).toBeCloseTo(100, 6);
    expect(s.convert(6000, 'DOP', 'USD', '2026-08-10').value).toBeCloseTo(100, 6);
    expect(s.convert(100, 'USD', 'DOP', '2026-08-10').value).toBeCloseTo(6000, 6);
  });
});

describe('ledger normalisation and display values', () => {
  it('normalises Firefly splits', () => {
    const splits = sepSplits();
    expect(splits).toHaveLength(9);
    const netflix = splits.find((s) => s.description === 'Netflix')!;
    expect(netflix).toMatchObject({ amount: 975.39, currency: 'DOP', foreignAmount: 15.99, foreignCurrency: 'USD', date: '2026-09-12' });
  });

  it('prefers exact amounts: original, then foreign, then pc_amount, then rate', () => {
    const splits = sepSplits();
    const dop = ctxFor(SEP, 'DOP');
    const usd = ctxFor(SEP, 'USD');
    const freelance = splits.find((s) => s.description === 'Proyecto freelance')!;
    const netflix = splits.find((s) => s.description === 'Netflix')!;
    const salary = splits.find((s) => s.description === 'Nómina septiembre')!;
    expect(dop.value(freelance)).toBe(30500); // pc_amount from Firefly
    expect(usd.value(freelance)).toBe(500); // original USD
    expect(usd.value(netflix)).toBe(15.99); // foreign USD amount
    expect(usd.value(salary)).toBeCloseTo(120000 / 61, 6); // DOP / rate of the date
  });

  it('builds TxRows with the rate used', () => {
    const usd = ctxFor(SEP, 'USD');
    const row = usd.row(sepSplits().find((s) => s.description === 'Compra quincenal')!);
    expect(row.originalCurrency).toBe('DOP');
    expect(row.rate).toBeCloseTo(1 / 61, 8);
    expect(row.amount).toBeCloseTo(139.34, 2);
  });

  it('filters drill-downs, including "none"', () => {
    const splits = sepSplits();
    expect(applyFilter(splits, { category: 'none', type: 'withdrawal' }).map((s) => s.description)).toEqual(['Almuerzo']);
    expect(applyFilter(splits, { budget: '1' })).toHaveLength(2);
    expect(applyFilter(splits, { tag: 'suscripcion' })).toHaveLength(1);
    expect(applyFilter(splits, { account: '3' })).toHaveLength(3);
    expect(applyFilter(splits, { counterparty: '23' })).toHaveLength(2);
    expect(applyFilter(splits, { q: 'luz' })).toHaveLength(1);
  });

  it('filters by several categories at once (the "others" slice), including uncategorized', () => {
    const splits = sepSplits().filter((s) => s.type === 'withdrawal');
    const ids = [...new Set(splits.map((s) => s.categoryId))].filter((id): id is string => id !== null);
    expect(ids.length).toBeGreaterThan(1);
    const two = applyFilter(splits, { categories: ids.slice(0, 2).join(',') });
    expect(two.length).toBeGreaterThan(0);
    expect(two.every((s) => ids.slice(0, 2).includes(s.categoryId!))).toBe(true);
    // `none` selects splits without a category, mixed with real ids
    const mixed = applyFilter(splits, { categories: `none,${ids[0]}` });
    expect(mixed.every((s) => s.categoryId === null || s.categoryId === ids[0])).toBe(true);
    expect(mixed.some((s) => s.categoryId === null)).toBe(true);
    // ignored when empty
    expect(applyFilter(splits, { categories: '' })).toHaveLength(splits.length);
  });
});
