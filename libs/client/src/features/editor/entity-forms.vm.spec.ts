import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EDITOR_LOOKUPS, EN, FakeConfirm, formatTestProviders, loadTranslations, RecordingToast } from '../../../testing';
import { accountFormViewModel, paymentDate } from './account-form.vm';
import { budgetFormViewModel } from './budget-form.vm';
import { categoryFormViewModel } from './category-form.vm';
import { piggyFormViewModel } from './piggy-form.vm';
import { tagFormViewModel } from './tag-form.vm';

async function setup() {
  TestBed.configureTestingModule({ providers: [...formatTestProviders('en', EN, { realStores: true }).providers, provideHttpClient(), provideHttpClientTesting()] });
  await loadTranslations('en');
  const http = TestBed.inject(HttpTestingController);
  const id = signal<string | null>(null);
  const done = vi.fn();
  return { http, id, done, toast: TestBed.inject(RecordingToast), confirm: TestBed.inject(FakeConfirm) };
}

const flush = async () => {
  await Promise.resolve();
  TestBed.tick();
};

describe('entity forms', () => {
  it('creates a category, trimming the name and sending empty notes as null', async () => {
    const { http, id, done, toast } = await setup();
    const vm = TestBed.runInInjectionContext(() => categoryFormViewModel({ id, done }));
    TestBed.tick();
    vm.model.set({ name: '  Mascotas ', notes: ' ' });
    const saving = vm.save();
    const req = http.expectOne((r) => r.method === 'POST' && r.url === '/api/categories');
    expect(req.request.body).toEqual({ name: 'Mascotas', notes: null });
    req.flush({ id: '9' }, { status: 201, statusText: 'Created' });
    await saving;
    expect(done).toHaveBeenCalledTimes(1);
    expect(toast.messages).toEqual([{ kind: 'success', message: 'Category created' }]);
  });

  it('does not save an empty name', async () => {
    const { http, id, done } = await setup();
    const vm = TestBed.runInInjectionContext(() => categoryFormViewModel({ id, done }));
    TestBed.tick();
    await vm.save();
    http.expectNone((r) => r.method === 'POST');
    expect(vm.f.name().errors()[0]?.kind).toBe('required');
    expect(done).not.toHaveBeenCalled();
  });

  it('puts the server’s message on its field', async () => {
    const { http, id, done } = await setup();
    const vm = TestBed.runInInjectionContext(() => categoryFormViewModel({ id, done }));
    TestBed.tick();
    vm.model.set({ name: 'Comida', notes: '' });
    const saving = vm.save();
    http.expectOne('/api/categories').flush({ error: 'validation', message: 'x', fields: { name: ['Already in use.'] } }, { status: 422, statusText: 'Unprocessable' });
    await saving;
    expect(vm.f.name().errors().map((e) => e.message)).toEqual(['Already in use.']);
    expect(done).not.toHaveBeenCalled();
  });

  it('loads a record to edit, and reports a missing one', async () => {
    const { http, id, done } = await setup();
    const vm = TestBed.runInInjectionContext(() => tagFormViewModel({ id, done }));
    TestBed.tick();
    id.set('4');
    TestBed.tick();
    expect(vm.state()).toBe('loading');
    http.expectOne('/api/tags/4').flush({ id: '4', tag: 'viaje', date: null, description: 'x' });
    await flush();
    expect(vm.state()).toBe('ready');
    expect(vm.model()).toEqual({ tag: 'viaje', date: '', description: 'x' });
    id.set('99');
    TestBed.tick();
    http.expectOne('/api/tags/99').flush({ error: 'not_found' }, { status: 404, statusText: 'Not Found' });
    await flush();
    expect(vm.state()).toBe('missing');
  });

  it('asks before deleting and only deletes once confirmed', async () => {
    const { http, id, done, confirm } = await setup();
    const vm = TestBed.runInInjectionContext(() => categoryFormViewModel({ id, done }));
    id.set('4');
    TestBed.tick();
    http.expectOne('/api/categories/4').flush({ id: '4', name: 'Comida', notes: null });
    await flush();
    confirm.answer = false;
    await vm.remove();
    http.expectNone((r) => r.method === 'DELETE');
    expect(confirm.asked[0]).toMatchObject({ destructive: true });
    expect(confirm.asked[0].message).toContain('Comida');
    confirm.answer = true;
    const removing = vm.remove();
    await Promise.resolve();
    http.expectOne((r) => r.method === 'DELETE' && r.url === '/api/categories/4').flush(null, { status: 204, statusText: 'No Content' });
    await removing;
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('sends the automatic budget only when it is on', async () => {
    const { http, id, done } = await setup();
    const vm = TestBed.runInInjectionContext(() => budgetFormViewModel({ id, done }));
    TestBed.tick();
    vm.model.update((m) => ({ ...m, name: 'Hogar', auto: true, autoAmount: '' }));
    await vm.save();
    http.expectNone('/api/budgets');
    expect(vm.f.autoAmount().errors()[0]?.kind).toBe('required');
    vm.model.update((m) => ({ ...m, autoAmount: '5000', auto: true }));
    const saving = vm.save();
    const req = http.expectOne('/api/budgets');
    expect(req.request.body).toMatchObject({ name: 'Hogar', autoBudget: { type: 'reset', amount: '5000', period: 'monthly', currency: 'DOP' } });
    req.flush({ id: '1' }, { status: 201, statusText: 'Created' });
    await saving;
  });

  it('starts a new account as the kind it was opened for, and locks the kind when editing', async () => {
    const { id, done } = await setup();
    const accountType = signal<'asset' | 'expense'>('expense');
    const vm = TestBed.runInInjectionContext(() => accountFormViewModel({ id, done, accountType }));
    TestBed.tick();
    expect(vm.model().type).toBe('expense');
    expect([vm.isAsset(), vm.isOwned()]).toEqual([false, false]);
    accountType.set('asset');
    TestBed.tick();
    expect(vm.isOwned()).toBe(true);
    expect(vm.f.type().disabled()).toBe(false);
  });

  it('puts a card’s payment day inside the current month', () => {
    expect(paymentDate(31)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(paymentDate(0).endsWith('-01')).toBe(true);
    expect(paymentDate(99).slice(0, 7)).toBe(paymentDate(1).slice(0, 7));
  });

  it('lets the first account decide the goal’s currency and never goes below zero when removing money', async () => {
    const { http, id, done } = await setup();
    const vm = TestBed.runInInjectionContext(() => piggyFormViewModel({ id, done }));
    TestBed.tick();
    http.expectOne((r) => r.url === '/api/lookups/editor').flush(EDITOR_LOOKUPS);
    await flush();
    expect(vm.accountOptions().map((o) => o.value)).toEqual(['1', '2']);
    vm.addAccount('2');
    expect(vm.model().currency).toBe('USD');
    expect(vm.accountOptions()).toEqual([]);
    vm.model.update((m) => ({ ...m, accounts: m.accounts.map((a) => ({ ...a, currentAmount: '10.00', adjust: '25' })) }));
    vm.adjust(0, -1);
    expect(vm.model().accounts[0]).toMatchObject({ currentAmount: '0.00', adjust: '' });
    vm.adjust(0, 1); // nothing typed: nothing happens
    expect(vm.model().accounts[0].currentAmount).toBe('0.00');
    vm.removeAccount(0);
    expect(vm.model().accounts).toEqual([]);
  });
});
