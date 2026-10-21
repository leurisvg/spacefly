import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { BudgetDetail } from '@spacefly/shared';
import { EN, formatTestProviders, loadTranslations } from '../../../testing';
import { FiltersStore } from '../../state/filters.store';
import { TxDetailService } from '../../state/tx-detail.service';
import { budgetsViewModel, selectBudget } from './budgets.vm';

const budget = (id: string, over: Partial<BudgetDetail> = {}): BudgetDetail => ({
  id,
  name: `B${id}`,
  limit: 100,
  spent: 40,
  remaining: 60,
  pct: 0.4,
  autoBudget: { type: null, period: null, amount: null },
  projected: null,
  categories: [{ id: '9', name: 'Food', value: 40 }],
  history: [{ month: '2026-08', limit: 100, spent: 40 }],
  ...over,
});

describe('selectBudget', () => {
  it('prefers the chosen budget and falls back to the first', () => {
    const list = [budget('1'), budget('2')];
    expect(selectBudget(list, '2')?.id).toBe('2');
    expect(selectBudget(list, 'zz')?.id).toBe('1');
    expect(selectBudget(list, null)?.id).toBe('1');
    expect(selectBudget([], '1')).toBeNull();
  });
});

describe('budgetsViewModel', () => {
  async function setup() {
    TestBed.configureTestingModule({ providers: [...formatTestProviders('en', EN, { realStores: true }).providers, provideHttpClient(), provideHttpClientTesting()] });
    await loadTranslations('en');
    const http = TestBed.inject(HttpTestingController);
    const vm = TestBed.runInInjectionContext(() => budgetsViewModel());
    TestBed.tick();
    http
      .expectOne((r) => r.url === '/api/reports/budgets')
      .flush({ data: { available: null, budgets: [budget('1'), budget('2', { limit: 200, spent: 150 })], unbudgeted: 5, elapsedRatio: 0.5 }, meta: {} });
    await Promise.resolve();
    TestBed.tick();
    return { vm };
  }

  it('totals limits and spending and selects the first budget', async () => {
    const { vm } = await setup();
    expect(vm.totals()).toEqual({ limit: 300, spent: 190 });
    expect(vm.selected()?.id).toBe('1');
    expect(vm.historyOpts()).not.toBeNull();
    expect(vm.categoryTable()?.rows).toEqual([['Food', expect.any(String)]]);
  });

  it('selects through the filters and opens a category of the budget', async () => {
    const { vm } = await setup();
    expect(vm.selected()?.id).toBe('1');
    vm.select('2');
    expect(TestBed.inject(FiltersStore).param('budget')()).toBe('2');
    vm.openCategory(0);
    expect(TestBed.inject(TxDetailService).request()).toMatchObject({ title: 'B2 · Food', filter: { type: 'withdrawal', budget: '2', category: '9' } });
  });
});
