import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, type TestRequest } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { todayIso, type EditorLookups, type TxEditPayload } from '@shared';
import { FiltersStore } from '../../core/state/filters.store';
import { MetaStore } from '../../core/state/meta.store';
import { formatTestProviders, loadTranslations } from '../../../testing/format-providers';
import { EN } from '../../../testing/translations';
import { TransactionForm } from './transaction-form';

@Component({ template: '' })
class Page {}

const LOOKUPS: EditorLookups = {
  accounts: [
    { id: '1', name: 'Banco Popular', kind: 'asset', liabilityType: null, currency: 'DOP', balance: 1500, role: 'defaultAsset', group: null },
    { id: '2', name: 'Cuenta USD', kind: 'asset', liabilityType: null, currency: 'USD', balance: -20, role: null, group: null },
    { id: '3', name: 'Visa', kind: 'asset', liabilityType: null, currency: 'DOP', balance: -300, role: 'ccAsset', group: null },
    { id: '10', name: 'Empresa SRL', kind: 'revenue', liabilityType: null, currency: 'DOP', balance: 0, role: null, group: null },
    { id: '20', name: 'Supermercado', kind: 'expense', liabilityType: null, currency: 'DOP', balance: 0, role: null, group: null },
  ],
  categories: [{ id: '1', name: 'Comida' }],
  tags: [{ id: '1', name: 'hogar' }],
  budgets: [{ id: '1', name: 'Hogar' }],
  bills: [{ id: '1', name: 'Luz', currency: 'DOP', active: true }],
  piggyBanks: [],
  currencies: [
    { code: 'DOP', name: 'Peso', symbol: 'RD$', decimals: 2 },
    { code: 'USD', name: 'Dollar', symbol: 'US$', decimals: 2 },
  ],
  defaultAccountId: '1',
};

const EDIT: TxEditPayload = {
  groupId: '55',
  journalId: '66',
  type: 'withdrawal',
  description: 'Compra quincenal',
  date: '2026-09-03',
  time: '12:00',
  currency: 'DOP',
  source: { id: '1', name: 'Banco Popular', kind: 'asset' },
  destination: { id: '20', name: 'Supermercado', kind: 'expense' },
  amount: '8500.00',
  foreignAmount: null,
  foreignCurrency: null,
  category: 'Comida',
  budgetId: '1',
  billId: null,
  tags: ['hogar'],
  notes: null,
};

interface Setup {
  fixture: ComponentFixture<TransactionForm>;
  http: HttpTestingController;
  router: Router;
  refresh: ReturnType<typeof vi.fn>;
  model: () => Record<string, unknown>;
  setModel: (patch: Record<string, unknown>) => void;
  settle: () => Promise<void>;
  save: () => Promise<void>;
  type: (text: string) => Promise<void>;
  text: () => string;
  /** The next write request to `url`, answered with `reply`. */
  answer: (method: string, url: string, status: number, reply: object) => TestRequest;
}

