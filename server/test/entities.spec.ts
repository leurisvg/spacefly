import { describe, expect, it } from 'vitest';
import type { AccountEditPayload, BillEditPayload, BudgetEditPayload, CategoryEditPayload, EditorLookups, PiggyEditPayload, TagEditPayload, TxWriteResult } from '@shared';
import { call, login, setup, writesTo } from './harness';

async function start() {
  const ctx = setup();
  const cookie = await login(ctx.app);
  const lookups = async () => (await (await call(ctx.app, cookie, 'GET', '/api/lookups/editor')).json()) as EditorLookups;
  return { ...ctx, cookie, lookups, send: (method: string, path: string, body?: unknown) => call(ctx.app, cookie, method, path, body) };
}

describe('categories', () => {
  it('creates, reads, updates and deletes, keeping the lookups fresh', async () => {
    const { send, lookups, log } = await start();
    const before = await lookups(); // primes the cache
    expect(before.categories.map((c) => c.name)).not.toContain('Mascotas');

    const created = await send('POST', '/api/categories', { name: 'Mascotas', notes: 'Perro y gato' });
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    expect(writesTo(log, 'POST')[0]!.body).toEqual({ name: 'Mascotas', notes: 'Perro y gato' });
    expect((await lookups()).categories.map((c) => c.name)).toContain('Mascotas');

    const loaded = (await (await send('GET', `/api/categories/${id}`)).json()) as CategoryEditPayload;
    expect(loaded).toEqual({ id, name: 'Mascotas', notes: 'Perro y gato' });

    const updated = await send('PUT', `/api/categories/${id}`, { name: 'Animales', notes: null });
    expect(updated.status).toBe(200);
    expect(writesTo(log, 'PUT')[0]!.body).toEqual({ name: 'Animales', notes: '' }); // cleared notes are sent explicitly
    expect((await lookups()).categories.map((c) => c.name)).toEqual(expect.arrayContaining(['Animales']));
    expect((await lookups()).categories.map((c) => c.name)).not.toContain('Mascotas');

    expect((await send('DELETE', `/api/categories/${id}`)).status).toBe(204);
    expect((await lookups()).categories.map((c) => c.name)).not.toContain('Animales');
    expect((await send('GET', `/api/categories/${id}`)).status).toBe(404);
  });

  it('answers 422 for an empty or duplicate name', async () => {
    const { send } = await start();
    const empty = await send('POST', '/api/categories', { name: '  ', notes: null });
    expect(empty.status).toBe(422);
    expect(await empty.json()).toMatchObject({ error: 'validation', fields: { name: [expect.any(String)] } });
    const duplicate = await send('POST', '/api/categories', { name: 'comida', notes: null });
    expect(duplicate.status).toBe(422);
    expect(await duplicate.json()).toMatchObject({ fields: { name: [expect.any(String)] } });
  });

  it('renaming to its own name is fine', async () => {
    const { send } = await start();
    const { id } = (await (await send('POST', '/api/categories', { name: 'Solo', notes: null })).json()) as { id: string };
    expect((await send('PUT', `/api/categories/${id}`, { name: 'Solo', notes: 'x' })).status).toBe(200);
  });

  it('requires the CSRF header', async () => {
    const { app, cookie } = await start();
    const res = await app.request('/api/categories', { method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: '{"name":"X"}' });
    expect(res.status).toBe(403);
  });
});

describe('tags', () => {
  it('creates with a date and description, and clears them on update', async () => {
    const { send, lookups, log } = await start();
    const created = await send('POST', '/api/tags', { tag: 'viaje-2027', date: '2027-03-01', description: 'Vacaciones' });
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    expect(writesTo(log, 'POST')[0]!.body).toEqual({ tag: 'viaje-2027', date: '2027-03-01', description: 'Vacaciones' });
    expect((await lookups()).tags.map((t) => t.name)).toContain('viaje-2027');

    const loaded = (await (await send('GET', `/api/tags/${id}`)).json()) as TagEditPayload;
    expect(loaded).toEqual({ id, tag: 'viaje-2027', date: '2027-03-01', description: 'Vacaciones' });

    expect((await send('PUT', `/api/tags/${id}`, { tag: 'viaje', date: null, description: null })).status).toBe(200);
    expect(writesTo(log, 'PUT')[0]!.body).toEqual({ tag: 'viaje', date: null, description: '' });
    expect((await lookups()).tags.map((t) => t.name)).toContain('viaje');

    expect((await send('DELETE', `/api/tags/${id}`)).status).toBe(204);
    expect((await lookups()).tags.map((t) => t.name)).not.toContain('viaje');
  });

  it('validates the name and the date', async () => {
    const { send } = await start();
    const res = await send('POST', '/api/tags', { tag: '', date: '2027-13-40', description: null });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { fields: Record<string, string[]> };
    expect(Object.keys(body.fields).sort()).toEqual(['date', 'tag']);
  });

  it('rejects a duplicate tag', async () => {
    const { send } = await start();
    const res = await send('POST', '/api/tags', { tag: 'hogar', date: null, description: null });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ fields: { tag: [expect.any(String)] } });
  });
});

