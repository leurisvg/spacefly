import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EN, formatTestProviders, loadTranslations } from '../../../testing';
import { TxDetailService } from '../../state/tx-detail.service';
import { rankingViewModel, resolveKind, resolveView } from './ranking.vm';

describe('ranking routing', () => {
  it('lets the user switch the side unless the route pins it', () => {
    expect(resolveKind(false, 'expense', 'income')).toBe('income');
    expect(resolveKind(false, 'income', 'bogus')).toBe('income');
    expect(resolveKind(false, 'expense', null)).toBe('expense');
    expect(resolveKind(true, 'expense', 'income')).toBe('expense');
  });

  it('offers the budget sunburst only for expense categories', () => {
    expect(resolveView('sunburst', 'category', 'expense')).toBe('sunburst');
    expect(resolveView('sunburst', 'tag', 'expense')).toBe('bars');
    expect(resolveView('sunburst', 'category', 'income')).toBe('bars');
    expect(resolveView('treemap', 'tag', 'expense')).toBe('treemap');
    expect(resolveView(null, 'category', 'expense')).toBe('bars');
  });
});

describe('rankingViewModel', () => {
  const report = {
    data: {
      total: 150,
      months: ['2026-08', '2026-09'],
      items: [
        { id: '1', name: 'Food', value: 100, share: 2 / 3, count: 4, avg: 25, previous: 80 },
        { id: null, name: '', value: 50, share: 1 / 3, count: 1, avg: 50, previous: 0 },
      ],
      trend: [{ id: '1', name: 'Food', points: [{ month: '2026-08', value: 40 }, { month: '2026-09', value: 60 }] }],
    },
    meta: {},
  };

  async function setup() {
    TestBed.configureTestingModule({ providers: [...formatTestProviders('en', EN, { realStores: true }).providers, provideHttpClient(), provideHttpClientTesting()] });
    await loadTranslations('en');
    const http = TestBed.inject(HttpTestingController);
    const vm = TestBed.runInInjectionContext(() => rankingViewModel({ by: signal('category' as const), kind: signal('expense' as const), fixedKind: signal(false) }));
    TestBed.tick();
    http.expectOne((r) => r.url === '/api/reports/ranking' && r.params.get('by') === 'category' && r.params.get('kind') === 'expense').flush(report);
    await Promise.resolve();
    TestBed.tick();
    return { vm };
  }

  it('summarises the items and names the unnamed one', async () => {
    const { vm } = await setup();
    expect(vm.count()).toBe(5);
    expect(vm.avgTicket()).toBe(30);
    expect(vm.items().map((i) => vm.nameOf(i))).toEqual(['Food', 'Uncategorized']);
    expect(vm.table()?.rows.map((r) => r[0])).toEqual(['Food', 'Uncategorized']);
    expect(vm.trendOpts()).not.toBeNull();
  });

  it('opens the transactions of a row, or "none" for the unassigned one', async () => {
    const { vm } = await setup();
    const detail = TestBed.inject(TxDetailService);
    vm.open(vm.items()[0]);
    expect(detail.request()).toMatchObject({ title: 'Food', filter: { type: 'withdrawal', category: '1' } });
    vm.openId(null);
    expect(detail.request()).toMatchObject({ title: 'Uncategorized', filter: { category: 'none' } });
    vm.openBar(0);
    expect(detail.request()?.title).toBe('Uncategorized');
  });
});