async function setup(opts: { id?: string; query?: Record<string, string>; edit?: TxEditPayload | { status: number; body: object } } = {}): Promise<Setup> {
  localStorage.removeItem('spacefly.tx.afterSave');
  const refresh = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      ...formatTestProviders('en', EN).providers,
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{ path: 'transactions', component: Page }]),
      { provide: FiltersStore, useValue: { currency: signal('DOP'), refreshTick: signal(0), refresh } },
      {
        provide: MetaStore,
        useValue: {
          currencies: signal([{ code: 'DOP', name: 'Peso', symbol: 'RD$', decimals: 2 }]),
          primary: signal('DOP'),
          fireflyUrl: (p: string) => `https://firefly.example.com${p}`,
        },
      },
    ],
  });
  await loadTranslations();
  http = TestBed.inject(HttpTestingController);
  const router = TestBed.inject(Router);
  const fixture = TestBed.createComponent(TransactionForm);
  if (opts.id) fixture.componentRef.setInput('id', opts.id);
  for (const [k, v] of Object.entries(opts.query ?? {})) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  const settle = async () => {
    for (let i = 0; i < 5; i++) {
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r, 0));
    }
  };
  await settle();
  http.expectOne((r) => r.url === '/api/lookups/editor').flush(LOOKUPS);
  if (opts.id) {
    const get = http.expectOne(`/api/transactions/${opts.id}`);
    if (opts.edit && 'status' in opts.edit) get.flush(opts.edit.body, { status: opts.edit.status, statusText: 'x' });
    else get.flush(opts.edit ?? EDIT);
  }
  await settle();
  const comp = fixture.componentInstance as unknown as { model: { (): Record<string, unknown>; update: (f: (m: Record<string, unknown>) => Record<string, unknown>) => void } };
  const el = fixture.nativeElement as HTMLElement;
  const button = (label: string) => [...el.querySelectorAll('sf-form-footer button')].find((b) => b.textContent!.trim() === label) as HTMLButtonElement;
  const backend = http;
  return {
    fixture,
    http: backend,
    router,
    refresh,
    model: () => comp.model(),
    setModel: (patch) => comp.model.update((m) => ({ ...m, ...patch })),
    settle,
    save: async () => {
      button('Save').click();
      await settle();
    },
    type: async (text) => {
      const input = el.querySelector('sf-form-field input') as HTMLInputElement;
      input.value = text;
      input.dispatchEvent(new Event('input'));
      await settle();
    },
    text: () => el.textContent!.replace(/\s+/g, ' '),
    answer: (method, url, status, reply) => {
      const req = backend.expectOne((r) => r.method === method && r.url === url);
      req.flush(reply, { status, statusText: 'x' });
      return req;
    },
  };
}

let http: HttpTestingController | undefined;

afterEach(() => {
  http?.verify();
  http = undefined;
  localStorage.clear();
});

