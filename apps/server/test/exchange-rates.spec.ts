import { describe, expect, it } from 'vitest';
import type { ExchangeRatesResponse, SettingsResponse } from '@spacefly/shared';
import { call, login, setup, writesTo } from './harness';

async function start() {
  const ctx = setup();
  const cookie = await login(ctx.app);
  const send = (method: string, path: string, body?: unknown) => call(ctx.app, cookie, method, path, body);
  const list = async () => (await (await send('GET', '/api/exchange-rates')).json()) as ExchangeRatesResponse;
  return { ...ctx, send, list };
}

describe('exchange rates', () => {
  it('lists the stored rates, newest first, with the currencies a rate can be entered for', async () => {
    const { list } = await start();
    const res = await list();
    expect(res.primary).toBe('DOP');
    expect(res.currencies).toEqual(['USD']);
    expect(res.rates.map((r) => [r.currency, r.date, r.rate])).toEqual([
      ['USD', '2026-09-01', 61],
      ['USD', '2026-08-01', 60],
    ]);
  });

  it('adds a rate in the foreign → primary direction and refreshes the list', async () => {
    const { send, list, log } = await start();
    await list(); // primes the cache
    const created = await send('POST', '/api/exchange-rates', { currency: 'USD', date: '2026-10-01', rate: '62.5' });
    expect(created.status).toBe(201);
    const [write] = writesTo(log, 'POST');
    expect(write!.path).toBe('/api/v1/exchange-rates/USD/DOP/2026-10-01');
    expect(write!.body).toEqual({ rate: '62.5' });
    expect((await list()).rates[0]).toMatchObject({ currency: 'USD', date: '2026-10-01', rate: 62.5, from: 'USD', to: 'DOP' });
  });

  it('replaces the rate of a day that already has one instead of failing', async () => {
    const { send, list, log } = await start();
    const res = await send('POST', '/api/exchange-rates', { currency: 'USD', date: '2026-09-01', rate: '63' });
    expect(res.status).toBe(200);
    expect(writesTo(log, 'POST')).toHaveLength(0);
    expect(writesTo(log, 'PUT')[0]).toMatchObject({ path: '/api/v1/exchange-rates/USD/DOP/2026-09-01', body: { rate: '63' } });
    const rates = (await list()).rates.filter((r) => r.date === '2026-09-01');
    expect(rates.map((r) => r.rate)).toEqual([63]);
  });

  it('feeds the conversions: the rates in use on the settings page follow the new rate', async () => {
    const { send } = await start();
    const usd = async () => ((await (await send('GET', '/api/settings')).json()) as SettingsResponse).rates.filter((r) => r.base === 'USD');
    const before = await usd();
    expect(before.length).toBeGreaterThan(0);
    await send('POST', '/api/exchange-rates', { currency: 'USD', date: '2026-09-01', rate: '70' });
    const after = await usd();
    expect(after.at(0)!.rate).toBe(70);
    expect(after.at(0)!.rate).not.toBe(before.at(0)!.rate);
  });

  it('keeps a rate stored the other way round (primary → foreign) in that direction', async () => {
    const { send, list, s } = await start();
    // The fixture stores USD→DOP; delete one and store the inverse by hand through Firefly itself.
    await send('DELETE', '/api/exchange-rates/USD/DOP/2026-09-01');
    await s.fetch('http://firefly:8080/api/v1/exchange-rates/DOP/USD/2026-09-01', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ rate: '0.02' }),
    });
    s.cache.deletePrefix('');
    const inverse = (await list()).rates.find((r) => r.date === '2026-09-01')!;
    expect(inverse).toMatchObject({ currency: 'USD', from: 'DOP', to: 'USD' });
    expect(inverse.rate).toBeCloseTo(50, 6);

    const res = await send('POST', '/api/exchange-rates', { currency: 'USD', date: '2026-09-01', rate: '50' });
    expect(res.status).toBe(200);
    const rows = (await list()).rates.filter((r) => r.date === '2026-09-01');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ from: 'DOP', to: 'USD' });
    expect(rows[0]!.rate).toBeCloseTo(50, 6);
  });

  it('deletes one rate', async () => {
    const { send, list, log } = await start();
    await list();
    expect((await send('DELETE', '/api/exchange-rates/USD/DOP/2026-08-01')).status).toBe(204);
    expect(writesTo(log, 'DELETE')[0]!.path).toBe('/api/v1/exchange-rates/USD/DOP/2026-08-01');
    expect((await list()).rates.map((r) => r.date)).toEqual(['2026-09-01']);
  });

  it('answers 422 for a bad rate, date, or currency', async () => {
    const { send } = await start();
    const bad = (body: unknown) => send('POST', '/api/exchange-rates', body);
    expect((await bad({ currency: 'USD', date: '2026-10-01', rate: '0' })).status).toBe(422);
    expect((await bad({ currency: 'USD', date: '2026-10-01', rate: 'abc' })).status).toBe(422);
    expect((await bad({ currency: 'USD', date: '2026-02-31', rate: '60' })).status).toBe(422);
    expect((await bad({ currency: 'DOP', date: '2026-10-01', rate: '1' })).status).toBe(422);
    expect((await bad({ currency: 'EUR', date: '2026-10-01', rate: '1.1' })).status).toBe(422);
  });

  it('requires the CSRF header', async () => {
    const { app } = await start();
    const cookie = await login(app);
    const res = await app.request('/api/exchange-rates', { method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: '{}' });
    expect(res.status).toBe(403);
  });
});
