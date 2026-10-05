import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { TxRow } from '@spacefly/shared';
import { formatTestProviders } from '@spacefly/client/testing';
import { TransactionList } from './transaction-list';

const T = { tx: { none: 'No transactions' }, common: { uncategorized: 'Uncategorized' }, txType: {} };

const row = (over: Partial<TxRow>): TxRow =>
  ({
    id: '1',
    groupId: '1',
    splitCount: 1,
    date: '2026-09-17',
    type: 'withdrawal',
    description: 'Pedido Amazon',
    amount: 3050,
    originalAmount: 50,
    originalCurrency: 'USD',
    foreignAmount: null,
    foreignCurrency: null,
    rate: 61,
    category: null,
    budget: null,
    bill: null,
    tags: [],
    source: { id: '1', name: 'Cuenta USD' },
    destination: { id: '2', name: 'Amazon' },
    notes: null,
    ...over,
  }) as TxRow;

function render(rows: TxRow[]) {
  localStorage.clear();
  TestBed.configureTestingModule({
    providers: [...formatTestProviders('en', T).providers, provideRouter([])],
  });
  const fixture = TestBed.createComponent(TransactionList);
  fixture.componentRef.setInput('rows', rows);
  fixture.detectChanges();
  return (fixture.nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ');
}

describe('TransactionList', () => {
  it('shows a foreign-currency transaction in its own currency', () => {
    const text = render([row({})]);
    expect(text).toContain('−US$50.00');
    expect(text).not.toContain('3,050');
  });

  it('shows one already in the display currency as it is', () => {
    expect(render([row({ rate: 1, originalAmount: 3050, originalCurrency: 'DOP' })])).toContain('−RD$3,050.00');
  });
});
