import { todayIso } from '@shared';
import { EDITOR_LOOKUPS } from '../../../testing/lookups';
import { mountEditor, verifyNoPendingRequests } from '../../../testing/editor-harness';
import { BillForm } from './bill-form';

verifyNoPendingRequests();

async function mount(inputs: Record<string, unknown> = {}) {
  const h = await mountEditor(BillForm, inputs);
  h.http.expectOne((r) => r.url === '/api/lookups/editor').flush(EDITOR_LOOKUPS);
  await h.settle();
  return h;
}
type Harness = Awaited<ReturnType<typeof mount>>;
const toggle = (h: Harness, label: string) => [...h.el.querySelectorAll('hlm-switch [role=switch], hlm-switch button')].find((s) => s.getAttribute('aria-label') === label) as HTMLElement;
const amountInputs = (h: Harness) => [...h.el.querySelectorAll('sf-money-input input')] as HTMLInputElement[];
const typeAt = async (h: Harness, index: number, text: string) => {
  const input = amountInputs(h)[index]!;
  input.value = text;
  input.dispatchEvent(new Event('input'));
  await h.settle();
};

describe('BillForm', () => {
  it('creates a fixed-amount subscription: one amount, sent as minimum and maximum', async () => {
    const h = await mount();
    await h.type('input[type=text]', 'Spotify');
    expect(amountInputs(h)).toHaveLength(1);
    await typeAt(h, 0, '10.99');
    await h.click('Save');
    const req = h.http.expectOne((r) => r.method === 'POST' && r.url === '/api/bills');
    expect(req.request.body).toEqual({
      name: 'Spotify',
      amountMin: '10.99',
      amountMax: '10.99',
      currency: 'DOP',
      date: todayIso(),
      repeatFreq: 'monthly',
      skip: 0,
      endDate: null,
      active: true,
      group: null,
      notes: null,
    });
    req.flush({ id: '7' }, { status: 201, statusText: 'Created' });
    await h.settle();
    expect(h.done.count).toBe(1);
  });

  it('asks for a minimum and a maximum when the amount is not fixed, and checks the range', async () => {
    const h = await mount();
    await h.type('input[type=text]', 'Luz');
    toggle(h, 'Fixed amount').click();
    await h.settle();
    expect(amountInputs(h)).toHaveLength(2);
    await typeAt(h, 0, '3000');
    await typeAt(h, 1, '2000');
    await h.click('Save');
    h.http.expectNone((r) => r.method === 'POST');
    expect(h.text()).toContain("The maximum amount can't be lower than the minimum.");
    await typeAt(h, 1, '3500');
    await h.click('Save');
    const req = h.http.expectOne((r) => r.method === 'POST');
    expect(req.request.body).toMatchObject({ amountMin: '3000', amountMax: '3500' });
    req.flush({ id: '8' }, { status: 201, statusText: 'Created' });
    await h.settle();
  });

  it('requires the end date to be after the first date', async () => {
    const h = await mount();
    await h.type('input[type=text]', 'Gimnasio');
    await typeAt(h, 0, '2500');
    await h.setDate(0, '2026-10-05');
    await h.setDate(1, '2026-09-01');
    await h.click('Save');
    h.http.expectNone((r) => r.method === 'POST');
    expect(h.text()).toContain('The end date must be after the start date.');
  });

  it('loads an existing subscription, keeps a range, and can clear the end date', async () => {
    const h = await mount({ id: '1' });
    h.answer('GET', '/api/bills/1', {
      id: '1',
      name: 'Luz',
      amountMin: '3000.00',
      amountMax: '3400.00',
      currency: 'DOP',
      date: '2026-01-20',
      repeatFreq: 'monthly',
      skip: 1,
      endDate: '2027-01-20',
      active: true,
      group: 'Casa',
      notes: null,
    });
    await h.settle();
    expect(amountInputs(h)).toHaveLength(2); // min ≠ max: not fixed
    expect((h.el.querySelector('input[type=number]') as HTMLInputElement).value).toBe('1');
    await h.click('Clear');
    await h.click('Save');
    const req = h.http.expectOne((r) => r.method === 'PUT' && r.url === '/api/bills/1');
    expect(req.request.body).toMatchObject({ amountMin: '3000.00', amountMax: '3400.00', skip: 1, endDate: null, group: 'Casa' });
    req.flush({ id: '1' });
    await h.settle();
    expect(h.done.count).toBe(1);
  });

  it("shows Firefly's complaint on the right field", async () => {
    const h = await mount();
    await h.type('input[type=text]', 'Luz');
    await typeAt(h, 0, '5');
    await h.click('Save');
    h.answer('POST', '/api/bills', { error: 'validation', message: 'x', fields: { name: ['The name is already in use.'] } }, 422);
    await h.settle();
    const field = [...h.el.querySelectorAll('sf-form-field')].find((f) => f.textContent!.includes('Name'))!;
    expect(field.textContent).toContain('The name is already in use.');
    expect(h.done.count).toBe(0);
  });
});