describe('TransactionForm · new', () => {
  it('starts with today and the default account, and asks for the other account', async () => {
    const s = await setup();
    expect(s.model()['date']).toBe(todayIso());
    expect(s.model()['time']).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
    expect(s.model()['source']).toEqual({ id: '1' });
    expect(s.text()).toContain('Pick the accounts');
    expect(s.text()).toContain('your Firefly rules and webhooks will run'.replace('your', 'Your'));
  });

  it('shows the type live as the accounts change', async () => {
    const s = await setup();
    s.setModel({ destination: { id: '20' } });
    await s.settle();
    expect(s.fixture.nativeElement.querySelector('sf-tx-type-badge').textContent.trim()).toBe('Expense');
    s.setModel({ source: { id: '10' }, destination: { id: '1' } });
    await s.settle();
    expect(s.fixture.nativeElement.querySelector('sf-tx-type-badge').textContent.trim()).toBe('Income');
    s.setModel({ source: { id: '1' }, destination: { id: '3' } });
    await s.settle();
    expect(s.fixture.nativeElement.querySelector('sf-tx-type-badge').textContent.trim()).toBe('Transfer');
    s.setModel({ source: { id: '10' }, destination: { id: '20' } });
    await s.settle();
    expect(s.fixture.nativeElement.querySelector('sf-tx-type-badge').textContent.trim()).toBe('Invalid combination');
  });

  it('pre-fills from the query string', async () => {
    const s = await setup({ query: { source: '3', destination: 'Cafetería', date: '2026-08-15', amount: '99.5', description: 'Café' } });
    expect(s.model()).toMatchObject({ source: { id: '3' }, destination: { name: 'Cafetería' }, date: '2026-08-15', amount: '99.5', description: 'Café' });
  });

  it('sends the transaction without a type, refreshes, and returns to the explorer', async () => {
    const s = await setup();
    await s.type('Supermercado semanal');
    s.setModel({ destination: { id: '20' }, amount: '150.50', category: 'Comida', tags: ['hogar'], time: '18:45' });
    await s.save();
    const req = s.http.expectOne((r) => r.method === 'POST' && r.url === '/api/transactions');
    expect(req.request.body).toEqual({
      description: 'Supermercado semanal',
      date: todayIso(),
      time: '18:45',
      source: { id: '1' },
      destination: { id: '20' },
      amount: '150.50',
      foreignAmount: null,
      foreignCurrency: null,
      category: 'Comida',
      budgetId: null,
      billId: null,
      tags: ['hogar'],
      notes: null,
    });
    expect(req.request.body).not.toHaveProperty('type');
    req.flush({ groupId: '9', journalId: '9', type: 'withdrawal' }, { status: 201, statusText: 'Created' });
    await s.settle();
    expect(s.refresh).toHaveBeenCalledTimes(1);
    expect(s.router.url).toBe('/transactions'); // no history inside the app: the fallback route
  });

  it('suggests descriptions used before while typing', async () => {
    const s = await setup();
    await s.type('Comp');
    expect(s.http.match((r) => r.url === '/api/lookups/descriptions')).toHaveLength(0); // waits for a pause in typing
    await new Promise((r) => setTimeout(r, 260));
    const req = s.http.expectOne((r) => r.url === '/api/lookups/descriptions');
    expect(req.request.params.get('q')).toBe('Comp');
    req.flush(['Compra quincenal', 'Compra rápida']);
    await s.settle();
    const options = [...document.body.querySelectorAll('[role=option]')].map((o) => o.textContent!.trim());
    expect(options).toEqual(['Compra quincenal', 'Compra rápida']);
    (document.body.querySelectorAll('[role=option]')[0] as HTMLElement).click();
    await s.settle();
    expect(s.model()['description']).toBe('Compra quincenal');
  });

  it('keeps showing the previous suggestions while the next ones load, and drops them once the field is emptied', async () => {
    const s = await setup();
    const shown = () => [...document.body.querySelectorAll('[role=option]')].map((o) => o.textContent!.trim());
    await s.type('Comp');
    await new Promise((r) => setTimeout(r, 260));
    s.http.expectOne((r) => r.url === '/api/lookups/descriptions').flush(['Compra quincenal', 'Compra rápida']);
    await s.settle();
    await s.type('Compra');
    await new Promise((r) => setTimeout(r, 260));
    const next = s.http.expectOne((r) => r.url === '/api/lookups/descriptions' && r.params.get('q') === 'Compra'); // not answered yet
    expect(shown()).toEqual(['Compra quincenal', 'Compra rápida']);
    next.flush(['Compra quincenal']);
    await s.settle();
    expect(shown()).toEqual(['Compra quincenal']);
    await s.type('');
    await s.settle();
    expect(shown()).toEqual([]);
  });

  it('asks again only for the last text typed, and not at all when the field is emptied', async () => {
    const s = await setup();
    await s.type('C');
    await s.type('Co');
    await s.type('Com');
    await new Promise((r) => setTimeout(r, 260));
    const req = s.http.expectOne((r) => r.url === '/api/lookups/descriptions');
    expect(req.request.params.get('q')).toBe('Com');
    req.flush([]);
    await s.type('');
    await new Promise((r) => setTimeout(r, 260));
    s.http.expectNone((r) => r.url === '/api/lookups/descriptions');
  });

  it('reads a loosely typed time and sends it as HH:mm', async () => {
    const s = await setup();
    await s.type('Café');
    s.setModel({ destination: { id: '20' }, amount: '5', time: '930' });
    await s.save();
    expect(s.http.expectOne((r) => r.method === 'POST' && r.url === '/api/transactions').request.body).toMatchObject({ time: '09:30' });
  });

  it('sends no time when the field is left empty, so the server decides', async () => {
    const s = await setup();
    await s.type('Café');
    s.setModel({ destination: { id: '20' }, amount: '5', time: '' });
    await s.save();
    expect(s.http.expectOne((r) => r.method === 'POST' && r.url === '/api/transactions').request.body).toMatchObject({ time: null });
  });

  it('does not send a time that is not a time and says why', async () => {
    const s = await setup();
    await s.type('Café');
    s.setModel({ destination: { id: '20' }, amount: '5', time: '25:99' });
    await s.save();
    s.http.expectNone((r) => r.method === 'POST');
    expect(s.text()).toContain('Enter a valid time');
  });

  it('sends a new merchant as a name', async () => {
    const s = await setup();
    await s.type('Pan');
    s.setModel({ destination: { name: 'Panadería Nueva' }, amount: '20' });
    await s.save();
    const req = s.http.expectOne((r) => r.method === 'POST');
    expect(req.request.body.destination).toEqual({ name: 'Panadería Nueva' });
    req.flush({}, { status: 201, statusText: 'Created' });
    await s.settle();
  });

  it('does not send anything while the form is invalid and shows what is missing', async () => {
    const s = await setup();
    await s.save();
    s.http.expectNone((r) => r.method === 'POST');
    expect(s.text().match(/This field is required\./g)).toHaveLength(3); // description, destination, amount
  });

  it('refuses an impossible account combination', async () => {
    const s = await setup();
    await s.type('x');
    s.setModel({ source: { id: '10' }, destination: { id: '20' }, amount: '5' });
    await s.save();
    s.http.expectNone((r) => r.method === 'POST');
    expect(s.text()).toContain("These two accounts can't be combined.");
  });

  it("shows Firefly's 422 under its field and stays on the form", async () => {
    const s = await setup();
    await s.type('Algo');
    s.setModel({ destination: { id: '20' }, amount: '5' });
    await s.save();
    s.answer('POST', '/api/transactions', 422, { error: 'validation', message: 'bad', fields: { amount: ['Firefly says no.'], bogus: ['Elsewhere'] } });
    await s.settle();
    const fields = [...s.fixture.nativeElement.querySelectorAll('sf-form-field')] as HTMLElement[];
    const amount = fields.find((f) => f.textContent!.includes('Amount'))!;
    expect(amount.textContent).toContain('Firefly says no.');
    expect(s.text()).toContain('Elsewhere'); // errors without a field of their own go on top of the form
    expect(s.router.url).not.toBe('/transactions');
    expect(s.refresh).not.toHaveBeenCalled();
    // The form is usable again.
    expect(s.fixture.nativeElement.querySelector('sf-form-footer button[aria-busy=true]')).toBeNull();
  });

  it('asks for the received amount of a transfer between currencies and sends it', async () => {
    const s = await setup();
    await s.type('Cambio de moneda');
    s.setModel({ source: { id: '1' }, destination: { id: '2' }, amount: '6100' });
    await s.settle();
    expect(s.text()).toContain('Received amount (USD)');
    await s.save();
    s.http.expectNone((r) => r.method === 'POST');
    s.setModel({ foreignAmount: '100' });
    await s.save();
    const req = s.http.expectOne((r) => r.method === 'POST');
    expect(req.request.body).toMatchObject({ amount: '6100', foreignAmount: '100', foreignCurrency: 'USD' });
    req.flush({}, { status: 201, statusText: 'Created' });
    await s.settle();
  });

  it('offers "other currency" on expenses and sends it', async () => {
    const s = await setup();
    await s.type('Netflix');
    s.setModel({ destination: { id: '20' }, amount: '900', otherCurrency: true, foreignCurrency: 'USD', foreignAmount: '15.99' });
    await s.save();
    const req = s.http.expectOne((r) => r.method === 'POST');
    expect(req.request.body).toMatchObject({ foreignAmount: '15.99', foreignCurrency: 'USD' });
    req.flush({}, { status: 201, statusText: 'Created' });
    await s.settle();
  });

  it('hides budget and subscription unless it is an expense', async () => {
    const s = await setup();
    s.setModel({ destination: { id: '20' } });
    await s.settle();
    expect(s.text()).toContain('Subscription');
    s.setModel({ destination: { id: '3' } });
    await s.settle();
    expect(s.text()).not.toContain('Subscription');
  });

  describe('after saving', () => {
    async function createAnother(s: Setup) {
      await s.type('Primera');
      s.setModel({ destination: { id: '20' }, amount: '10', category: 'Comida', date: '2026-01-05' });
      await s.save();
      s.answer('POST', '/api/transactions', 201, { groupId: '1', journalId: '1', type: 'withdrawal' });
      await s.settle();
    }
    const setAfter = (s: Setup, value: { stay: boolean; reset: boolean }) => {
      const comp = s.fixture.componentInstance as unknown as { after: { set(v: unknown): void } };
      comp.after.set(value);
    };

    it('stays with a reset form: today, the default account, nothing else', async () => {
      const s = await setup();
      setAfter(s, { stay: true, reset: true });
      await createAnother(s);
      expect(s.router.url).not.toBe('/transactions');
      expect(s.model()).toMatchObject({ description: '', destination: null, amount: '', category: '', date: todayIso(), source: { id: '1' } });
    });

    it('stays with the data when not resetting', async () => {
      const s = await setup();
      setAfter(s, { stay: true, reset: false });
      await createAnother(s);
      expect(s.router.url).not.toBe('/transactions');
      expect(s.model()).toMatchObject({ description: 'Primera', destination: { id: '20' }, amount: '10', category: 'Comida', date: '2026-01-05' });
    });

    it('remembers the choice', async () => {
      const s = await setup();
      const toggles = [...s.fixture.nativeElement.querySelectorAll('hlm-switch button, hlm-switch [role=switch]')] as HTMLElement[];
      const stay = toggles.find((t) => t.getAttribute('aria-label') === 'Stay here to create another')!;
      stay.click();
      await s.settle();
      expect(JSON.parse(localStorage.getItem('spacefly.tx.afterSave')!)).toEqual({ stay: true, reset: true });
    });
  });
});

