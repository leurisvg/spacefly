import { findNav, isEditorRoute } from './nav';

describe('findNav', () => {
  it('finds a sidebar screen without a parent', () => {
    const hit = findNav('/accounts?p=month');
    expect(hit?.section.key).toBe('accounts');
    expect(hit?.item.key).toBe('assetAccounts');
    expect(hit?.parent).toBeNull();
    expect(hit?.named).toBe(false);
  });

  it('hangs an account detail from Asset accounts, and a counterparty from its own list', () => {
    expect(findNav('/accounts/12')).toMatchObject({ parent: { key: 'assetAccounts', path: '/accounts' }, item: { key: 'accountDetail' }, named: true });
    expect(findNav('/accounts/expense/7')?.parent?.key).toBe('expenseAccounts');
    expect(findNav('/accounts/revenue/7')?.parent?.key).toBe('revenueAccounts');
  });

  it('does not mistake a sidebar screen under /accounts for a detail', () => {
    expect(findNav('/accounts/net-worth')?.item.key).toBe('netWorth');
    expect(findNav('/accounts/savings')?.parent).toBeNull();
  });

  it('hangs the transaction editor from the Explorer; only editing carries a record name', () => {
    expect(findNav('/transactions/new')).toMatchObject({ parent: { key: 'explorer' }, item: { key: 'newTransaction' }, named: false });
    expect(findNav('/transactions/55/edit')).toMatchObject({ parent: { key: 'explorer' }, item: { key: 'editTransaction' }, named: true });
  });

  it('knows nothing about unknown paths', () => {
    expect(findNav('/nope')).toBeNull();
  });
});

describe('isEditorRoute', () => {
  it('hides the period picker on the transaction editor but not on account details', () => {
    expect(isEditorRoute('/transactions/new')).toBe(true);
    expect(isEditorRoute('/transactions/5/edit?x=1')).toBe(true);
    expect(isEditorRoute('/accounts/5')).toBe(false);
  });
});
