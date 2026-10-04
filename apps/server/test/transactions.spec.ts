import { describe, expect, it } from 'vitest';
import type { EditorLookups, Report, TxEditPayload, TxListResponse, TxWriteResult, MonthlyReport } from '@shared';
import { call, login, setup, writesTo } from './harness';

const base = {
  description: 'Café',
  date: '2026-09-20',
  source: { id: '1' },
  destination: { id: '20' },
  amount: '150.50',
  foreignAmount: null,
  foreignCurrency: null,
  category: null,
  budgetId: null,
  billId: null,
  tags: [] as string[],
  notes: null,
};

const split = (id: string, amount: string) => ({
  transaction_journal_id: id,
  type: 'withdrawal',
  date: '2026-09-15T12:00:00-04:00',
  description: `part ${id}`,
  amount,
  currency_code: 'DOP',
  primary_currency_code: 'DOP',
  source_id: '1',
  source_name: 'Banco Popular',
  source_type: 'Asset account',
  destination_id: '20',
  destination_name: 'Supermercado Nacional',
  destination_type: 'Expense account',
  tags: [],
});
const SPLIT_GROUP = { type: 'transactions', id: 'gMulti', attributes: { group_title: 'Compra grande', transactions: [split('901', '100.00'), split('902', '50.00')] } };
const OPENING = {
  type: 'transactions',
  id: 'gOpening',
  attributes: { group_title: null, transactions: [{ ...split('903', '5000.00'), type: 'opening balance', source_name: 'Banco (opening balance)', source_type: 'Initial balance account' }] },
};

async function start(extra: unknown[] = []) {
  const ctx = setup({}, undefined, extra);
  const cookie = await login(ctx.app);
  return { ...ctx, cookie, post: (b: unknown) => call(ctx.app, cookie, 'POST', '/api/transactions', b) };
}

describe('editor lookups', () => {
  it('lists every kind of active account, with currencies and the default account', async () => {
    const { app, cookie } = await start();
    const res = await call(app, cookie, 'GET', '/api/lookups/editor');
    expect(res.status).toBe(200);
    const body = (await res.json()) as EditorLookups;
    expect(body.accounts.map((a) => [a.id, a.kind]).sort()).toEqual(
      [['1', 'asset'], ['2', 'asset'], ['3', 'asset'], ['10', 'revenue'], ['11', 'revenue'], ['20', 'expense'], ['21', 'expense'], ['22', 'expense'], ['23', 'expense']].sort(),
    );
    expect(body.accounts.find((a) => a.id === '2')).toMatchObject({ currency: 'USD', name: 'Cuenta USD' });
    expect(body.defaultAccountId).toBe('1');
    expect(body.currencies.map((c) => c.code)).toEqual(['DOP', 'USD']);
    expect(body.bills).toEqual([{ id: '1', name: 'Luz', currency: 'DOP', active: true }]);
    expect(body.categories.map((c) => c.name)).toContain('Comida');
    expect(body.budgets.map((b) => b.name)).toEqual(['Hogar', 'Ocio', 'Viajes']);
  });
});

