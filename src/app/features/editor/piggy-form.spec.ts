import { EDITOR_LOOKUPS } from '../../../testing/lookups';
import { mountEditor, verifyNoPendingRequests } from '../../../testing/editor-harness';
import { PiggyForm } from './piggy-form';

verifyNoPendingRequests();

async function mount(inputs: Record<string, unknown> = {}) {
  const h = await mountEditor(PiggyForm, inputs);
  h.http.expectOne((r) => r.url === '/api/lookups/editor').flush(EDITOR_LOOKUPS);
  await h.settle();
  const form = h.fixture.componentInstance as unknown as {
    addAccount(id: string): void;
    model: () => { currency: string; accounts: { accountId: string; currentAmount: string; adjust: string }[] };
    accountOptions(): { value: string }[];
  };
  return { ...h, form };
}
type Harness = Awaited<ReturnType<typeof mount>>;
const rows = (h: Harness) => [...h.el.querySelectorAll('fieldset [role=group]')] as HTMLElement[];
const savedOf = (h: Harness, i: number) => (rows(h)[i]!.querySelector('sf-money-input input') as HTMLInputElement).value;
const adjustWith = async (h: Harness, i: number, amount: string, button: 'Add' | 'Remove') => {
  const row = rows(h)[i]!;
  const input = row.querySelectorAll('sf-money-input input')[1] as HTMLInputElement;
  input.value = amount;
  input.dispatchEvent(new Event('input'));
  await h.settle();
  ([...row.querySelectorAll('button')].find((b) => b.textContent!.trim() === button) as HTMLButtonElement).click();
  await h.settle();
};

describe('PiggyForm', () => {
  it('needs at least one account', async () => {
    const h = await mount();
    await h.type('input[type=text]:not([role=combobox])', 'Laptop');
    await h.click('Save');
    h.http.expectNone((r) => r.method === 'POST');
    expect(h.text()).toContain('Pick at least one account.');
  });

  it('lets the first account decide the currency and then only offers accounts in it', async () => {
    const h = await mount();
    expect(h.form.accountOptions().map((o) => o.value)).toEqual(['1', '2']); // asset accounts only
    h.form.addAccount('2'); // the USD account
    await h.settle();
    expect(h.form.model().currency).toBe('USD');
    expect(h.form.accountOptions()).toEqual([]); // nothing else in USD, and the account in use is gone
    expect(rows(h)).toHaveLength(1);
  });

  it('adds and removes money in an account without going below zero', async () => {
    const h = await mount();
    h.form.addAccount('1');
    await h.settle();
    expect(savedOf(h, 0)).toBe('0.00');
    await adjustWith(h, 0, '1,500.50', 'Add');
    expect(savedOf(h, 0)).toBe('1,500.50');
    await adjustWith(h, 0, '200', 'Remove');
    expect(savedOf(h, 0)).toBe('1,300.50');
    await adjustWith(h, 0, '9999', 'Remove');
    expect(savedOf(h, 0)).toBe('0.00');
  });

  it('creates a goal sending the complete list of accounts', async () => {
    const h = await mount();
    await h.type('input[type=text]:not([role=combobox])', 'Laptop');
    await h.type('sf-money-input input', '95000'); // goal amount (first money field)
    h.form.addAccount('1');
    await h.settle();
    await adjustWith(h, 0, '1000', 'Add');
    await h.click('Save');
    const req = h.http.expectOne((r) => r.method === 'POST' && r.url === '/api/piggy-banks');
    expect(req.request.body).toEqual({
      name: 'Laptop',
      currency: 'DOP',
      targetAmount: '95000',
      startDate: null,
      targetDate: null,
      group: null,
      notes: null,
      accounts: [{ accountId: '1', currentAmount: '1000.00' }],
    });
    req.flush({ id: '5' }, { status: 201, statusText: 'Created' });
    await h.settle();
    expect(h.done.count).toBe(1);
  });

  it('loads a goal and saves the whole list after removing an account', async () => {
    const h = await mount({ id: '5' });
    h.answer('GET', '/api/piggy-banks/5', {
      id: '5',
      name: 'Fondo',
      currency: 'DOP',
      targetAmount: '300000',
      startDate: null,
      targetDate: '2027-06-01',
      group: 'Metas',
      notes: null,
      accounts: [
        { accountId: '1', currentAmount: '100000.00' },
        { accountId: '5', currentAmount: '5000.00' },
      ],
    });
    await h.settle();
    expect(rows(h)).toHaveLength(2);
    (rows(h)[1]!.querySelector('button[aria-label^="Remove"]') as HTMLButtonElement).click();
    await h.settle();
    await h.click('Save');
    const req = h.http.expectOne((r) => r.method === 'PUT' && r.url === '/api/piggy-banks/5');
    expect(req.request.body).toMatchObject({ name: 'Fondo', targetAmount: '300000', targetDate: '2027-06-01', accounts: [{ accountId: '1', currentAmount: '100000.00' }] });
    req.flush({ id: '5' });
    await h.settle();
    expect(h.done.count).toBe(1);
  });

  it('checks the target date against the start date', async () => {
    const h = await mount();
    await h.type('input[type=text]:not([role=combobox])', 'X');
    h.form.addAccount('1');
    const dates = [...h.el.querySelectorAll('input[type=date]')] as HTMLInputElement[];
    dates[0]!.value = '2026-10-01';
    dates[0]!.dispatchEvent(new Event('input'));
    dates[1]!.value = '2026-01-01';
    dates[1]!.dispatchEvent(new Event('input'));
    await h.settle();
    await h.click('Save');
    h.http.expectNone((r) => r.method === 'POST');
    expect(h.text()).toContain('The end date must be after the start date.');
  });
});