describe('TransactionForm · edit', () => {
  it('loads the transaction into the form', async () => {
    const s = await setup({ id: '55' });
    expect(s.model()).toMatchObject({
      description: 'Compra quincenal',
      source: { id: '1' },
      destination: { id: '20' },
      amount: '8500.00',
      category: 'Comida',
      budgetId: '1',
      tags: ['hogar'],
      date: '2026-09-03',
      time: '12:00',
    });
    expect(s.text()).toContain('Edit transaction');
  });

  it('saves with PUT and goes back', async () => {
    const s = await setup({ id: '55' });
    s.setModel({ amount: '9000' });
    await s.save();
    const req = s.http.expectOne((r) => r.method === 'PUT' && r.url === '/api/transactions/55');
    expect(req.request.body).toMatchObject({ amount: '9000', category: 'Comida', budgetId: '1', time: '12:00' });
    expect(req.request.body).not.toHaveProperty('type');
    req.flush({ groupId: '55', journalId: '66', type: 'withdrawal' });
    await s.settle();
    expect(s.router.url).toBe('/transactions');
  });

  it('reloads from the server when staying, because rules may have changed fields', async () => {
    const s = await setup({ id: '55' });
    (s.fixture.componentInstance as unknown as { after: { set(v: unknown): void } }).after.set({ stay: true, reset: true });
    await s.save();
    s.answer('PUT', '/api/transactions/55', 200, { groupId: '55', journalId: '66', type: 'withdrawal' });
    await s.settle();
    const reload = s.http.expectOne('/api/transactions/55');
    reload.flush({ ...EDIT, tags: ['hogar', 'regla-aplicada'] });
    await s.settle();
    expect(s.model()['tags']).toEqual(['hogar', 'regla-aplicada']);
    expect(s.router.url).not.toBe('/transactions');
  });

  it('shows a way out to Firefly for a transaction with several parts', async () => {
    const s = await setup({ id: '77', edit: { status: 409, body: { error: 'not_editable', reason: 'splits' } } });
    expect(s.text()).toContain("This transaction can't be edited here");
    expect(s.text()).toContain('several parts');
    const link = s.fixture.nativeElement.querySelector('a[href]') as HTMLAnchorElement;
    expect(link.href).toBe('https://firefly.example.com/transactions/show/77');
    const buttons = [...s.fixture.nativeElement.querySelectorAll('button')].map((b: HTMLElement) => b.textContent!.trim());
    expect(buttons).toEqual(expect.arrayContaining(['Back', 'Delete']));
    expect(s.fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('says so when the transaction does not exist', async () => {
    const s = await setup({ id: '404', edit: { status: 404, body: { error: 'not_found' } } });
    expect(s.text()).toContain("That transaction doesn't exist.");
  });
});
