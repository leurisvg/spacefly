import { EDITOR_LOOKUPS } from '../../../testing/lookups';
import { mountEditor, verifyNoPendingRequests } from '../../../testing/editor-harness';
import { AccountForm } from './account-form';

verifyNoPendingRequests();

async function mount(inputs: Record<string, unknown> = {}) {
  const h = await mountEditor(AccountForm, inputs);
  h.http.expectOne((r) => r.url === '/api/lookups/editor').flush(EDITOR_LOOKUPS);
  await h.settle();
  return h;
}
type Harness = Awaited<ReturnType<typeof mount>>;
const labels = (h: Harness) => [...h.el.querySelectorAll('sf-form-field label')].map((l) => l.textContent!.replace('*', '').trim());

const EXISTING = {
  id: '3',
  type: 'asset',
  name: 'Tarjeta Visa',
  active: true,
  iban: null,
  notes: null,
  currency: 'DOP',
  includeNetWorth: true,
  role: 'ccAsset',
  creditCardType: 'monthlyFull',
  monthlyPaymentDate: '2026-09-25',
  openingBalance: null,
  openingBalanceDate: null,
  liabilityType: null,
  liabilityDirection: null,
  interest: null,
  interestPeriod: null,
  transactionCount: 12,
};

describe('AccountForm', () => {
  it('shows the fields of an asset account, and creates it', async () => {
    const h = await mount();
    expect(labels(h)).toEqual(expect.arrayContaining(['Account type', 'Name', 'Use', 'Currency', 'Opening balance', 'IBAN', 'Notes']));
    expect(labels(h)).not.toContain('Interest (%)');
    await h.type('input[type=text]:not([role=combobox])', 'Ahorros nuevos');
    await h.click('Save');
    const req = h.http.expectOne((r) => r.method === 'POST' && r.url === '/api/accounts');
    expect(req.request.body).toEqual({
      type: 'asset',
      name: 'Ahorros nuevos',
      active: true,
      iban: null,
      notes: null,
      currency: 'DOP',
      includeNetWorth: true,
      role: 'defaultAsset',
      creditCardType: null,
      monthlyPaymentDate: null,
      openingBalance: null,
      openingBalanceDate: null,
      liabilityType: null,
      liabilityDirection: null,
      interest: null,
      interestPeriod: null,
    });
    req.flush({ id: '30' }, { status: 201, statusText: 'Created' });
    await h.settle();
    expect(h.done.count).toBe(1);
  });

  it('asks for the date when an opening balance is entered', async () => {
    const h = await mount();
    await h.type('input[type=text]:not([role=combobox])', 'Con saldo');
    await h.type('sf-money-input input', '2,500.50');
    await h.click('Save');
    h.http.expectNone((r) => r.method === 'POST');
    expect(h.text()).toContain('This field is required.');
    await h.setDate(0, '2026-01-01');
    await h.click('Save');
    const req = h.http.expectOne((r) => r.method === 'POST');
    expect(req.request.body).toMatchObject({ openingBalance: '2500.50', openingBalanceDate: '2026-01-01' });
    req.flush({ id: '31' }, { status: 201, statusText: 'Created' });
    await h.settle();
  });

  it('starts as the kind it was opened for and shows that kind’s fields', async () => {
    const liability = await mount({ accountType: 'liability' });
    expect(labels(liability)).toEqual(expect.arrayContaining(['Liability type', 'Who owes', 'Interest (%)', 'Interest period', 'Amount owed']));
    expect(labels(liability)).not.toContain('Use');
    liability.fixture.destroy();
  });

  it('keeps expense accounts simple', async () => {
    const h = await mount({ accountType: 'expense' });
    expect(labels(h)).not.toContain('Currency');
    expect(labels(h)).not.toContain('Use');
    await h.type('input[type=text]:not([role=combobox])', 'Panadería');
    await h.click('Save');
    const req = h.http.expectOne((r) => r.method === 'POST');
    expect(req.request.body).toMatchObject({ type: 'expense', name: 'Panadería', currency: null, role: null, interest: null, openingBalance: null });
    req.flush({ id: '32' }, { status: 201, statusText: 'Created' });
    await h.settle();
  });

  it('creates a liability with its interest', async () => {
    const h = await mount({ accountType: 'liability' });
    await h.type('input[type=text]:not([role=combobox])', 'Préstamo carro');
    await h.type('input[inputmode=decimal]:not(sf-money-input input)', '12.5');
    await h.type('sf-money-input input', '420000');
    await h.setDate(0, '2026-02-01');
    await h.click('Save');
    const req = h.http.expectOne((r) => r.method === 'POST');
    expect(req.request.body).toMatchObject({
      type: 'liability',
      currency: 'DOP',
      liabilityType: 'loan',
      liabilityDirection: 'debit',
      interest: '12.5',
      interestPeriod: 'monthly',
      openingBalance: '420000',
      openingBalanceDate: '2026-02-01',
      role: null,
    });
    req.flush({ id: '33' }, { status: 201, statusText: 'Created' });
    await h.settle();
  });

  it('loads an account, locks its type, and sends the credit card payment date', async () => {
    const h = await mount({ id: '3' });
    h.answer('GET', '/api/accounts/3', EXISTING);
    await h.settle();
    expect(h.text()).toContain('The type can’t be changed'.replace('’', "'"));
    expect(h.el.querySelector('sf-select button[role=combobox]')!.hasAttribute('disabled')).toBe(true);
    expect(labels(h)).toEqual(expect.arrayContaining(['Card type', 'Payment day']));
    expect((h.el.querySelector('input[type=number]') as HTMLInputElement).value).toBe('25');
    await h.click('Save');
    const req = h.http.expectOne((r) => r.method === 'PUT' && r.url === '/api/accounts/3');
    expect(req.request.body).toMatchObject({ type: 'asset', role: 'ccAsset', creditCardType: 'monthlyFull' });
    expect(req.request.body.monthlyPaymentDate).toMatch(/^\d{4}-\d{2}-25$/);
    req.flush({ id: '3' });
    await h.settle();
    expect(h.done.count).toBe(1);
  });

  it('rejects a payment day outside 1–31', async () => {
    const h = await mount({ id: '3' });
    h.answer('GET', '/api/accounts/3', EXISTING);
    await h.settle();
    await h.type('input[type=number]', '40');
    await h.click('Save');
    h.http.expectNone((r) => r.method === 'PUT');
    expect(h.text()).toContain('Enter a day between 1 and 31.');
  });

  it('warns how many transactions go with the account and needs its name typed to delete', async () => {
    const h = await mount({ id: '3' });
    h.answer('GET', '/api/accounts/3', EXISTING);
    await h.settle();
    await h.click('Delete');
    await new Promise((r) => setTimeout(r, 20));
    const dialog = document.body.querySelector('sf-confirm-dialog') as HTMLElement;
    expect(dialog.textContent).toContain('Its 12 transactions will be deleted too.');
    expect(dialog.textContent).toContain('Type “Tarjeta Visa” to confirm');
    const confirm = [...dialog.querySelectorAll('button')].find((b) => b.textContent!.trim() === 'Delete') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    const input = dialog.querySelector('input') as HTMLInputElement;
    input.value = 'tarjeta visa';
    input.dispatchEvent(new Event('input'));
    await h.settle();
    expect(confirm.disabled).toBe(false);
    confirm.click();
    await new Promise((r) => setTimeout(r, 20));
    h.http.expectOne((r) => r.method === 'DELETE' && r.url === '/api/accounts/3').flush(null, { status: 204, statusText: 'No Content' });
    await h.settle();
    expect(h.done.count).toBe(1);
  });

  it('puts the server’s complaint on its field', async () => {
    const h = await mount();
    await h.type('input[type=text]:not([role=combobox])', 'Banco Popular');
    await h.click('Save');
    h.answer('POST', '/api/accounts', { error: 'validation', message: 'x', fields: { name: ['The name is already in use.'] } }, 422);
    await h.settle();
    const field = [...h.el.querySelectorAll('sf-form-field')].find((f) => f.textContent!.includes('Name'))!;
    expect(field.textContent).toContain('The name is already in use.');
  });
});