describe('budgets', () => {
  it('creates with an automatic budget, then switches it off', async () => {
    const { send, lookups, log } = await start();
    const created = await send('POST', '/api/budgets', {
      name: 'Mercado',
      active: true,
      notes: null,
      autoBudget: { type: 'rollover', amount: '15000.50', period: 'monthly', currency: 'DOP' },
    });
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    expect(writesTo(log, 'POST')[0]!.body).toEqual({
      name: 'Mercado',
      active: true,
      auto_budget_type: 'rollover',
      auto_budget_amount: '15000.50',
      auto_budget_period: 'monthly',
      auto_budget_currency_code: 'DOP',
    });
    expect((await lookups()).budgets.map((b) => b.name)).toContain('Mercado');

    const loaded = (await (await send('GET', `/api/budgets/${id}`)).json()) as BudgetEditPayload;
    expect(loaded).toEqual({
      id,
      name: 'Mercado',
      active: true,
      notes: null,
      autoBudget: { type: 'rollover', amount: '15000.50', period: 'monthly', currency: 'DOP' },
    });

    const off = await send('PUT', `/api/budgets/${id}`, { name: 'Mercado', active: false, notes: 'Pausado', autoBudget: null });
    expect(off.status).toBe(200);
    expect(writesTo(log, 'PUT')[0]!.body).toEqual({ name: 'Mercado', active: false, notes: 'Pausado', auto_budget_type: 'none' });
    expect(((await (await send('GET', `/api/budgets/${id}`)).json()) as BudgetEditPayload)).toMatchObject({ active: false, notes: 'Pausado', autoBudget: null });

    expect((await send('DELETE', `/api/budgets/${id}`)).status).toBe(204);
    expect((await lookups()).budgets.map((b) => b.name)).not.toContain('Mercado');
  });

  it('validates the automatic budget and rejects duplicates', async () => {
    const { send } = await start();
    const bad = await send('POST', '/api/budgets', { name: 'X', active: true, notes: null, autoBudget: { type: 'reset', amount: '0', period: 'monthly', currency: 'DOP' } });
    expect(bad.status).toBe(422);
    expect(await bad.json()).toMatchObject({ fields: { autoBudget: [expect.any(String)] } });
    const duplicate = await send('POST', '/api/budgets', { name: 'hogar', active: true, notes: null, autoBudget: null });
    expect(duplicate.status).toBe(422);
    expect(await duplicate.json()).toMatchObject({ fields: { name: [expect.any(String)] } });
  });
});

