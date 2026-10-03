import { EDITOR_LOOKUPS } from '../../../testing/lookups';
import { mountEditor, verifyNoPendingRequests } from '../../../testing/editor-harness';
import { BudgetForm } from './budget-form';

verifyNoPendingRequests();

async function mount(inputs: Record<string, unknown> = {}) {
  const h = await mountEditor(BudgetForm, inputs);
  h.http.expectOne((r) => r.url === '/api/lookups/editor').flush(EDITOR_LOOKUPS);
  await h.settle();
  return h;
}
const toggle = (h: Awaited<ReturnType<typeof mount>>, label: string) =>
  ([...h.el.querySelectorAll('hlm-switch [role=switch], hlm-switch button')].find((s) => s.getAttribute('aria-label') === label) as HTMLElement);

describe('BudgetForm', () => {
  it('creates a plain budget', async () => {
    const h = await mount();
    await h.type('input[type=text]', 'Mercado');
    await h.click('Save');
    const req = h.http.expectOne((r) => r.method === 'POST' && r.url === '/api/budgets');
    expect(req.request.body).toEqual({ name: 'Mercado', active: true, notes: null, autoBudget: null });
    req.flush({ id: '4' }, { status: 201, statusText: 'Created' });
    await h.settle();
    expect(h.done.count).toBe(1);
  });

  it('creates a budget with an automatic budget in the primary currency', async () => {
    const h = await mount();
    await h.type('input[type=text]', 'Mercado');
    expect(h.text()).not.toContain('Amount per period');
    toggle(h, 'Automatic budget').click();
    await h.settle();
    expect(h.text()).toContain('Amount per period');
    await h.type('sf-money-input input', '15,000.50');
    await h.click('Save');
    const req = h.http.expectOne((r) => r.method === 'POST');
    expect(req.request.body).toEqual({
      name: 'Mercado',
      active: true,
      notes: null,
      autoBudget: { type: 'reset', amount: '15000.50', period: 'monthly', currency: 'DOP' },
    });
    req.flush({ id: '4' }, { status: 201, statusText: 'Created' });
    await h.settle();
  });

  it('asks for the amount when the automatic budget is on', async () => {
    const h = await mount();
    await h.type('input[type=text]', 'Mercado');
    toggle(h, 'Automatic budget').click();
    await h.settle();
    await h.click('Save');
    h.http.expectNone((r) => r.method === 'POST');
    expect(h.text()).toContain('This field is required.');
  });

  it('loads a budget with an automatic budget and can switch it off', async () => {
    const h = await mount({ id: '2' });
    h.answer('GET', '/api/budgets/2', {
      id: '2',
      name: 'Hogar',
      active: false,
      notes: 'Casa',
      autoBudget: { type: 'rollover', amount: '32000.00', period: 'monthly', currency: 'USD' },
    });
    await h.settle();
    expect((h.el.querySelector('input[type=text]') as HTMLInputElement).value).toBe('Hogar');
    expect(h.text()).toContain('Amount per period');
    toggle(h, 'Automatic budget').click();
    await h.settle();
    await h.click('Save');
    const req = h.http.expectOne((r) => r.method === 'PUT' && r.url === '/api/budgets/2');
    expect(req.request.body).toEqual({ name: 'Hogar', active: false, notes: 'Casa', autoBudget: null });
    req.flush({ id: '2' });
    await h.settle();
    expect(h.done.count).toBe(1);
  });
});
