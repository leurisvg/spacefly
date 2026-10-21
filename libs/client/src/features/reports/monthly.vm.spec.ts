import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EN, formatTestProviders, loadTranslations } from '../../../testing';
import { TxDetailService } from '../../state/tx-detail.service';
import { categoryChange, monthlyViewModel, relativeWidth } from './monthly.vm';

describe('monthly shaping', () => {
  it('compares a category with the previous period', () => {
    expect(categoryChange({ total: { value: -150 }, previous: -100 })).toEqual({ isNew: false, delta: -50, ratio: 0.5, up: false });
    expect(categoryChange({ total: { value: 30 }, previous: 20 })).toMatchObject({ delta: 10, ratio: 0.5, up: true });
    expect(categoryChange({ total: { value: -40 }, previous: 0 })).toEqual({ isNew: true, delta: -40, ratio: 0, up: false });
  });

  it('scales the category bars to the largest one', () => {
    expect(relativeWidth(-50, 200)).toBe(25);
    expect(relativeWidth(200, 200)).toBe(100);
  });
});

describe('monthlyViewModel', () => {
  const amount = (value: number) => ({ value, parts: [] });
  const report = {
    data: {
      kpis: { earned: 100, spent: 60, net: 40, savingsRate: 0.4 },
      categories: [
        { id: '1', name: 'Food', total: amount(-60), spent: 60, earned: 0, previous: -40 },
        { id: null, name: '', total: amount(-20), spent: 20, earned: 0, previous: 0 },
      ],
      zeroCategories: [],
      previousPeriod: { start: '2026-07-01', end: '2026-07-31' },
      budgets: [],
      zeroBudgets: { names: [], limit: 0 },
      topExpenses: [],
      assets: [],
      savings: { months: [], accounts: [] },
      overview: {},
    },
    meta: {},
  };

  async function setup(opts: { sankey?: boolean; calendar?: boolean } = {}) {
    TestBed.configureTestingModule({ providers: [...formatTestProviders('en', EN, { realStores: true }).providers, provideHttpClient(), provideHttpClientTesting()] });
    await loadTranslations('en');
    const http = TestBed.inject(HttpTestingController);
    const vm = TestBed.runInInjectionContext(() => monthlyViewModel(opts));
    TestBed.tick();
    http.expectOne((r) => r.url === '/api/reports/monthly').flush(report);
    await Promise.resolve();
    TestBed.tick();
    return { vm, http };
  }

  it('only fetches the flow and calendar reports when asked to', async () => {
    const lean = await setup();
    lean.http.expectNone((r) => r.url === '/api/reports/sankey' || r.url === '/api/reports/calendar');
    TestBed.resetTestingModule();
    const full = await setup({ sankey: true, calendar: true });
    full.http.expectOne((r) => r.url === '/api/reports/sankey');
    full.http.expectOne((r) => r.url === '/api/reports/calendar');
  });

  it('opens a category (or the unassigned bucket) and toggles an account row', async () => {
    const { vm } = await setup();
    const detail = TestBed.inject(TxDetailService);
    const [food, none] = vm.d()!.categories;
    expect(vm.relative(food)).toBe(100);
    expect(vm.relative(none)).toBeCloseTo(33.33, 1);
    vm.openCategory(food);
    expect(detail.request()).toMatchObject({ title: 'Food', filter: { category: '1' } });
    vm.openCategory(none);
    expect(detail.request()).toMatchObject({ title: 'Uncategorized', filter: { category: 'none' } });
    vm.toggleAsset('a');
    expect(vm.expanded().has('a')).toBe(true);
    vm.toggleAsset('a');
    expect(vm.expanded().has('a')).toBe(false);
  });
});
