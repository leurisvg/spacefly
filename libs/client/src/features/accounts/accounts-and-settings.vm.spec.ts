import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EN, formatTestProviders, loadTranslations, RecordingToast } from '../../../testing';
import { accountsViewModel, dropId, moveId } from './accounts.vm';
import { loginErrorKey, loginViewModel } from '../settings/login.vm';
import { preferencesViewModel } from '../settings/preferences.vm';
import { settingsViewModel, toggleId } from '../settings/settings.vm';
import { signal } from '@angular/core';
import { KeyValueStorage } from '../../platform/key-value-storage';
import { RecordingAuthPlatform, RecordingThemeHost } from '../../../testing';
import { setPaletteTheme } from '../../charts/palette';

describe('account order', () => {
  const order = ['a', 'b', 'c', 'd'];

  it('moves one place and stops at the ends', () => {
    expect(moveId(order, 'b', -1)).toEqual(['b', 'a', 'c', 'd']);
    expect(moveId(order, 'c', 1)).toEqual(['a', 'b', 'd', 'c']);
    expect(moveId(order, 'a', -1)).toEqual(order);
    expect(moveId(order, 'd', 1)).toEqual(order);
    expect(moveId(order, 'zz', 1)).toEqual(order);
  });

  it('drops after the target when dragging down and before it when dragging up', () => {
    expect(dropId(order, 'a', 'c')).toEqual(['b', 'c', 'a', 'd']);
    expect(dropId(order, 'd', 'b')).toEqual(['a', 'd', 'b', 'c']);
    expect(dropId(order, 'b', 'b')).toEqual(order);
  });
});

describe('accountsViewModel', () => {
  const report = {
    data: {
      months: ['2026-08', '2026-09'],
      total: 300,
      accounts: [
        { id: '1', name: 'Banco', income: 10, expense: 4, balance: 100, balanceOriginal: 100, currency: 'DOP', role: null, excluded: false },
        { id: '2', name: 'Ahorros', income: 5, expense: 1, balance: 200, balanceOriginal: 200, currency: 'DOP', role: null, excluded: false },
      ],
      history: [
        { id: '1', name: 'Banco', balances: [90, 100] },
        { id: '2', name: 'Ahorros', balances: [180, 200] },
      ],
    },
    meta: {},
  };

  async function setup() {
    TestBed.configureTestingModule({ providers: [...formatTestProviders('en', EN, { realStores: true }).providers, provideHttpClient(), provideHttpClientTesting()] });
    await loadTranslations('en');
    const http = TestBed.inject(HttpTestingController);
    const vm = TestBed.runInInjectionContext(() => accountsViewModel());
    TestBed.tick();
    http.expectOne((r) => r.url === '/api/reports/accounts' && r.params.get('months') === '12').flush(report);
    await Promise.resolve();
    TestBed.tick();
    return { vm, http, toast: TestBed.inject(RecordingToast) };
  }

  it('totals income and expense and keeps the chart in the table’s order', async () => {
    const { vm } = await setup();
    expect(vm.rows().map((a) => a.id)).toEqual(['1', '2']);
    expect([vm.income(), vm.expense()]).toEqual([15, 5]);
    expect(vm.table()?.rows.map((r) => r[0])).toEqual(['Banco', 'Ahorros']);
    vm.move('2', -1);
    TestBed.tick();
    expect(vm.rows().map((a) => a.id)).toEqual(['2', '1']);
    expect(vm.table()?.rows.map((r) => r[0])).toEqual(['Ahorros', 'Banco']);
  });

  it('saves a new order and reports a failure', async () => {
    const { vm, http, toast } = await setup();
    vm.move('2', -1);
    const req = http.expectOne({ method: 'PUT', url: '/api/settings/account-order' });
    expect(req.request.body).toEqual({ order: ['2', '1'] });
    req.flush(null, { status: 500, statusText: 'x' });
    await vi.waitFor(() => expect(toast.messages).toHaveLength(1));
    expect(toast.messages[0].kind).toBe('error');
  });

  it('does not save a move that changes nothing', async () => {
    const { vm, http } = await setup();
    vm.move('1', -1);
    http.expectNone('/api/settings/account-order');
  });
});

