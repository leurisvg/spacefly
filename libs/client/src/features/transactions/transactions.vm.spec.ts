import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { TxRow } from '@spacefly/shared';
import { FakeConfirm, RecordingToast } from '../../../testing/fakes';
import { EN, formatTestProviders, loadTranslations } from '../../../testing';
import { I18n } from '../../i18n/i18n';
import { MetaStore } from '../../state/meta.store';
import { buildTransactionsCsv, defaultSortDir, explorerViewModel, isEditable, signedAmount, sortTransactions } from './explorer.vm';
import { groupTransactions } from './tx-detail.vm';

const ref = (id: string, name: string) => ({ id, name });
const tx = (over: Partial<TxRow>): TxRow => ({
  id: '1',
  groupId: '1',
  splitCount: 1,
  date: '2026-09-10',
  type: 'withdrawal',
  description: 'Supermercado',
  amount: 100,
  originalAmount: 100,
  originalCurrency: 'DOP',
  foreignAmount: null,
  foreignCurrency: null,
  rate: 1,
  category: ref('c1', 'Comida'),
  budget: null,
  bill: null,
  tags: [],
  source: { id: 'a1', name: 'Banco', type: 'asset' },
  destination: { id: 'a2', name: 'Colmado', type: 'expense' },
  notes: null,
  ...over,
});

describe('explorer shaping', () => {
  const rows = [
    tx({ id: '1', date: '2026-09-01', description: 'b', amount: 50, category: ref('c2', 'Zeta') }),
    tx({ id: '2', date: '2026-09-03', description: 'a', amount: 300, type: 'deposit', category: null }),
    tx({ id: '3', date: '2026-09-03', description: 'c', amount: 10, category: ref('c1', 'Alfa') }),
  ];

  it('signs expenses negative', () => {
    expect(rows.map(signedAmount)).toEqual([-50, 300, -10]);
  });

  it('sorts by each column and breaks date ties by id', () => {
    const ids = (key: Parameters<typeof sortTransactions>[1], dir: 1 | -1) => sortTransactions(rows, key, dir).map((r) => r.id);
    expect(ids('date', -1)).toEqual(['3', '2', '1']);
    expect(ids('date', 1)).toEqual(['1', '2', '3']);
    expect(ids('amount', -1)).toEqual(['2', '3', '1']);
    expect(ids('description', 1)).toEqual(['2', '1', '3']);
    expect(ids('category', 1)).toEqual(['2', '3', '1']);
    expect(rows.map((r) => r.id)).toEqual(['1', '2', '3']); // the input is not mutated
  });

  it('starts dates and amounts newest/largest first, text A→Z', () => {
    expect(['date', 'amount', 'description', 'category'].map((k) => defaultSortDir(k as never))).toEqual([-1, -1, 1, 1]);
  });

  it('exports a CSV with BOM, signed display amounts and the original currency, quoting what needs it', () => {
    const csv = buildTransactionsCsv([tx({ description: 'Pan, "fresco"', tags: ['a', 'b'], originalAmount: 2, originalCurrency: 'USD', rate: 58.5, amount: 117 })], 'DOP');
    const [header, line] = csv.slice(1).split('\n');
    expect(csv.startsWith('﻿')).toBe(true);
    expect(header).toBe('date,type,description,category,budget,tags,source,destination,amount_DOP,original_amount,original_currency,rate');
    expect(line).toBe('2026-09-10,withdrawal,"Pan, ""fresco""",Comida,,a|b,Banco,Colmado,-117.00,2.00,USD,58.500000');
  });

  it('edits only single-part expenses, income and transfers', () => {
    expect(isEditable({ splitCount: 1, type: 'withdrawal' })).toBe(true);
    expect(isEditable({ splitCount: 2, type: 'withdrawal' })).toBe(false);
    expect(isEditable({ splitCount: 1, type: 'opening balance' as never })).toBe(false);
  });

  it('groups a detail list by type and category, largest total first', () => {
    const groups = groupTransactions([...rows, tx({ id: '4', amount: 500, category: ref('c1', 'Alfa') })]);
    expect(groups.map((g) => [g.type, g.category, g.total])).toEqual([
      ['withdrawal', 'Alfa', -510],
      ['deposit', null, 300],
      ['withdrawal', 'Zeta', -50],
    ]);
  });
});

describe('explorerViewModel', () => {
  async function setup() {
    TestBed.configureTestingModule({
      providers: [...formatTestProviders('en', EN, { realStores: true }).providers, provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.overrideProvider(MetaStore, { useValue: { lookups: () => undefined, fireflyUrl: (p: string) => `https://ff.test${p}`, currencies: () => [], primary: () => 'DOP' } });
    await loadTranslations('en');
    const vm = TestBed.runInInjectionContext(() => explorerViewModel());
    return { vm, http: TestBed.inject(HttpTestingController), toast: TestBed.inject(RecordingToast), confirm: TestBed.inject(FakeConfirm), i18n: TestBed.inject(I18n) };
  }

  const report = (rows: TxRow[]) => ({ data: { rows, totals: { income: 0, expense: 0 } }, meta: {} });

  it('lists the period sorted and paginated, filtering through query params', async () => {
    const { vm, http } = await setup();
    TestBed.tick();
    http.expectOne((r) => r.url === '/api/transactions' && !r.params.has('type')).flush(report([tx({ id: '1', date: '2026-09-01' }), tx({ id: '2', date: '2026-09-02' })]));
    await Promise.resolve();
    TestBed.tick();
    expect(vm.pageRows().map((r) => r.id)).toEqual(['2', '1']);
    vm.sortBy('date'); // toggles the direction of the current column
    expect(vm.pageRows().map((r) => r.id)).toEqual(['1', '2']);
    vm.type.set('deposit');
    TestBed.tick();
    http.expectOne((r) => r.url === '/api/transactions' && r.params.get('type') === 'deposit');
    expect(vm.page()).toBe(1);
  });

  it('uses Firefly search once the box is submitted with the syntax toggle on', async () => {
    const { vm, http } = await setup();
    vm.useFirefly.set(true);
    vm.draft.set('  groceries ');
    vm.submitSearch();
    TestBed.tick();
    expect(vm.searching()).toBe(true);
    http.expectOne((r) => r.url === '/api/search' && r.params.get('query') === 'groceries');
    vm.clearSearch();
    expect(vm.draft()).toBe('');
    expect(vm.searching()).toBe(false);
  });

  it('asks before deleting and only deletes on yes', async () => {
    const { vm, http, toast, confirm, i18n } = await setup();
    TestBed.tick();
    http.match(() => true);
    confirm.answer = false;
    await vm.remove(tx({ groupId: '9' }));
    http.expectNone('/api/transactions/9');
    expect(confirm.asked[0]).toMatchObject({ destructive: true });

    confirm.answer = true;
    const done = vm.remove(tx({ groupId: '9' }));
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne({ method: 'DELETE', url: '/api/transactions/9' }).flush(null);
    await done;
    expect(toast.messages).toEqual([{ kind: 'success', message: i18n.t('editor.tx.deleted') }]);
  });

  it('builds no CSV in privacy mode', async () => {
    const { vm } = await setup();
    expect(vm.csv()).not.toBeNull();
    vm.privacy.set(true);
    expect(vm.csv()).toBeNull();
  });
});
