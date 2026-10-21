import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EN, formatTestProviders, loadTranslations } from '../../../testing';
import { TxDetailService } from '../../state/tx-detail.service';
import { flowViewModel, legendKinds, nodeLabel } from './flow.vm';

describe('flow shaping', () => {
  it('prefers the i18n key of a synthetic node', () => {
    const t = (k: string) => `t:${k}`;
    expect(nodeLabel({ label: 'Hub', labelKey: 'sankey.hub' }, t)).toBe('t:sankey.hub');
    expect(nodeLabel({ label: 'Food' }, t)).toBe('Food');
  });

  it('lists the node kinds present in legend order', () => {
    expect(legendKinds([{ kind: 'category' }, { kind: 'revenue' }, { kind: 'category' }, { kind: 'savings' }])).toEqual(['revenue', 'category', 'savings']);
  });
});

describe('flowViewModel', () => {
  const report = {
    data: {
      nodes: [
        { id: 'rev', label: 'Salary', kind: 'revenue', value: 100 },
        { id: 'hub', label: 'Income', labelKey: 'sankey.hub', kind: 'hub', value: 100 },
        { id: 'cat', label: 'Food', kind: 'category', value: 60, filter: { category: '1' } },
      ],
      links: [
        { source: 'rev', target: 'hub', value: 100 },
        { source: 'hub', target: 'cat', value: 60 },
      ],
      totalIncome: 100,
      totalExpense: 60,
      savings: 40,
      savingsLabel: 'savings',
    },
    meta: {},
  };

  async function setup() {
    TestBed.configureTestingModule({ providers: [...formatTestProviders('en', EN, { realStores: true }).providers, provideHttpClient(), provideHttpClientTesting()] });
    await loadTranslations('en');
    const http = TestBed.inject(HttpTestingController);
    const vm = TestBed.runInInjectionContext(() => flowViewModel());
    TestBed.tick();
    const req = http.expectOne((r) => r.url === '/api/reports/sankey');
    req.flush(report);
    await Promise.resolve();
    TestBed.tick();
    return { vm, req };
  }

  it('asks for the budget view with everything shown by default', async () => {
    const { vm, req } = await setup();
    expect(req.request.params.get('mode')).toBe('budget');
    expect(req.request.params.get('budgets')).toBe('1');
    expect(req.request.params.get('threshold')).toBeNull();
    expect([vm.mode(), vm.budgets(), vm.incomeCategories(), vm.threshold()]).toEqual(['budget', true, true, 0]);
  });

  it('reads its options from the filters', async () => {
    const { vm } = await setup();
    vm.set('mode', 'tags');
    vm.set('budgets', '0');
    vm.set('threshold', '0.05');
    expect([vm.mode(), vm.budgets(), vm.threshold()]).toEqual(['tags', false, 0.05]);
  });

  it('tables the links and opens the transactions of a node with a filter', async () => {
    const { vm } = await setup();
    const rows = vm.table()!.rows;
    expect(rows).toHaveLength(2);
    expect([rows[0][0], rows[1][1]]).toEqual(['Salary', 'Food']);
    const detail = TestBed.inject(TxDetailService);
    vm.openNodeById('rev');
    expect(detail.request()).toBeNull();
    vm.openNodeById('cat');
    expect(detail.request()).toMatchObject({ title: 'Food', filter: { category: '1' } });
  });
});
