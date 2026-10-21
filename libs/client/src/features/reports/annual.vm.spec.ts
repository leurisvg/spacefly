import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EN, formatTestProviders, loadTranslations } from '../../../testing';
import { TxDetailService } from '../../state/tx-detail.service';
import { annualViewModel, matrixCell } from './annual.vm';

describe('matrixCell', () => {
  it('walks the grid month by month inside each category', () => {
    expect(matrixCell(0, 12)).toEqual({ month: 0, category: 0 });
    expect(matrixCell(13, 12)).toEqual({ month: 1, category: 1 });
    expect(matrixCell(35, 12)).toEqual({ month: 11, category: 2 });
  });
});

describe('annualViewModel', () => {
  const months = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`);
  const report = {
    data: {
      year: 2026,
      months,
      categories: [
        { id: '1', name: 'Food', values: months.map(() => 10), total: 120 },
        { id: null, name: '', values: months.map(() => 5), total: 60 },
        { id: '3', name: 'Rent', values: months.map(() => 100), total: 1200 },
      ],
      income: months.map(() => 500),
      expense: months.map(() => 200),
      savingsRate: months.map((_, i) => (i === 0 ? null : 60)),
      best: { month: '2026-02', net: 300 },
      worst: { month: '2026-01', net: 300 },
      averages: { income: 500, expense: 200, net: 300 },
    },
    meta: {},
  };

  async function setup(matrixLimit?: number) {
    TestBed.configureTestingModule({ providers: [...formatTestProviders('en', EN, { realStores: true }).providers, provideHttpClient(), provideHttpClientTesting()] });
    await loadTranslations('en');
    const http = TestBed.inject(HttpTestingController);
    const vm = TestBed.runInInjectionContext(() => annualViewModel({ matrixLimit }));
    TestBed.tick();
    http.expectOne((r) => r.url === '/api/reports/annual' && r.params.get('year') !== null).flush(report);
    await Promise.resolve();
    TestBed.tick();
    return { vm };
  }

  it('limits the matrix to the first categories', async () => {
    const { vm } = await setup(2);
    expect(vm.matrixCount()).toBe(2);
    expect(vm.matrixTable()?.rows).toHaveLength(3);
  });

  it('opens a month and a matrix cell with the right range', async () => {
    const { vm } = await setup();
    const detail = TestBed.inject(TxDetailService);
    vm.openMonth(1);
    expect(detail.request()?.filter).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    vm.openCellAt(2 * 12 + 11);
    expect(detail.request()).toMatchObject({ title: 'Rent · December 2026', filter: { start: '2026-12-01', end: '2026-12-31', type: 'withdrawal', category: '3' } });
    vm.openCell(0, 1);
    expect(detail.request()?.filter).toMatchObject({ category: 'none' });
  });
});