describe('subscriptions (bills)', () => {
  const bill = {
    name: 'Spotify',
    amountMin: '10.99',
    amountMax: '10.99',
    currency: 'USD',
    date: '2026-10-05',
    repeatFreq: 'monthly',
    skip: 0,
    endDate: null,
    active: true,
    group: null,
    notes: null,
  };

  it('reads an existing subscription as a form payload', async () => {
    const { send } = await start();
    const loaded = (await (await send('GET', '/api/bills/1')).json()) as BillEditPayload;
    expect(loaded).toEqual({
      id: '1',
      name: 'Luz',
      amountMin: '3000.00',
      amountMax: '3400.00',
      currency: 'DOP',
      date: '2026-01-20',
      repeatFreq: 'monthly',
      skip: 0,
      endDate: null,
      active: true,
      group: null,
      notes: null,
    });
  });

  it('creates, updates (clearing the end date) and deletes', async () => {
    const { send, lookups, log } = await start();
    await lookups();
    const created = await send('POST', '/api/bills', { ...bill, endDate: '2027-10-05', group: 'Streaming', notes: 'Familiar' });
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    expect(writesTo(log, 'POST')[0]!.body).toEqual({
      name: 'Spotify',
      amount_min: '10.99',
      amount_max: '10.99',
      currency_code: 'USD',
      date: '2026-10-05',
      repeat_freq: 'monthly',
      skip: 0,
      active: true,
      end_date: '2027-10-05',
      object_group_title: 'Streaming',
      notes: 'Familiar',
    });
    expect((await lookups()).bills.map((b) => b.name)).toContain('Spotify');

    const updated = await send('PUT', `/api/bills/${id}`, { ...bill, amountMax: '12.99', endDate: null, group: null, notes: null, active: false });
    expect(updated.status).toBe(200);
    expect(writesTo(log, 'PUT')[0]!.body).toMatchObject({ amount_max: '12.99', end_date: null, object_group_title: '', notes: '', active: false });
    const after = (await (await send('GET', `/api/bills/${id}`)).json()) as BillEditPayload;
    expect(after).toMatchObject({ amountMax: '12.99', endDate: null, active: false, group: null });
    expect((await lookups()).bills.find((b) => b.id === id)).toMatchObject({ active: false });

    expect((await send('DELETE', `/api/bills/${id}`)).status).toBe(204);
    expect((await lookups()).bills.map((b) => b.name)).not.toContain('Spotify');
  });

  it('checks the amount range and the end date before calling Firefly', async () => {
    const { send, log } = await start();
    const range = await send('POST', '/api/bills', { ...bill, amountMin: '20', amountMax: '10' });
    expect(range.status).toBe(422);
    expect(await range.json()).toMatchObject({ fields: { amountMax: [expect.any(String)] } });
    const end = await send('POST', '/api/bills', { ...bill, endDate: '2026-10-05' });
    expect(end.status).toBe(422);
    expect(await end.json()).toMatchObject({ fields: { endDate: [expect.any(String)] } });
    const badSkip = await send('POST', '/api/bills', { ...bill, skip: 99 });
    expect(badSkip.status).toBe(422);
    expect(writesTo(log)).toHaveLength(0);
  });

  it('translates which field Firefly rejects', async () => {
    const { send } = await start();
    const res = await send('POST', '/api/bills', { ...bill, name: 'luz' }); // duplicate of "Luz"
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ fields: { name: [expect.any(String)] } });
  });
});

const account = {
  type: 'asset',
  name: 'Cuenta nueva',
  active: true,
  iban: null,
  notes: null,
  currency: 'DOP',
  includeNetWorth: true,
  role: 'savingAsset',
  creditCardType: null,
  monthlyPaymentDate: null,
  openingBalance: null,
  openingBalanceDate: null,
  liabilityType: null,
  liabilityDirection: null,
  interest: null,
  interestPeriod: null,
};

