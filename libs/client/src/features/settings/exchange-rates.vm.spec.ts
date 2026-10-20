import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { ExchangeRatesResponse } from '@spacefly/shared';
import { EN, FakeConfirm, formatTestProviders, loadTranslations, RecordingToast } from '../../../testing';
import { exchangeRatesViewModel, normalizeRate, rateText } from './exchange-rates.vm';

const LIST: ExchangeRatesResponse = {
  primary: 'DOP',
  currencies: ['USD', 'EUR'],
  rates: [
    { currency: 'USD', date: '2026-09-01', rate: 61, from: 'USD', to: 'DOP' },
    { currency: 'EUR', date: '2026-08-01', rate: 65.123456789, from: 'EUR', to: 'DOP' },
  ],
};

describe('rate text', () => {
  it('accepts a decimal point or comma and rejects anything that is not a positive number', () => {
    expect(normalizeRate('62.5')).toBe('62.5');
    expect(normalizeRate(' 62,5 ')).toBe('62.5');
    expect(normalizeRate('60')).toBe('60');
    for (const bad of ['', '0', '0.00', '-1', 'abc', '1,234.5', '6 2']) expect(normalizeRate(bad)).toBeNull();
  });

  it('shows a stored rate with up to six decimals and no padding', () => {
    expect(rateText(61)).toBe('61');
    expect(rateText(62.5)).toBe('62.5');
    expect(rateText(65.123456789)).toBe('65.123457');
    expect(rateText(49.9999999999)).toBe('50');
  });
});

describe('exchangeRatesViewModel', () => {
  async function setup() {
    TestBed.configureTestingModule({ providers: [...formatTestProviders('en', EN, { realStores: true }).providers, provideHttpClient(), provideHttpClientTesting()] });
    await loadTranslations('en');
    const http = TestBed.inject(HttpTestingController);
    const vm = TestBed.runInInjectionContext(() => exchangeRatesViewModel());
    TestBed.tick();
    http.expectOne('/api/exchange-rates').flush(LIST);
    await Promise.resolve();
    TestBed.tick();
    return { vm, http, toast: TestBed.inject(RecordingToast), confirm: TestBed.inject(FakeConfirm) };
  }

  it('starts on the first currency and only enables saving a valid rate', async () => {
    const { vm } = await setup();
    expect(vm.currency()).toBe('USD');
    expect(vm.primary()).toBe('DOP');
    expect(vm.canSave()).toBe(false);
    vm.rate.set('abc');
    expect(vm.canSave()).toBe(false);
    vm.rate.set('62,5');
    expect(vm.canSave()).toBe(true);
    vm.date.set('2026-02-31');
    expect(vm.canSave()).toBe(false);
  });

  it('loads a stored rate into the form and says saving will replace it', async () => {
    const { vm } = await setup();
    vm.date.set('2026-09-01');
    expect(vm.replaces()).toBe(true);
    vm.date.set('2026-09-02');
    expect(vm.replaces()).toBe(false);
    vm.edit(LIST.rates[1]!);
    expect([vm.currency(), vm.date(), vm.rate(), vm.replaces()]).toEqual(['EUR', '2026-08-01', '65.123457', true]);
  });

  it('posts the normalized rate, clears the field and reloads the list', async () => {
    const { vm, http, toast } = await setup();
    vm.pick('EUR');
    vm.date.set('2026-10-01');
    vm.rate.set('66,5');
    const done = vm.save();
    const req = http.expectOne({ method: 'POST', url: '/api/exchange-rates' });
    expect(req.request.body).toEqual({ currency: 'EUR', date: '2026-10-01', rate: '66.5' });
    req.flush(null, { status: 201, statusText: 'Created' });
    await done;
    expect(toast.messages).toEqual([{ kind: 'success', message: expect.any(String) }]);
    expect(vm.rate()).toBe('');
    expect(vm.saving()).toBe(false);
    TestBed.tick();
    http.expectOne('/api/exchange-rates').flush({ ...LIST, rates: [{ currency: 'EUR', date: '2026-10-01', rate: 66.5, from: 'EUR', to: 'DOP' }, ...LIST.rates] });
    await Promise.resolve();
    expect(vm.rows()).toHaveLength(3);
  });

  it("shows the server's message and keeps what was typed when the save is refused", async () => {
    const { vm, http } = await setup();
    vm.rate.set('60');
    const done = vm.save();
    http.expectOne('/api/exchange-rates').flush({ error: 'validation', message: 'x', fields: { currency: ['That currency is not enabled in Firefly.'] } }, { status: 422, statusText: 'x' });
    await done;
    expect(vm.error()).toBe('That currency is not enabled in Firefly.');
    expect(vm.rate()).toBe('60');
    expect(vm.saving()).toBe(false);
  });

  it('deletes after confirming, through the stored direction of the pair', async () => {
    const { vm, http, confirm, toast } = await setup();
    const done = vm.remove(LIST.rates[0]!);
    await Promise.resolve();
    expect(confirm.asked[0]).toMatchObject({ destructive: true });
    expect(confirm.asked[0]!.message).toContain('USD');
    await Promise.resolve();
    http.expectOne({ method: 'DELETE', url: '/api/exchange-rates/USD/DOP/2026-09-01' }).flush(null, { status: 204, statusText: 'No Content' });
    await done;
    expect(toast.messages[0]!.kind).toBe('success');
  });

  it('deletes nothing when the confirmation is declined', async () => {
    const { vm, http, confirm } = await setup();
    confirm.answer = false;
    await vm.remove(LIST.rates[0]!);
    http.expectNone({ method: 'DELETE' });
  });
});
