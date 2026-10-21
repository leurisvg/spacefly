import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EN, formatTestProviders, loadTranslations } from '../../../testing';
import { TxDetailService } from '../../state/tx-detail.service';
import { compareViewModel, isImprovement, resolvePeriodB } from './compare.vm';

describe('compare shaping', () => {
  const a = { start: '2026-09-01', end: '2026-09-30' };

  it('derives period B from the mode', () => {
    expect(resolvePeriodB('previous', a, null, null)).toEqual({ start: '2026-08-01', end: '2026-08-31' });
    expect(resolvePeriodB('yoy', a, null, null)).toEqual({ start: '2025-09-01', end: '2025-09-30' });
    expect(resolvePeriodB('custom', a, '2026-01-01', '2026-01-31')).toEqual({ start: '2026-01-01', end: '2026-01-31' });
    expect(resolvePeriodB('custom', a, '2026-01-01', null)).toEqual({ start: '2026-08-01', end: '2026-08-31' });
  });

  it('calls spending less or earning more an improvement', () => {
    expect(isImprovement(-10, 'expense')).toBe(true);
    expect(isImprovement(10, 'expense')).toBe(false);
    expect(isImprovement(10, 'income')).toBe(true);
    expect(isImprovement(0, 'income')).toBe(false);
  });
});

describe('compareViewModel', () => {
  const report = {
    data: {
      a: { start: '2026-09-01', end: '2026-09-30', income: 100, expense: 60 },
      b: { start: '2026-08-01', end: '2026-08-31', income: 90, expense: 80 },
      rows: [
        { id: '1', name: 'Food', a: 40, b: 50, delta: -10, pct: -0.2 },
        { id: null, name: '', a: 20, b: 30, delta: -10, pct: -0.33 },
        { id: '3', name: 'Gone', a: 0, b: 0, delta: 0, pct: null },
      ],
      trend: [{ month: '2026-08', income: 90, expense: 80 }],
    },
    meta: {},
  };

  async function setup() {
    TestBed.configureTestingModule({ providers: [...formatTestProviders('en', EN, { realStores: true }).providers, provideHttpClient(), provideHttpClientTesting()] });
    await loadTranslations('en');
    const http = TestBed.inject(HttpTestingController);
    const vm = TestBed.runInInjectionContext(() => compareViewModel());
    TestBed.tick();
    const req = http.expectOne((r) => r.url === '/api/reports/compare');
    req.flush(report);
    await Promise.resolve();
    TestBed.tick();
    return { vm, req };
  }

  it('compares with the previous period by category by default and hides empty rows', async () => {
    const { vm, req } = await setup();
    expect([req.request.params.get('groupBy'), req.request.params.get('kind')]).toEqual(['category', 'expense']);
    expect(vm.mode()).toBe('previous');
    expect(vm.rows().map((r) => vm.name(r))).toEqual(['Food', 'Uncategorized']);
  });

  it('opens a row from the table (direct) and from the chart (reversed)', async () => {
    const { vm } = await setup();
    const detail = TestBed.inject(TxDetailService);
    vm.openRow(0, true);
    expect(detail.request()).toMatchObject({ title: 'Food', filter: { type: 'withdrawal', category: '1' } });
    vm.openRow(0);
    expect(detail.request()).toMatchObject({ title: 'Uncategorized', filter: { category: 'none' } });
  });

  it('keeps the other end of a custom period B when one is typed, and ignores a bad date', async () => {
    const { vm } = await setup();
    vm.setMode('custom');
    const fallbackEnd = vm.b().end;
    vm.setB('bStart', 'nope');
    expect(vm.mode()).toBe('custom');
    vm.setB('bStart', '2026-01-05');
    expect(vm.b().start).toBe('2026-01-05');
    expect(vm.b().end).toBe(fallbackEnd);
  });
});