describe('settings', () => {
  it('toggles ids in a set', () => {
    expect(toggleId(['1'], '2', true)).toEqual(['1', '2']);
    expect(toggleId(['1', '2'], '1', false)).toEqual(['2']);
    expect(toggleId(['1'], '1', true)).toEqual(['1']);
  });

  it('saves the draft and refreshes the reports', async () => {
    TestBed.configureTestingModule({ providers: [...formatTestProviders('en', EN, { realStores: true }).providers, provideHttpClient(), provideHttpClientTesting()] });
    await loadTranslations('en');
    const http = TestBed.inject(HttpTestingController);
    const vm = TestBed.runInInjectionContext(() => settingsViewModel());
    TestBed.tick();
    http.expectOne('/api/settings').flush({ settings: { excludedAccounts: ['1'], balanceMonths: 12, sankeyThreshold: 0.02 }, accounts: [{ id: '1', name: 'Banco', currency: 'DOP', role: null }], rates: [] });
    await Promise.resolve();
    TestBed.tick();
    vm.toggleExcluded('2', true);
    vm.patch({ balanceMonths: 6 });
    expect(vm.draft()).toMatchObject({ excludedAccounts: ['1', '2'], balanceMonths: 6 });
    const done = vm.save();
    const put = http.expectOne({ method: 'PUT', url: '/api/settings' });
    expect(put.request.body).toMatchObject({ balanceMonths: 6 });
    put.flush(null);
    await done;
    expect(TestBed.inject(RecordingToast).messages[0].kind).toBe('success');
    expect(vm.saving()).toBe(false);
  });
});

describe('login', () => {
  it('maps unknown error codes to the generic message', () => {
    expect([undefined, 'invalid_state', 'access_denied', 'weird'].map(loginErrorKey)).toEqual(['generic', 'invalid_state', 'access_denied', 'generic']);
  });

  it('signs in through the platform with the return path', async () => {
    TestBed.configureTestingModule({ providers: [...formatTestProviders('en', EN, { realStores: true }).providers, provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    const vm = TestBed.runInInjectionContext(() => loginViewModel({ returnTo: signal('/accounts'), error: signal('access_denied') }));
    expect(vm.errorKey()).toBe('access_denied');
    const done = vm.login();
    expect(vm.busy()).toBe(true);
    await vi.waitFor(() => http.expectOne('/api/me').flush({ authenticated: true, userId: '1' }));
    expect(await done).toBe(true);
    expect(vm.busy()).toBe(false);
    expect(TestBed.inject(RecordingAuthPlatform).logins).toEqual(['/accounts']);
  });
});

describe('preferencesViewModel', () => {
  it('switches the language and remembers it in the platform storage', async () => {
    TestBed.configureTestingModule({ providers: [...formatTestProviders('es', EN, { realStores: true }).providers, provideHttpClient(), provideHttpClientTesting()] });
    await loadTranslations('es');
    const vm = TestBed.runInInjectionContext(() => preferencesViewModel());
    expect(vm.lang()).toBe('es');
    vm.setLang('en');
    expect(vm.lang()).toBe('en');
    expect(TestBed.inject(KeyValueStorage).get('spacefly.lang')).toBe('en');
    vm.setCurrency('USD');
    expect(vm.currency()).toBe('USD');
    vm.privacy.toggle();
    expect(vm.privacy.hidden()).toBe(true);
  });

  it('switches the theme, remembers it and applies it to the host', () => {
    TestBed.configureTestingModule({ providers: [...formatTestProviders('es', EN, { realStores: true }).providers, provideHttpClient(), provideHttpClientTesting()] });
    const vm = TestBed.runInInjectionContext(() => preferencesViewModel());
    expect(vm.themes).toEqual(['midnight', 'earth']);
    expect(vm.theme()).toBe('midnight');
    vm.setTheme('earth');
    expect(vm.theme()).toBe('earth');
    expect(TestBed.inject(KeyValueStorage).get('spacefly.theme')).toBe('earth');
    expect(TestBed.inject(RecordingThemeHost).applied).toEqual(['midnight', 'earth']);
    setPaletteTheme('midnight');
  });
});
