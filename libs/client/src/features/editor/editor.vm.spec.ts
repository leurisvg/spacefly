import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { AccountInput, EditorAccount, TxEditPayload } from '@spacefly/shared';
import { EDITOR_LOOKUPS, EN, FakeBackNavigation, formatTestProviders, loadTranslations, RecordingToast } from '../../../testing';
import { accountPickerViewModel, comboValueOf, isCreated, slotFits } from './account-picker.vm';
import { blankTxModel, buildTxRequest, transactionFormViewModel, txModelFromPayload, withDefaults, type TxModel, type TxQueryValues } from './transaction-form.vm';

describe('account picker shaping', () => {
  it('reads a value as the control sees it', () => {
    expect(comboValueOf(null)).toBe('');
    expect(comboValueOf({ id: '7' })).toBe('7');
    expect(comboValueOf({ name: 'Nuevo' })).toBe('Nuevo');
    expect([null, { id: '7' }, { name: 'x' }].map((v) => isCreated(v as AccountInput | null))).toEqual([false, false, true]);
  });

  it('allows only the combinations that make a transaction', () => {
    expect(slotFits('source', null, 'asset')).toBe(true);
    expect(slotFits('destination', 'revenue', 'expense')).toBe(false); // income account → expense account is not a thing
    expect(slotFits('destination', 'asset', 'expense')).toBe(true);
    expect(slotFits('source', 'expense', 'revenue')).toBe(false);
    expect(slotFits('source', 'asset', 'new')).toBe(true);
  });
});

describe('accountPickerViewModel', () => {
  async function setup(side: 'source' | 'destination', other: Parameters<typeof slotFits>[1], accounts: EditorAccount[] = EDITOR_LOOKUPS.accounts) {
    TestBed.configureTestingModule({ providers: formatTestProviders('en', EN).providers });
    await loadTranslations('en');
    const value = signal<AccountInput | null>(null);
    const vm = TestBed.runInInjectionContext(() => accountPickerViewModel({ value, accounts: signal(accounts), side: signal(side), other: signal(other) }));
    return { vm, value };
  }

  it('lists the kinds that make sense for a source, with balances, and marks incompatible ones', async () => {
    const { vm } = await setup('source', 'expense');
    const byLabel = Object.fromEntries(vm.options().map((o) => [o.label, o]));
    expect(vm.options().map((o) => o.label)).toEqual(['Banco Popular', 'Cuenta USD', 'Préstamo', 'Empresa SRL']); // asset, liability, revenue (no expense accounts as a source)
    expect(byLabel['Banco Popular']).toMatchObject({ hint: 'RD$1,500.00', invalid: false });
    expect(byLabel['Empresa SRL'].invalid).toBe(true); // revenue → expense
    expect(byLabel['Préstamo'].hintTone).toBe('negative');
  });

  it('shows the destination side without balances', async () => {
    const { vm } = await setup('destination', null);
    expect(vm.options().map((o) => o.label)).toEqual(['Banco Popular', 'Cuenta USD', 'Préstamo', 'Supermercado']);
    expect(vm.options()[0].hint).toBe('DOP');
    expect(vm.createLabel()('Colmado')).toContain('Colmado');
  });

  it('turns a selection back into a value', async () => {
    const { vm, value } = await setup('source', null);
    vm.select({ value: '1' });
    expect(value()).toEqual({ id: '1' });
    expect(vm.selectedBalance()).toEqual({ text: 'RD$1,500.00', negative: false });
    vm.select({ value: 'Nuevo', created: true });
    expect(value()).toEqual({ name: 'Nuevo' });
    expect(vm.comboCreated()).toBe(true);
    vm.select({ value: '' });
    expect(value()).toBeNull();
  });
});

