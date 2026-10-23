import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { createEnvironmentInjector, EnvironmentInjector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { AccountDay, AccountDetailReport, AccountTxRow, CounterpartiesReport, CounterpartyDetailReport, CounterpartyItem } from '@spacefly/shared';
import { EN, FakeBackNavigation, formatTestProviders, loadTranslations } from '../../../testing';
import { EntityEditor } from '../../state/entity-editor.service';
import { FiltersStore } from '../../state/filters.store';
import { TxDetailService } from '../../state/tx-detail.service';
import { pageSlice, PAGE_SIZE, totalPages } from '../../ui-logic/pagination';
import { accountCalendarMonths, accountCalendarScale, accountDetailViewModel, accountStats, counterpartyOf, isEditableAccountTx, resolveAccountTab, rowsForTab, tabCounts, txTone } from './account-detail.vm';
import { counterpartiesViewModel, counterpartyPath, shownCounterparties, topCounterparties } from './counterparties.vm';
import { assetOf, counterpartyCalendarMonths, counterpartyDetailViewModel, counterpartyStats, isEditableTx } from './counterparty-detail.vm';
import { HISTORY_MONTHS } from './history-months';
import { netWorthViewModel, stackedAccounts } from './net-worth.vm';
import { savingsTotals, savingsViewModel } from './savings.vm';

async function setup() {
  TestBed.configureTestingModule({ providers: [...formatTestProviders('en', EN, { realStores: true }).providers, provideHttpClient(), provideHttpClientTesting()] });
  await loadTranslations('en');
  return { http: TestBed.inject(HttpTestingController) };
}

const settle = async () => {
  await Promise.resolve();
  TestBed.tick();
};

describe('pagination', () => {
  it('counts pages and cuts them', () => {
    expect(PAGE_SIZE).toBe(50);
    expect(totalPages(0)).toBe(1);
    expect(totalPages(50)).toBe(1);
    expect(totalPages(51)).toBe(2);
    const rows = Array.from({ length: 120 }, (_, i) => i);
    expect(pageSlice(rows, 1)).toHaveLength(50);
    expect(pageSlice(rows, 3)).toEqual(rows.slice(100));
    expect(pageSlice(rows, 9)).toEqual([]);
  });

  it('offers the history lengths of the balance charts', () => {
    expect([...HISTORY_MONTHS]).toEqual([6, 12, 24, 36]);
  });
});

describe('net worth', () => {
  it('stacks only the accounts that were ever positive and never below zero', () => {
    const stacked = stackedAccounts({
      byAccount: [
        { id: 'a', name: 'Banco', balances: [10, -5, 20] },
        { id: 'b', name: 'Préstamo', balances: [-100, -90, -80] },
      ],
    });
    expect(stacked).toEqual([{ id: 'a', name: 'Banco', balances: [10, 0, 20] }]);
  });

  it('asks for 24 months by default, follows the picker and tables every account plus the total', async () => {
    const { http } = await setup();
    const vm = TestBed.runInInjectionContext(() => netWorthViewModel());
    TestBed.tick();
    http
      .expectOne((r) => r.url === '/api/reports/net-worth' && r.params.get('months') === '24')
      .flush({ data: { months: ['2026-08', '2026-09'], total: [100, 120], byAccount: [{ id: 'a', name: 'Banco', balances: [100, 120] }], current: 120, change: { abs: 20, pct: 0.2 } }, meta: {} });
    await settle();
    expect(vm.first()).toBe(100);
    expect(vm.table()?.rows.map((r) => r[0])).toEqual(['Banco', 'Total']);
    expect(vm.totalOpts()).not.toBeNull();
    expect(vm.stackOpts()).not.toBeNull();
    vm.setMonths(36);
    TestBed.tick();
    expect(vm.months()).toBe('36');
    http.expectOne((r) => r.url === '/api/reports/net-worth' && r.params.get('months') === '36');
  });
});

describe('savings', () => {
  it('sums every account month by month', () => {
    expect(
      savingsTotals({
        months: ['m1', 'm2'],
        accounts: [
          { id: 'a', name: 'A', currency: 'DOP', balances: [1, 2] },
          { id: 'b', name: 'B', currency: 'DOP', balances: [10, 20] },
        ],
      }),
    ).toEqual([11, 22]);
  });

  it('asks for 12 months by default and reads the first and last total', async () => {
    const { http } = await setup();
    const vm = TestBed.runInInjectionContext(() => savingsViewModel());
    TestBed.tick();
    http
      .expectOne((r) => r.url === '/api/reports/savings' && r.params.get('months') === '12')
      .flush({ data: { months: ['m1', 'm2'], accounts: [{ id: 'a', name: 'A', currency: 'DOP', balances: [5, 8] }] }, meta: {} });
    await settle();
    expect([vm.first(), vm.total()]).toEqual([5, 8]);
    vm.setMonths(6);
    TestBed.tick();
    expect(vm.months()).toBe('6');
  });
});

describe('counterparties', () => {
  const item = (id: string, value: number, previous = 0, count = 1): CounterpartyItem => ({ id, name: `N${id}`, active: true, value, previous, count, avg: value, share: 0.1, lastDate: null });

  it('shows what moved money in this or the previous period unless asked for everything', () => {
    const items = [item('1', 10), item('2', 0, 5), item('3', 0)];
    expect(shownCounterparties(items, false).map((i) => i.id)).toEqual(['1', '2']);
    expect(shownCounterparties(items, true).map((i) => i.id)).toEqual(['1', '2', '3']);
  });

  it('ranks the accounts of the period, at most twelve', () => {
    const many = Array.from({ length: 20 }, (_, i) => item(String(i), 100 - i));
    expect(topCounterparties(many)).toHaveLength(12);
    expect(topCounterparties([item('1', 0), item('2', 5)]).map((i) => i.id)).toEqual(['2']);
  });

  it('puts the detail of an account under its own kind', () => {
    expect(counterpartyPath('expense', '7')).toEqual(['/accounts', 'expense', '7']);
    expect(counterpartyPath('income', '7')).toEqual(['/accounts', 'revenue', '7']);
  });

  const report: CounterpartiesReport = {
    kind: 'expense',
    items: [item('1', 100, 80, 4), item('2', 40, 0, 1), item('3', 0, 0, 0)],
    total: 140,
    previousTotal: 80,
    count: 5,
    months: ['2026-08', '2026-09'],
    monthly: [60, 80],
  };

  it('summarises the report and opens a bar, the editor to create or edit', async () => {
    const { http } = await setup();
    const kind = signal<'expense' | 'income'>('expense');
    const vm = TestBed.runInInjectionContext(() => counterpartiesViewModel({ kind }));
    TestBed.tick();
    http.expectOne((r) => r.url === '/api/reports/counterparties' && r.params.get('kind') === 'expense').flush({ data: report, meta: {} });
    await settle();
    expect(vm.active()).toBe(2);
    expect(vm.avgTicket()).toBe(28);
    expect(vm.shown().map((i) => i.id)).toEqual(['1', '2']);
    expect(vm.rankTable()?.rows.map((r) => r[0])).toEqual(['N1', 'N2']);
    // the bars are drawn bottom-up
    expect(vm.itemAtBar(0)?.id).toBe('2');
    expect(vm.itemAtBar(1)?.id).toBe('1');
    expect(vm.itemAtBar(5)).toBeUndefined();
    const editor = TestBed.inject(EntityEditor);
    vm.create();
    expect(editor.request()).toMatchObject({ kind: 'account', id: null, accountType: 'expense' });
    vm.edit('9');
    expect(editor.request()).toMatchObject({ kind: 'account', id: '9' });
    kind.set('income');
    TestBed.tick();
    vm.create();
    expect(editor.request()?.accountType).toBe('revenue');
    http.expectOne((r) => r.url === '/api/reports/counterparties' && r.params.get('kind') === 'income');
  });
});

describe('counterparty detail', () => {
  const tx = (over: Partial<CounterpartyDetailReport['rows'][number]> = {}) =>
    ({ id: '1', groupId: '1', type: 'withdrawal', splitCount: 1, amount: 50, description: 'x', source: { id: 'a', name: 'Banco', kind: 'asset' }, destination: { id: 'e', name: 'Colmado', kind: 'expense' }, ...over }) as CounterpartyDetailReport['rows'][number];

  it('totals a year, averages the months and finds the biggest record', () => {
    const s = counterpartyStats({ months: [{ month: 'a', value: 10, count: 1 }, { month: 'b', value: 30, count: 2 }], rows: [tx({ amount: 5 }), tx({ id: '2', amount: 70, description: 'big' })] });
    expect(s.total12).toBe(40);
    expect(s.monthlyAverage).toBe(20);
    expect(s.biggest?.description).toBe('big');
    expect(counterpartyStats({ months: [], rows: [] })).toEqual({ total12: 0, monthlyAverage: 0, biggest: null });
  });

  it('draws what was paid as the expense of the day and what was received as income', () => {
    const days = [
      { date: '2026-08-31', value: 5, count: 1 },
      { date: '2026-09-01', value: 7, count: 2 },
    ];
    const paid = counterpartyCalendarMonths(days, 'expense');
    expect(paid.map((m) => m.month)).toEqual(['2026-08', '2026-09']);
    expect(paid[1].days[0]).toMatchObject({ expense: 7, income: 0, count: 2, balance: null });
    expect(counterpartyCalendarMonths(days, 'income')[0].days[0]).toMatchObject({ expense: 0, income: 5 });
  });

  it('names the asset account on the other side and edits only single-part expenses and income', () => {
    expect(assetOf(tx(), 'expense')).toBe('Banco');
    expect(assetOf(tx(), 'income')).toBe('Colmado');
    expect(isEditableTx({ splitCount: 1, type: 'deposit' })).toBe(true);
    expect(isEditableTx({ splitCount: 1, type: 'transfer' })).toBe(false);
    expect(isEditableTx({ splitCount: 2, type: 'withdrawal' })).toBe(false);
  });

  it('loads the account of its kind, pages its records and opens a day', async () => {
    const { http } = await setup();
    const kind = signal<'expense' | 'income'>('income');
    const id = signal('7');
    const vm = TestBed.runInInjectionContext(() => counterpartyDetailViewModel({ kind, id }));
    TestBed.tick();
    const rows = Array.from({ length: 120 }, (_, i) => tx({ id: String(i), groupId: String(i) }));
    http
      .expectOne((r) => r.url === '/api/reports/counterparties/7' && r.params.get('kind') === 'income')
      .flush({
        data: {
          kind: 'income',
          account: { id: '7', name: 'Empresa SRL', type: 'revenue', active: false, iban: 'DO00', notes: null },
          totals: { value: 100, previous: 80, count: 120, avg: 1, share: 0.4 },
          days: [{ date: '2026-09-01', value: 100, count: 1 }],
          months: [{ month: '2026-09', value: 100, count: 1 }],
          byWeekday: [0, 0, 0, 0, 0, 0, 0],
          topCategories: [],
          topAccounts: [],
          rows,
        },
        meta: {},
      });
    await settle();
    expect(vm.share()).toBe(40);
    expect(vm.sign()).toBe(1);
    expect(vm.subtitle()).toBe('DO00 · Excluded');
    expect(vm.totalPages()).toBe(3);
    expect(vm.pageRows()).toHaveLength(50);
    vm.page.set(3);
    expect(vm.pageRows()).toHaveLength(20);
    vm.openDay('2026-09-01');
    expect(TestBed.inject(TxDetailService).request()).toMatchObject({ filter: { start: '2026-09-01', end: '2026-09-01', counterparty: '7' } });
    vm.goBack();
    expect(TestBed.inject(FakeBackNavigation).fallbacks).toEqual(['/accounts/revenue']);
    expect(vm.calendarGridClass()).toBe('max-w-2xl');
  });
});

describe('account detail', () => {
  const row = (over: Partial<AccountTxRow> = {}) =>
    ({ id: '1', groupId: '1', type: 'withdrawal', splitCount: 1, amount: 50, flow: -50, flowOriginal: -50, balance: 100, balanceOriginal: 100, rate: 1, originalAmount: 50, originalCurrency: 'DOP', source: { id: 'a', name: 'Banco', kind: 'asset' }, destination: { id: 'e', name: 'Colmado', kind: 'expense' }, ...over }) as AccountTxRow;
  const day = (date: string, over: Partial<AccountDay> = {}): AccountDay => ({
    date,
    income: 0,
    expense: 0,
    transferIn: 0,
    transferOut: 0,
    count: 0,
    balance: 100,
    balanceOriginal: 10,
    incomeOriginal: 0,
    expenseOriginal: 0,
    transferInOriginal: 0,
    transferOutOriginal: 0,
    ...over,
  });

  it('reads the tab, counts the records of each and filters them', () => {
    expect(resolveAccountTab('deposit')).toBe('deposit');
    expect(resolveAccountTab('bogus')).toBe('all');
    expect(resolveAccountTab(null)).toBe('all');
    const rows = [row(), row({ type: 'deposit' }), row({ type: 'transfer' }), row({ type: 'withdrawal' })];
    expect(tabCounts(rows)).toEqual({ all: 4, withdrawal: 2, deposit: 1, transfer: 1 });
    expect(rowsForTab(rows, 'withdrawal')).toHaveLength(2);
    expect(rowsForTab(rows, 'all')).toHaveLength(4);
  });

  it('finds the lowest and highest balance, the daily average and the biggest records', () => {
    const s = accountStats({
      days: [day('2026-09-01', { balance: 50, balanceOriginal: 5 }), day('2026-09-02', { balance: 200, balanceOriginal: 20 }), day('2026-09-03', { balance: null, balanceOriginal: null })],
      rows: [row({ amount: 10, flowOriginal: -1 }), row({ amount: 90, flowOriginal: -9, description: 'big' }), row({ type: 'deposit', amount: 30, flowOriginal: 3 })],
      totals: { income: 30, expense: 100, transferIn: 0, transferOut: 0, count: 3 },
      totalsOriginal: { income: 3, expense: 10, transferIn: 0, transferOut: 0 },
    });
    expect(s.lowest).toEqual({ date: '2026-09-01', balance: 50, balanceOriginal: 5 });
    expect(s.highest).toEqual({ date: '2026-09-02', balance: 200, balanceOriginal: 20 });
    expect(s.avgDailyExpense).toBe(50);
    expect(s.avgDailyExpenseOriginal).toBe(5);
    expect(s.biggestExpense).toMatchObject({ description: 'big', amountOriginal: 9 });
    expect(s.biggestIncome).toMatchObject({ amountOriginal: 3 });
  });

  it('draws a foreign account in its own currency, month by month on one scale', () => {
    const days = [day('2026-08-31', { income: 600, incomeOriginal: 10, expense: 60, expenseOriginal: 1, count: 2 }), day('2026-09-01', { expense: 300, expenseOriginal: 5, count: 1 })];
    expect(accountCalendarMonths(days, false)[0].days[0]).toMatchObject({ income: 600, expense: 60, balance: 100 });
    expect(accountCalendarMonths(days, true)[0].days[0]).toMatchObject({ income: 10, expense: 1, balance: 10 });
    expect(accountCalendarMonths(days, true).map((m) => m.month)).toEqual(['2026-08', '2026-09']);
    expect(accountCalendarScale(days, false)).toBe(600);
    expect(accountCalendarScale(days, true)).toBe(10);
    expect(accountCalendarScale([], false)).toBe(1);
  });

  it('names the other side of a record, its tone and whether it can be edited', () => {
    expect(counterpartyOf(row({ flow: -50 }))).toBe('Colmado');
    expect(counterpartyOf(row({ flow: 50 }))).toBe('Banco');
    expect([txTone({ type: 'withdrawal' }), txTone({ type: 'deposit' }), txTone({ type: 'transfer' })]).toEqual(['expense', 'income', 'none']);
    expect(isEditableAccountTx({ splitCount: 1, type: 'transfer' })).toBe(true);
    expect(isEditableAccountTx({ splitCount: 1, type: 'reconciliation' })).toBe(false);
    expect(isEditableAccountTx({ splitCount: 3, type: 'withdrawal' })).toBe(false);
  });

  const detail: AccountDetailReport = {
    account: { id: '7', name: 'Cuenta USD', role: 'savingAsset', type: 'asset', currency: 'USD', iban: 'US00', includeNetWorth: true, excluded: false },
    balanceOriginal: 100,
    opening: 5000,
    openingOriginal: 80,
    closing: 6000,
    change: { abs: 1000, pct: 0.2 },
    changeOriginal: 20,
    totals: { income: 600, expense: 60, transferIn: 0, transferOut: 0, count: 2 },
    totalsOriginal: { income: 10, expense: 1, transferIn: 0, transferOut: 0 },
    days: [{ date: '2026-09-01', income: 600, expense: 60, transferIn: 0, transferOut: 0, count: 2, balance: 6000, balanceOriginal: 100, incomeOriginal: 10, expenseOriginal: 1, transferInOriginal: 0, transferOutOriginal: 0 }],
    months: [{ month: '2026-09', income: 600, expense: 60, balance: 6000, incomeOriginal: 10, expenseOriginal: 1, balanceOriginal: 100 }],
    byWeekday: [0, 60, 0, 0, 0, 0, 0],
    byWeekdayOriginal: [0, 1, 0, 0, 0, 0, 0],
    topCategories: [{ id: null, name: '', value: 60, count: 1, valueOriginal: 1 }],
    topMerchants: [],
    topIncomeSources: [],
    rows: [row({ type: 'deposit', flow: 600, flowOriginal: 10 }), row()],
  };

  it('opens on the last 30 days, asks for its account and shows a foreign account in its own currency', async () => {
    const { http } = await setup();
    const filters = TestBed.inject(FiltersStore);
    const id = signal('7');
    const vm = TestBed.runInInjectionContext(() => accountDetailViewModel({ id }));
    TestBed.tick();
    expect(filters.preset()).toBe('last30');
    http.expectOne((r) => r.url === '/api/reports/accounts/7').flush({ data: detail, meta: {} });
    await settle();
    expect(vm.foreign()).toBe(true);
    expect(vm.own()).toBe('USD');
    expect(vm.subtitle()).toBe('Savings · USD · US00');
    expect(vm.approx(6000)).toBe('≈ RD$6,000.00');
    expect(vm.balanceOf({ balance: 6000, balanceOriginal: 100 })).toBe(100);
    expect(vm.counts()).toEqual({ all: 2, withdrawal: 1, deposit: 1, transfer: 0 });
    expect(vm.balanceTable()?.rows[0]).toEqual(['Tue, Sep 1', 'US$100.00 (≈ RD$6,000.00)']);
    expect(vm.rankTable(detail.topCategories).rows[0]).toEqual(['Uncategorized', '1', 'US$1.00 (≈ RD$60.00)']);
    expect(vm.original(vm.rows()[1])).toBeNull();
  });

  it('switches the tab, opens a day with the account as filter and goes back to the accounts', async () => {
    const { http } = await setup();
    const vm = TestBed.runInInjectionContext(() => accountDetailViewModel({ id: signal('7') }));
    TestBed.tick();
    http.expectOne((r) => r.url === '/api/reports/accounts/7').flush({ data: detail, meta: {} });
    await settle();
    vm.setTab('deposit');
    TestBed.tick();
    expect(vm.tab()).toBe('deposit');
    expect(vm.rows()).toHaveLength(1);
    expect(vm.rowsTotal()).toBe(600);
    vm.openDay('2026-09-01');
    expect(TestBed.inject(TxDetailService).request()).toMatchObject({ filter: { start: '2026-09-01', end: '2026-09-01', account: '7' } });
    vm.goBack();
    expect(TestBed.inject(FakeBackNavigation).fallbacks).toEqual(['/accounts']);
  });

  it('gives the period back when it goes away', async () => {
    await setup();
    const filters = TestBed.inject(FiltersStore);
    const before = filters.preset();
    const child = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
    runInInjectionContext(child, () => accountDetailViewModel({ id: signal('7') }));
    TestBed.tick();
    expect(filters.preset()).toBe('last30');
    child.destroy();
    TestBed.tick();
    expect(filters.preset()).toBe(before);
    expect(before).not.toBe('last30');
  });
});
