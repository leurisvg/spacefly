import { TestBed } from '@angular/core/testing';
import { MemoryFilterParams, MemoryStorage } from '../../testing/fakes';
import { FiltersStore } from './filters.store';

function setup(params: Record<string, string> = {}) {
  const source = TestBed.inject(MemoryFilterParams);
  source.merge(params);
  return { store: TestBed.inject(FiltersStore), source, storage: TestBed.inject(MemoryStorage) };
}

describe('FiltersStore on an in-memory source (mobile platform)', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-09-15T12:00:00Z') }));
  afterEach(() => vi.useRealTimers());

  it('defaults to the current month in the primary currency', () => {
    const { store } = setup();
    expect(store.preset()).toBe('month');
    expect(store.period()).toEqual({ start: '2026-09-01', end: '2026-09-30' });
    expect(store.currency()).toBe('DOP');
  });

  it('reads params from the source and ignores invalid ones', () => {
    const { store } = setup({ p: 'custom', start: '2026-01-10', end: '2026-02-20', cur: 'USD' });
    expect(store.period()).toEqual({ start: '2026-01-10', end: '2026-02-20' });
    expect(store.currency()).toBe('USD');
    store.setParams({ p: 'bogus', start: 'nope', cur: 'usd' });
    expect(store.preset()).toBe('month');
    expect(store.period().start).toBe('2026-09-01');
    expect(store.currency()).toBe('DOP');
  });

  it('writes presets and shifts through the source', () => {
    const { store, source } = setup({ foo: 'bar' });
    store.setPreset('quarter', '2026-05-20');
    expect(store.period()).toEqual({ start: '2026-04-01', end: '2026-06-30' });
    expect(source.params()['foo']).toBe('bar');
    store.setCustom({ start: '2026-01-01', end: '2026-01-31' });
    store.shift(-1);
    expect(store.period()).toEqual({ start: '2025-12-01', end: '2025-12-31' });
  });

  it('removes a param when set to null', () => {
    const { store, source } = setup({ mode: 'tags' });
    expect(store.param('mode')()).toBe('tags');
    store.setParams({ mode: null });
    expect(source.params()['mode']).toBeUndefined();
    expect(store.param('mode')()).toBeNull();
  });

  it('persists the chosen currency in the platform storage', () => {
    const { store, storage } = setup();
    store.setCurrency('USD');
    TestBed.tick();
    expect(store.currency()).toBe('USD');
    expect(storage.get('spacefly.currency')).toBe('USD');
    expect(store.query()).toMatchObject({ currency: 'USD', start: '2026-09-01', end: '2026-09-30' });
  });

  it('uses the stored currency when there is no param', () => {
    TestBed.inject(MemoryStorage).set('spacefly.currency', 'EUR');
    expect(TestBed.inject(FiltersStore).currency()).toBe('EUR');
  });

  it('bumps the refresh tick so reports refetch', () => {
    const { store } = setup();
    const before = store.query()._r;
    store.refresh();
    expect(store.query()._r).toBe(before + 1);
  });
});
