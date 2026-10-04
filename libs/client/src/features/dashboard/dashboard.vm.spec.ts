import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EN, formatTestProviders, loadTranslations } from '../../../testing';
import { I18n } from '../../i18n/i18n';
import { SeriesColors } from '../../charts/series-colors';
import { TxDetailService } from '../../state/tx-detail.service';
import { categorySlices, dashboardViewModel, monthRange } from './dashboard.vm';

describe('dashboard shaping', () => {
  it('finds a month’s first and last day, leap years included', () => {
    expect(monthRange('2026-09')).toEqual({ start: '2026-09-01', end: '2026-09-30' });
    expect(monthRange('2024-02')).toEqual({ start: '2024-02-01', end: '2024-02-29' });
    expect(monthRange('2026-12')).toEqual({ start: '2026-12-01', end: '2026-12-31' });
  });

  it('colors each category by identity and grays out "others"', () => {
    const colors = { color: (_kind: string, id: string | null) => `color-${id}` };
    const i18n = { name: (name: string | null | undefined, id: string | null | undefined) => (id === '__others__' ? 'Others' : name || 'Uncategorized') };
    const slices = categorySlices(
      [
        { id: '1', name: 'Food', value: 10, children: [] },
        { id: null, name: '', value: 5, children: [] },
        { id: '__others__', name: '', value: 2, children: [] },
      ] as never,
      i18n,
      colors,
    );
    expect(slices.map((s) => [s.name, s.value, s.color])).toEqual([
      ['Food', 10, 'color-1'],
      ['Uncategorized', 5, 'color-null'],
      ['Others', 2, '#475569'],
    ]);
  });
});

describe('dashboardViewModel', () => {
  const report = {
    data: {
      kpis: {},
      months: [{ month: '2026-08', income: 100, expense: 40, net: 60 }],
      topCategories: [
        { id: '1', name: 'Food', value: 30, children: [] },
        { id: '__others__', name: '', value: 10, children: [{ id: '7', name: 'Pets', value: 4 }] },
      ],
      netWorth: [{ month: '2026-08', value: 1000 }],
      calendar: [],
      budgets: [],
      upcomingBills: [],
      largest: [],
    },
    meta: {},
  };

  async function setup() {
    TestBed.configureTestingModule({ providers: [...formatTestProviders('en', EN, { realStores: true }).providers, provideHttpClient(), provideHttpClientTesting()] });
    await loadTranslations('en');
    const vm = TestBed.runInInjectionContext(() => dashboardViewModel());
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne((r) => r.url === '/api/reports/dashboard').flush(report);
    await Promise.resolve();
    TestBed.tick();
    return { vm, detail: TestBed.inject(TxDetailService), i18n: TestBed.inject(I18n), colors: TestBed.inject(SeriesColors) };
  }

  it('turns the report into chart options, tables and slices', async () => {
    const { vm } = await setup();
    expect(vm.incomeOptions()).not.toBeNull();
    expect(vm.monthsTable()?.rows).toEqual([['August 2026', 'RD$100.00', 'RD$40.00', 'RD$60.00']]);
    expect(vm.slices().map((s) => s.name)).toEqual(['Food', 'Others']);
    expect(vm.donut()).not.toBeNull();
    expect(vm.catTable()?.columns).toHaveLength(2);
    expect(vm.nwOptions()).not.toBeNull();
  });

  it('opens the detail sheet for a month, a category, the folded others and a day', async () => {
    const { vm, detail } = await setup();
    vm.openMonth(0);
    expect(detail.request()).toMatchObject({ filter: { start: '2026-08-01', end: '2026-08-31' } });
    vm.openCategory(0);
    expect(detail.request()).toMatchObject({ title: 'Food', filter: { type: 'withdrawal', category: '1' } });
    vm.openCategory(1);
    expect(detail.request()?.breakdown).toEqual([{ id: '7', name: 'Pets', value: 4 }]);
    vm.openDay('2026-09-03');
    expect(detail.request()?.filter).toEqual({ start: '2026-09-03', end: '2026-09-03' });
  });
});