describe('creating transactions', () => {
  it('deduces the type, always runs rules and webhooks, and never sends a client type', async () => {
    const { post, log } = await start();
    const res = await post({ ...base, category: 'Comida', budgetId: '1', billId: '1', tags: ['hogar'], notes: 'nota' });
    expect(res.status).toBe(201);
    const result = (await res.json()) as TxWriteResult;
    expect(result.type).toBe('withdrawal');
    const [w] = writesTo(log, 'POST');
    expect(w!.path).toBe('/api/v1/transactions');
    expect(w!.body).toMatchObject({ apply_rules: true, fire_webhooks: true });
    expect(w!.body!['transactions'][0]).toMatchObject({
      type: 'withdrawal',
      date: '2026-09-20T12:00:00',
      amount: '150.50',
      currency_code: 'DOP',
      source_id: '1',
      destination_id: '20',
      category_name: 'Comida',
      budget_id: '1',
      bill_id: '1',
      tags: ['hogar'],
      notes: 'nota',
    });
    expect(w!.body!['transactions'][0]).not.toHaveProperty('foreign_amount');
  });

  it('sends a new merchant as destination_name and a new source as source_name', async () => {
    const { post, log } = await start();
    expect(((await (await post({ ...base, destination: { name: 'Panadería Nueva' } })).json()) as TxWriteResult).type).toBe('withdrawal');
    expect(((await (await post({ ...base, source: { name: 'Cliente Nuevo' }, destination: { id: '1' } })).json()) as TxWriteResult).type).toBe('deposit');
    const [a, b] = writesTo(log, 'POST').map((r) => r.body!['transactions'][0]);
    expect(a).toMatchObject({ type: 'withdrawal', destination_name: 'Panadería Nueva', source_id: '1' });
    expect(a).not.toHaveProperty('destination_id');
    expect(b).toMatchObject({ type: 'deposit', source_name: 'Cliente Nuevo', destination_id: '1' });
  });

  it('reuses an existing account when the typed name matches', async () => {
    const { post, log } = await start();
    await post({ ...base, destination: { name: 'netflix' } });
    expect(writesTo(log, 'POST')[0]!.body!['transactions'][0]).toMatchObject({ destination_id: '21' });
  });

  it('rejects new → new and impossible account pairs with a 422 on destination, without calling Firefly', async () => {
    const { post, log } = await start();
    for (const pair of [
      { source: { name: 'Nadie' }, destination: { name: 'Nada' } },
      { source: { id: '10' }, destination: { id: '20' } }, // revenue → expense
      { source: { id: '20' }, destination: { id: '1' } }, // expense → asset
    ]) {
      const res = await post({ ...base, ...pair });
      expect(res.status).toBe(422);
      expect(await res.json()).toMatchObject({ error: 'validation', fields: { destination: [expect.any(String)] } });
    }
    expect(writesTo(log)).toHaveLength(0);
  });

  it('creates transfers and requires the received amount between different currencies', async () => {
    const { post, log } = await start();
    const same = await post({ ...base, source: { id: '1' }, destination: { id: '3' } });
    expect(((await same.json()) as TxWriteResult).type).toBe('transfer');
    expect(writesTo(log, 'POST')[0]!.body!['transactions'][0]).not.toHaveProperty('foreign_amount');

    const missing = await post({ ...base, source: { id: '1' }, destination: { id: '2' } });
    expect(missing.status).toBe(422);
    expect(await missing.json()).toMatchObject({ fields: { foreignAmount: [expect.any(String)] } });

    const ok = await post({ ...base, source: { id: '1' }, destination: { id: '2' }, amount: '6100', foreignAmount: '100' });
    expect(ok.status).toBe(201);
    expect(writesTo(log, 'POST').at(-1)!.body!['transactions'][0]).toMatchObject({
      type: 'transfer',
      currency_code: 'DOP',
      amount: '6100',
      foreign_amount: '100',
      foreign_currency_code: 'USD',
    });
  });

  it('puts income in the destination currency and validates "other currency"', async () => {
    const { post, log } = await start();
    const deposit = await post({ ...base, source: { id: '11' }, destination: { id: '2' }, amount: '500' });
    expect(((await deposit.json()) as TxWriteResult).type).toBe('deposit');
    expect(writesTo(log, 'POST')[0]!.body!['transactions'][0]).toMatchObject({ currency_code: 'USD' });

    const foreign = await post({ ...base, foreignAmount: '10', foreignCurrency: 'USD' });
    expect(foreign.status).toBe(201);
    expect(writesTo(log, 'POST')[1]!.body!['transactions'][0]).toMatchObject({ foreign_amount: '10', foreign_currency_code: 'USD' });

    const same = await post({ ...base, foreignAmount: '10', foreignCurrency: 'DOP' });
    expect(same.status).toBe(422);
    expect(await same.json()).toMatchObject({ fields: { foreignCurrency: [expect.any(String)] } });
    const unknown = await post({ ...base, foreignAmount: '10', foreignCurrency: 'EUR' });
    expect(unknown.status).toBe(422);
  });

  it('validates the fields it checks itself', async () => {
    const { post } = await start();
    const res = await post({ ...base, description: '  ', amount: '-3', date: '2026-02-31' });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { fields: Record<string, string[]> };
    expect(Object.keys(body.fields).sort()).toEqual(['date', 'description']);
    const amount = await post({ ...base, amount: '0' });
    expect(await amount.json()).toMatchObject({ fields: { amount: [expect.any(String)] } });
    const unknownAccount = await post({ ...base, source: { id: '999' } });
    expect(await unknownAccount.json()).toMatchObject({ fields: { source: [expect.any(String)] } });
  });

  it("translates Firefly's 422 to the DTO fields", async () => {
    const { post } = await start();
    const res = await post({ ...base, budgetId: '999' });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ error: 'validation', fields: { budgetId: [expect.any(String)] } });
  });

  it('ignores budget and subscription on anything but expenses', async () => {
    const { post, log } = await start();
    await post({ ...base, source: { id: '1' }, destination: { id: '3' }, budgetId: '1', billId: '1' });
    const t = writesTo(log, 'POST')[0]!.body!['transactions'][0];
    expect(t).not.toHaveProperty('budget_id');
    expect(t).not.toHaveProperty('bill_id');
  });

  it('simulated rules run when apply_rules is true', async () => {
    const { post, app, cookie } = await start();
    const res = (await (await post({ ...base, description: 'Compra regla especial' })).json()) as TxWriteResult;
    const edit = (await (await call(app, cookie, 'GET', `/api/transactions/${res.groupId}`)).json()) as TxEditPayload;
    expect(edit.tags).toContain('regla-aplicada');
  });
});