describe('accounts', () => {
  it('creates an asset account with an opening balance and offers it to the editors', async () => {
    const { send, lookups, log } = await start();
    await lookups();
    const created = await send('POST', '/api/accounts', { ...account, iban: 'DO28BAGR00000001212453611324', openingBalance: '2500.50', openingBalanceDate: '2026-01-01' });
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    expect(writesTo(log, 'POST')[0]!.body).toEqual({
      type: 'asset',
      name: 'Cuenta nueva',
      active: true,
      iban: 'DO28BAGR00000001212453611324',
      include_net_worth: true,
      currency_code: 'DOP',
      opening_balance: '2500.50',
      opening_balance_date: '2026-01-01',
      account_role: 'savingAsset',
    });
    expect((await lookups()).accounts.find((a) => a.id === id)).toMatchObject({ name: 'Cuenta nueva', kind: 'asset', currency: 'DOP', role: 'savingAsset' });
  });

  it('creates a credit card with its payment date', async () => {
    const { send, log } = await start();
    const res = await send('POST', '/api/accounts', { ...account, name: 'Visa 2', role: 'ccAsset', creditCardType: 'monthlyFull', monthlyPaymentDate: '2026-10-15' });
    expect(res.status).toBe(201);
    expect(writesTo(log, 'POST')[0]!.body).toMatchObject({ account_role: 'ccAsset', credit_card_type: 'monthlyFull', monthly_payment_date: '2026-10-15' });
  });

  it('creates a liability and reads it back', async () => {
    const { send, log } = await start();
    const created = await send('POST', '/api/accounts', {
      ...account,
      type: 'liability',
      name: 'Hipoteca',
      role: null,
      liabilityType: 'mortgage',
      liabilityDirection: 'debit',
      interest: '7.5',
      interestPeriod: 'yearly',
      openingBalance: '2000000',
      openingBalanceDate: '2026-02-01',
    });
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    expect(writesTo(log, 'POST')[0]!.body).toMatchObject({
      type: 'liability',
      liability_type: 'mortgage',
      liability_direction: 'debit',
      interest: '7.5',
      interest_period: 'yearly',
      opening_balance: '2000000',
    });
    const loaded = (await (await send('GET', `/api/accounts/${id}`)).json()) as AccountEditPayload;
    expect(loaded).toMatchObject({ type: 'liability', name: 'Hipoteca', liabilityType: 'mortgage', liabilityDirection: 'debit', interest: '7.5', interestPeriod: 'yearly', role: null, transactionCount: 0 });
  });

  it('creates expense and revenue accounts with nothing but the basics', async () => {
    const { send, log } = await start();
    for (const type of ['expense', 'revenue'] as const) {
      const res = await send('POST', '/api/accounts', { ...account, type, name: `Cuenta ${type}`, currency: null, role: null, includeNetWorth: false });
      expect(res.status).toBe(201);
    }
    const bodies = writesTo(log, 'POST').map((r) => r.body);
    expect(bodies[0]).toEqual({ type: 'expense', name: 'Cuenta expense', active: true });
    expect(bodies[1]).toEqual({ type: 'revenue', name: 'Cuenta revenue', active: true });
  });

  it('requires what each type needs', async () => {
    const { send, log } = await start();
    const noRole = await send('POST', '/api/accounts', { ...account, role: null });
    expect(noRole.status).toBe(422);
    expect(await noRole.json()).toMatchObject({ fields: { role: [expect.any(String)] } });
    const card = await send('POST', '/api/accounts', { ...account, role: 'ccAsset' });
    expect(Object.keys(((await card.json()) as { fields: object }).fields).sort()).toEqual(['creditCardType', 'monthlyPaymentDate']);
    const debt = await send('POST', '/api/accounts', { ...account, type: 'liability', role: null });
    expect(Object.keys(((await debt.json()) as { fields: object }).fields).sort()).toEqual(['interest', 'interestPeriod', 'liabilityDirection', 'liabilityType']);
    const balance = await send('POST', '/api/accounts', { ...account, openingBalance: '10' });
    expect(await balance.json()).toMatchObject({ fields: { openingBalanceDate: [expect.any(String)] } });
    expect(writesTo(log)).toHaveLength(0);
  });

  it('counts the transactions that deleting the account would delete, and deletes them', async () => {
    const { send, app, cookie } = await start();
    const loaded = (await (await send('GET', '/api/accounts/3')).json()) as AccountEditPayload;
    expect(loaded).toMatchObject({ id: '3', name: 'Tarjeta Visa', type: 'asset', role: 'ccAsset', currency: 'DOP' });
    expect(loaded.transactionCount).toBeGreaterThan(0);
    expect((await send('DELETE', '/api/accounts/3')).status).toBe(204);
    const rows = (await (await send('GET', '/api/transactions?start=2026-09-01&end=2026-09-30')).json()) as { data: { rows: { source: { id: string }; destination: { id: string } }[] } };
    expect(rows.data.rows.some((r) => r.source.id === '3' || r.destination.id === '3')).toBe(false);
    expect((await app.request('/api/accounts/3', { headers: { cookie } })).status).toBe(404);
  });

  it('updates an account and clears its notes', async () => {
    const { send, log } = await start();
    const { id } = (await (await send('POST', '/api/accounts', { ...account, notes: 'x' })).json()) as { id: string };
    const res = await send('PUT', `/api/accounts/${id}`, { ...account, name: 'Renombrada', active: false, notes: null });
    expect(res.status).toBe(200);
    expect(writesTo(log, 'PUT')[0]!.body).toMatchObject({ name: 'Renombrada', active: false, notes: '', iban: '' });
    const loaded = (await (await send('GET', `/api/accounts/${id}`)).json()) as AccountEditPayload;
    expect(loaded).toMatchObject({ name: 'Renombrada', active: false, notes: null, type: 'asset' });
  });
});

