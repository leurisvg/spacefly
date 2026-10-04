import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { FiltersStore } from '@spacefly/client/state/filters.store';

@Component({ template: '' })
class Blank {}

async function setup(url = '/') {
  localStorage.clear();
  TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', component: Blank }])] });
  // Like in the app, the store exists before the first navigation ends.
  const store = TestBed.inject(FiltersStore);
  const router = TestBed.inject(Router);
  await router.navigateByUrl(url);
  return { store, router };
}

describe('FiltersStore on the URL query string (web platform)', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-09-15T12:00:00Z') }));
  afterEach(() => vi.useRealTimers());

  it('defaults to the current month in the primary currency', async () => {
    const { store } = await setup();
    expect(store.preset()).toBe('month');
    expect(store.period()).toEqual({ start: '2026-09-01', end: '2026-09-30' });
    expect(store.currency()).toBe('DOP');
  });

  it('reads period, preset and currency from the URL', async () => {
    const { store } = await setup('/x?p=custom&start=2026-01-10&end=2026-02-20&cur=USD');
    expect(store.preset()).toBe('custom');
    expect(store.period()).toEqual({ start: '2026-01-10', end: '2026-02-20' });
    expect(store.currency()).toBe('USD');
  });

  it('ignores invalid params', async () => {
    const { store } = await setup('/x?p=bogus&start=nope&end=2026-01-01&cur=usd');
    expect(store.preset()).toBe('month');
    expect(store.period().start).toBe('2026-09-01');
    expect(store.currency()).toBe('DOP');
  });

  it('ignores an inverted range', async () => {
    const { store } = await setup('/x?p=custom&start=2026-05-10&end=2026-05-01');
    expect(store.period()).toEqual({ start: '2026-09-01', end: '2026-09-30' });
  });

  it('writes presets to the query string and keeps other params', async () => {
    const { store, router } = await setup('/x?foo=bar');
    store.setPreset('quarter', '2026-05-20');
    await vi.waitFor(() => expect(store.period()).toEqual({ start: '2026-04-01', end: '2026-06-30' }));
    expect(store.preset()).toBe('quarter');
    expect(router.url).toContain('foo=bar');
    expect(router.url).toContain('p=quarter');
  });

  it('shifts the period with the arrows', async () => {
    const { store } = await setup('/x?p=month&start=2026-01-01&end=2026-01-31');
    store.shift(-1);
    await vi.waitFor(() => expect(store.period()).toEqual({ start: '2025-12-01', end: '2025-12-31' }));
  });

  it('persists the chosen currency and puts it in the query', async () => {
    const { store } = await setup();
    store.setCurrency('USD');
    await vi.waitFor(() => expect(store.currency()).toBe('USD'));
    TestBed.tick();
    expect(localStorage.getItem('spacefly.currency')).toBe('USD');
    expect(store.query()).toMatchObject({ currency: 'USD', start: '2026-09-01', end: '2026-09-30' });
  });

  it('uses the stored currency when the URL has none', async () => {
    localStorage.setItem('spacefly.currency', 'EUR');
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', component: Blank }])] });
    const store = TestBed.inject(FiltersStore);
    await TestBed.inject(Router).navigateByUrl('/');
    expect(store.currency()).toBe('EUR');
  });

  it('bumps the refresh tick so reports refetch', async () => {
    const { store } = await setup();
    const before = store.query()._r;
    store.refresh();
    expect(store.query()._r).toBe(before + 1);
  });

  it('exposes feature params', async () => {
    const { store } = await setup('/x?mode=tags');
    expect(store.param('mode')()).toBe('tags');
    expect(store.param('missing')()).toBeNull();
  });

  describe('page-scoped period', () => {
    const range = { start: '2026-08-17', end: '2026-09-15' };

    it('wins over the URL and is released without touching it', async () => {
      const { store, router } = await setup('/x?p=quarter&start=2026-07-01&end=2026-09-30');
      const release = store.scopePeriod(range);
      expect(store.preset()).toBe('custom');
      expect(store.period()).toEqual(range);
      expect(store.query()).toMatchObject(range);
      release();
      expect(store.preset()).toBe('quarter');
      expect(store.period()).toEqual({ start: '2026-07-01', end: '2026-09-30' });
      expect(router.url).toBe('/x?p=quarter&start=2026-07-01&end=2026-09-30');
    });

    it('is edited by the picker actions instead of the URL', async () => {
      const { store, router } = await setup('/x');
      const release = store.scopePeriod(range);
      store.setCustom({ start: '2026-09-01', end: '2026-09-10' });
      store.shift(1);
      expect(store.period()).toEqual({ start: '2026-09-11', end: '2026-09-20' });
      store.setPreset('month', '2026-05-20');
      expect(store.preset()).toBe('month');
      expect(store.period()).toEqual({ start: '2026-05-01', end: '2026-05-31' });
      expect(router.url).toBe('/x');
      release();
      expect(store.period()).toEqual({ start: '2026-09-01', end: '2026-09-30' });
    });
  });
});