describe('the time of a transaction', () => {
  it('sends the chosen time with the date, and noon when there is none', async () => {
    const { post, log } = await start();
    await post({ ...base, time: '18:45' });
    await post({ ...base, time: null });
    const [withTime, withoutTime] = writesTo(log, 'POST').map((r) => r.body!['transactions'][0]);
    expect(withTime.date).toBe('2026-09-20T18:45:00');
    expect(withoutTime.date).toBe('2026-09-20T12:00:00');
  });

  it('rejects a time that is not HH:mm', async () => {
    const { post, log } = await start();
    for (const time of ['24:00', '9:30', '12:60', 'noon']) {
      const res = await post({ ...base, time });
      expect(res.status, time).toBe(422);
      expect(await res.json()).toMatchObject({ fields: { time: [expect.any(String)] } });
    }
    expect(writesTo(log)).toHaveLength(0);
  });

  it('loads the stored time into the edit payload', async () => {
    const { app, cookie } = await start();
    const rows = (await (await call(app, cookie, 'GET', '/api/transactions?start=2026-09-01&end=2026-09-30&category=2')).json()) as Report<TxListResponse>;
    const edit = (await (await call(app, cookie, 'GET', `/api/transactions/${rows.data.rows[0]!.groupId}`)).json()) as TxEditPayload;
    expect(edit.time).toBe('12:00');
  });

  it('keeps the stored moment when neither the day nor the time changed, and uses the new time otherwise', async () => {
    const { app, cookie, log } = await start();
    const rows = (await (await call(app, cookie, 'GET', '/api/transactions?start=2026-09-01&end=2026-09-30&category=2')).json()) as Report<TxListResponse>;
    const row = rows.data.rows.find((r) => r.description === 'Compra quincenal')!;
    const edit = { ...base, description: 'Compra quincenal', date: '2026-09-03' };
    await call(app, cookie, 'PUT', `/api/transactions/${row.groupId}`, { ...edit, time: '12:00' });
    await call(app, cookie, 'PUT', `/api/transactions/${row.groupId}`, { ...edit, time: '07:15' });
    await call(app, cookie, 'PUT', `/api/transactions/${row.groupId}`, { ...edit, date: '2026-09-04', time: '07:15' });
    const dates = writesTo(log, 'PUT').map((r) => r.body!['transactions'][0].date);
    expect(dates).toEqual(['2026-09-03T12:00:00-04:00', '2026-09-03T07:15:00', '2026-09-04T07:15:00']);
  });
});