describe('goals (piggy banks)', () => {
  const goal = {
    name: 'Laptop',
    currency: 'DOP',
    targetAmount: '95000',
    startDate: '2026-10-01',
    targetDate: '2027-03-01',
    group: 'Metas 2027',
    notes: null,
    accounts: [{ accountId: '1', currentAmount: '1000' }],
  };

  it('creates a goal and sends the full list of accounts', async () => {
    const { send, lookups, log } = await start();
    await lookups();
    const created = await send('POST', '/api/piggy-banks', goal);
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    expect(writesTo(log, 'POST')[0]!.body).toMatchObject({
      name: 'Laptop',
      currency_code: 'DOP',
      target_amount: '95000',
      start_date: '2026-10-01',
      target_date: '2027-03-01',
      object_group_title: 'Metas 2027',
      accounts: [{ account_id: '1', current_amount: '1000' }],
    });
    expect((await lookups()).piggyBanks.map((p) => p.name)).toContain('Laptop');
    const loaded = (await (await send('GET', `/api/piggy-banks/${id}`)).json()) as PiggyEditPayload;
    expect(loaded).toMatchObject({ id, name: 'Laptop', currency: 'DOP', targetAmount: '95000', startDate: '2026-10-01', targetDate: '2027-03-01', group: 'Metas 2027', accounts: [{ accountId: '1', currentAmount: '1000.00' }] });
  });

  it('adjusts the saved money across several accounts by sending the complete list', async () => {
    const { send, log } = await start();
    const { id } = (await (await send('POST', '/api/piggy-banks', goal)).json()) as { id: string };
    const updated = await send('PUT', `/api/piggy-banks/${id}`, {
      ...goal,
      targetAmount: null,
      accounts: [
        { accountId: '1', currentAmount: '1500' },
        { accountId: '2', currentAmount: '250.5' },
      ],
    });
    expect(updated.status).toBe(200);
    expect(writesTo(log, 'PUT')[0]!.body).toMatchObject({
      target_amount: null,
      accounts: [
        { account_id: '1', current_amount: '1500' },
        { account_id: '2', current_amount: '250.5' },
      ],
    });
    const loaded = (await (await send('GET', `/api/piggy-banks/${id}`)).json()) as PiggyEditPayload;
    expect(loaded.accounts.map((a) => [a.accountId, a.currentAmount])).toEqual([
      ['1', '1500.00'],
      ['2', '250.50'],
    ]);
    // Removing an account from the goal means sending a shorter list.
    await send('PUT', `/api/piggy-banks/${id}`, { ...goal, accounts: [{ accountId: '2', currentAmount: '250.5' }] });
    expect(((await (await send('GET', `/api/piggy-banks/${id}`)).json()) as PiggyEditPayload).accounts).toHaveLength(1);
  });

  it('validates the accounts, amounts and dates', async () => {
    const { send, log } = await start();
    const none = await send('POST', '/api/piggy-banks', { ...goal, accounts: [] });
    expect(none.status).toBe(422);
    expect(await none.json()).toMatchObject({ fields: { accounts: [expect.any(String)] } });
    const twice = await send('POST', '/api/piggy-banks', { ...goal, accounts: [goal.accounts[0], goal.accounts[0]] });
    expect(twice.status).toBe(422);
    const negative = await send('POST', '/api/piggy-banks', { ...goal, accounts: [{ accountId: '1', currentAmount: '-5' }] });
    expect(negative.status).toBe(422);
    const dates = await send('POST', '/api/piggy-banks', { ...goal, targetDate: '2026-01-01' });
    expect(await dates.json()).toMatchObject({ fields: { targetDate: [expect.any(String)] } });
    expect(writesTo(log)).toHaveLength(0);
    const unknown = await send('POST', '/api/piggy-banks', { ...goal, accounts: [{ accountId: '999', currentAmount: '1' }] });
    expect(unknown.status).toBe(422);
    expect(await unknown.json()).toMatchObject({ fields: { accounts: [expect.any(String)] } });
  });

  it('deletes a goal', async () => {
    const { send, lookups } = await start();
    const { id } = (await (await send('POST', '/api/piggy-banks', goal)).json()) as { id: string };
    expect((await send('DELETE', `/api/piggy-banks/${id}`)).status).toBe(204);
    expect((await lookups()).piggyBanks.map((p) => p.name)).not.toContain('Laptop');
  });
});

describe('account deletion and transactions', () => {
  it('keeps the transactions of other accounts', async () => {
    const { send } = await start();
    const before = (await (await send('GET', '/api/transactions?start=2026-09-01&end=2026-09-30')).json()) as { data: { rows: unknown[] } };
    const { id } = (await (await send('POST', '/api/accounts', { ...account, type: 'expense', name: 'Tienda', currency: null, role: null })).json()) as { id: string };
    const made = (await (await send('POST', '/api/transactions', {
      description: 'Compra',
      date: '2026-09-20',
      source: { id: '1' },
      destination: { id },
      amount: '10',
      foreignAmount: null,
      foreignCurrency: null,
      category: null,
      budgetId: null,
      billId: null,
      tags: [],
      notes: null,
    })).json()) as TxWriteResult;
    expect(made.type).toBe('withdrawal');
    expect(((await (await send('GET', `/api/accounts/${id}`)).json()) as AccountEditPayload).transactionCount).toBe(1);
    await send('DELETE', `/api/accounts/${id}`);
    const after = (await (await send('GET', '/api/transactions?start=2026-09-01&end=2026-09-30')).json()) as { data: { rows: unknown[] } };
    expect(after.data.rows).toHaveLength(before.data.rows.length);
  });
});