describe('transaction form shaping', () => {
  const payload: TxEditPayload = {
    groupId: '5',
    journalId: '5',
    type: 'withdrawal',
    currency: 'DOP',
    description: 'Cena',
    date: '2026-09-02',
    time: '20:15',
    source: { id: '1', name: 'Banco Popular', kind: 'asset' },
    destination: { id: '20', name: 'Supermercado', kind: 'expense' },
    amount: '120.50',
    foreignAmount: '2.00',
    foreignCurrency: 'USD',
    category: 'Comida',
    budgetId: '1',
    billId: null,
    tags: ['hogar'],
    notes: null,
  };

  it('turns a stored transaction into a form model and back into the same request', () => {
    const model = txModelFromPayload(payload);
    expect(model).toMatchObject({ description: 'Cena', otherCurrency: true, foreignCurrency: 'USD', notes: '', billId: '', source: { id: '1' } });
    const request = buildTxRequest(model, 'withdrawal', { amount: model.foreignAmount, currency: model.foreignCurrency });
    expect(request).toMatchObject({ description: 'Cena', time: '20:15', amount: '120.50', foreignAmount: '2.00', foreignCurrency: 'USD', budgetId: '1', billId: null, notes: null, tags: ['hogar'] });
  });

  it('keeps budget and bill only on expenses and trims text', () => {
    const m: TxModel = { ...blankTxModel(), description: '  hola ', source: { id: '1' }, destination: { id: '2' }, amount: '5', budgetId: '9', billId: '3', notes: '  ', category: ' x ', time: '9' };
    expect(buildTxRequest(m, 'deposit', null)).toMatchObject({ description: 'hola', budgetId: null, billId: null, notes: null, category: 'x', time: '09:00', foreignAmount: null });
    expect(buildTxRequest(m, 'withdrawal', null)).toMatchObject({ budgetId: '9', billId: '3' });
  });

  it('defaults to the default account and today, then lets the query string win', () => {
    const ctx = (query: TxQueryValues | null) => ({ accountIds: new Set(['1', '20']), defaultAccountId: '1', query });
    expect(withDefaults(blankTxModel(), ctx(null))).toMatchObject({ source: { id: '1' }, destination: null });
    const m = withDefaults(blankTxModel(), ctx({ source: '1', destination: 'Colmado nuevo', date: '2026-01-05', amount: '10.5', description: 'Pan', category: 'Comida', budget: '4' }));
    expect(m).toMatchObject({ source: { id: '1' }, destination: { name: 'Colmado nuevo' }, date: '2026-01-05', amount: '10.5', description: 'Pan', category: 'Comida', budgetId: '4' });
    expect(withDefaults(blankTxModel(), ctx({ date: 'not-a-date', amount: '-3' }))).toMatchObject({ amount: '' });
  });
});

describe('transactionFormViewModel (create)', () => {
  it('saves a new expense, tells the user and goes back', async () => {
    TestBed.configureTestingModule({ providers: [...formatTestProviders('en', EN, { realStores: true }).providers, provideHttpClient(), provideHttpClientTesting()] });
    await loadTranslations('en');
    const http = TestBed.inject(HttpTestingController);
    const vm = TestBed.runInInjectionContext(() => transactionFormViewModel({ id: signal(undefined), query: signal({}) }));
    TestBed.tick();
    http.expectOne((r) => r.url === '/api/lookups/editor').flush(EDITOR_LOOKUPS);
    await Promise.resolve();
    TestBed.tick();
    expect(vm.model().source).toEqual({ id: '1' }); // the default account

    vm.model.update((m) => ({ ...m, description: 'Cena', destination: { id: '20' }, amount: '50' }));
    expect(vm.type()).toBe('withdrawal');
    const done = vm.save();
    await vi.waitFor(() => http.expectOne({ method: 'POST', url: '/api/transactions' }).flush({ groupId: '9', journalId: '9' }));
    await done;

    expect(TestBed.inject(RecordingToast).messages[0]).toMatchObject({ kind: 'success' });
    expect(TestBed.inject(FakeBackNavigation).fallbacks).toEqual(['/transactions']);
  });
});