describe('editing transactions', () => {
  it('loads the edit payload', async () => {
    const { app, cookie } = await start();
    const rows = (await (await call(app, cookie, 'GET', '/api/transactions?start=2026-09-01&end=2026-09-30&category=2')).json()) as Report<TxListResponse>;
    const row = rows.data.rows.find((r) => r.description === 'Compra quincenal')!;
    expect(row.splitCount).toBe(1);
    const res = await call(app, cookie, 'GET', `/api/transactions/${row.groupId}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      groupId: row.groupId,
      type: 'withdrawal',
      description: 'Compra quincenal',
      date: '2026-09-03',
      amount: '8500.00',
      currency: 'DOP',
      source: { id: '1', name: 'Banco Popular', kind: 'asset' },
      destination: { id: '20', kind: 'expense' },
      category: 'Comida',
      budgetId: '1',
      tags: ['hogar'],
    });
  });

  it('keeps the original time when the day did not change and clears emptied fields explicitly', async () => {
    const { app, cookie, log } = await start();
    const rows = (await (await call(app, cookie, 'GET', '/api/transactions?start=2026-09-01&end=2026-09-30&category=2')).json()) as Report<TxListResponse>;
    const row = rows.data.rows.find((r) => r.description === 'Compra quincenal')!;
    const res = await call(app, cookie, 'PUT', `/api/transactions/${row.groupId}`, {
      ...base,
      description: 'Compra quincenal',
      date: '2026-09-03',
      amount: '9000',
      category: null,
      budgetId: null,
      tags: [],
      notes: null,
    });
    expect(res.status).toBe(200);
    const [put] = writesTo(log, 'PUT');
    expect(put!.path).toBe(`/api/v1/transactions/${row.groupId}`);
    expect(put!.body).toMatchObject({ apply_rules: true, fire_webhooks: true });
    expect(put!.body!['transactions'][0]).toMatchObject({
      transaction_journal_id: row.id,
      type: 'withdrawal',
      date: '2026-09-03T12:00:00-04:00',
      amount: '9000',
      category_name: '',
      budget_id: null,
      bill_id: null,
      tags: [],
      notes: '',
      foreign_amount: null,
    });
    const after = (await (await call(app, cookie, 'GET', `/api/transactions/${row.groupId}`)).json()) as TxEditPayload;
    expect(after).toMatchObject({ amount: '9000', category: null, budgetId: null, tags: [] });
  });

  it('sends a new date at noon and accepts a type change', async () => {
    const { app, cookie, log } = await start();
    const rows = (await (await call(app, cookie, 'GET', '/api/transactions?start=2026-09-01&end=2026-09-30&category=2')).json()) as Report<TxListResponse>;
    const row = rows.data.rows.find((r) => r.description === 'Compra quincenal')!;
    const res = await call(app, cookie, 'PUT', `/api/transactions/${row.groupId}`, {
      ...base,
      description: 'Ahora transferencia',
      date: '2026-09-05',
      destination: { id: '3' },
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as TxWriteResult).type).toBe('transfer');
    expect(writesTo(log, 'PUT')[0]!.body!['transactions'][0]).toMatchObject({ type: 'transfer', date: '2026-09-05T12:00:00' });
  });

  it('answers 409 for several parts or non-editable types, and never sends the PUT', async () => {
    const { app, cookie, log } = await start([SPLIT_GROUP, OPENING]);
    const get = await call(app, cookie, 'GET', '/api/transactions/gMulti');
    expect(get.status).toBe(409);
    expect(await get.json()).toMatchObject({ error: 'not_editable', reason: 'splits' });
    const put = await call(app, cookie, 'PUT', '/api/transactions/gMulti', base);
    expect(put.status).toBe(409);
    const opening = await call(app, cookie, 'PUT', '/api/transactions/gOpening', base);
    expect(opening.status).toBe(409);
    expect(await opening.json()).toMatchObject({ reason: 'type' });
    expect(writesTo(log, 'PUT')).toHaveLength(0);
  });

  it('exposes the part count on list rows', async () => {
    const { app, cookie } = await start([SPLIT_GROUP]);
    const rows = (await (await call(app, cookie, 'GET', '/api/transactions?start=2026-09-01&end=2026-09-30')).json()) as Report<TxListResponse>;
    expect(rows.data.rows.filter((r) => r.groupId === 'gMulti').map((r) => r.splitCount)).toEqual([2, 2]);
    expect(rows.data.rows.find((r) => r.groupId !== 'gMulti')!.splitCount).toBe(1);
  });

  it('returns 404 for an unknown transaction', async () => {
    const { app, cookie } = await start();
    expect((await call(app, cookie, 'GET', '/api/transactions/nope')).status).toBe(404);
    expect((await call(app, cookie, 'PUT', '/api/transactions/nope', base)).status).toBe(404);
    expect((await call(app, cookie, 'DELETE', '/api/transactions/nope')).status).toBe(404);
  });
});

describe('deleting transactions', () => {
  it('answers 204 and the transaction is gone', async () => {
    const { app, cookie, log } = await start([SPLIT_GROUP]);
    const rows = (await (await call(app, cookie, 'GET', '/api/transactions?start=2026-09-01&end=2026-09-30&category=2')).json()) as Report<TxListResponse>;
    const row = rows.data.rows[0]!;
    const del = await call(app, cookie, 'DELETE', `/api/transactions/${row.groupId}`);
    expect(del.status).toBe(204);
    expect(writesTo(log, 'DELETE')[0]!.path).toBe(`/api/v1/transactions/${row.groupId}`);
    expect((await call(app, cookie, 'GET', `/api/transactions/${row.groupId}`)).status).toBe(404);
    // A group with several parts can still be deleted.
    expect((await call(app, cookie, 'DELETE', '/api/transactions/gMulti')).status).toBe(204);
  });
});

describe('cache invalidation after writes', () => {
  it('shows the change in the next report and keeps untouched months cached', async () => {
    const { app, cookie, log, post } = await start();
    const q = '/api/reports/monthly?start=2026-09-01&end=2026-09-30';
    const before = (await (await call(app, cookie, 'GET', q)).json()) as Report<MonthlyReport>;
    const monthFetches = (month: string) => log.urls.filter((u) => u.startsWith('/api/v1/transactions?') && u.includes(`start=${month}-01`)).length;
    const augBefore = monthFetches('2026-08');
    const sepBefore = monthFetches('2026-09');
    expect(augBefore).toBe(1);
    expect(sepBefore).toBe(1);

    expect((await post({ ...base, amount: '1000' })).status).toBe(201);
    const after = (await (await call(app, cookie, 'GET', q)).json()) as Report<MonthlyReport>;
    expect(after.data.kpis.spent).toBeCloseTo(before.data.kpis.spent + 1000, 2);
    expect(monthFetches('2026-09')).toBe(sepBefore + 1);
    expect(monthFetches('2026-08')).toBe(augBefore);
  });
});

describe('description suggestions', () => {
  it('lists descriptions already used that contain the text, without repeats', async () => {
    const { app, cookie, post } = await start();
    await post({ ...base, description: 'Compra rápida' }); // a second "Compra rápida" next to the fixture's
    const res = await call(app, cookie, 'GET', '/api/lookups/descriptions?q=compra');
    expect(res.status).toBe(200);
    const list = (await res.json()) as string[];
    expect(list).toEqual(['Compra quincenal', 'Compra rápida']);
  });

  it('matches anywhere in the text and ignores case', async () => {
    const { app, cookie } = await start();
    const list = (await (await call(app, cookie, 'GET', '/api/lookups/descriptions?q=N%C3%93MINA')).json()) as string[];
    expect(list.map((d) => d.toLowerCase())).toEqual(expect.arrayContaining(['nómina septiembre']));
  });

  it('needs some text to search for', async () => {
    const { app, cookie } = await start();
    expect((await call(app, cookie, 'GET', '/api/lookups/descriptions?q=')).status).toBe(400);
    expect((await call(app, cookie, 'GET', '/api/lookups/descriptions')).status).toBe(400);
  });

  it('answers with nothing when nothing matches', async () => {
    const { app, cookie } = await start();
    expect(await (await call(app, cookie, 'GET', '/api/lookups/descriptions?q=zzzz')).json()).toEqual([]);
  });
});
