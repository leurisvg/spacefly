import { Hono, type Context } from 'hono';
import { z } from 'zod';
import {
  accountKind,
  type AccountEditPayload,
  type AccountWrite,
  type BillEditPayload,
  type BillWrite,
  type BudgetEditPayload,
  type BudgetWrite,
  type CategoryEditPayload,
  type CategoryWrite,
  type EditorAccount,
  type PiggyEditPayload,
  type PiggyWrite,
  type EditorLookups,
  type ExchangeRateRow,
  type ExchangeRatesResponse,
  type TagEditPayload,
  type TagWrite,
  type TxWriteResult,
} from '@spacefly/shared';
import type { AppEnv, Services } from '../app.types';
import { accountBody, assertEditable, billBody, budgetBody, categoryBody, momentOf, piggyBody, resolveTransaction, tagBody, toAccountEdit, toBillEdit, toBudgetEdit, toCategoryEdit, toEditPayload, toPiggyEdit, toTagEdit, transactionBody } from '../core/firefly-payloads';
import type { FireflyData } from '../core/firefly-data';
import type { FfSingle, FfTransactionGroup } from '../firefly/firefly.types';
import type { FfAccount, FfBill, FfBudget, FfCategory, FfExchangeRate, FfPiggyBank, FfTag } from '../firefly/firefly.types';
import { crudRoutes } from './entity.routes';
import { handleApiError, ValidationFailed } from './errors';
import { accountSchema, billSchema, budgetSchema, categorySchema, exchangePairParams, exchangeRateSchema, idParam, parseBody, piggySchema, tagSchema, txWriteSchema, type TxWriteBody } from './write.schemas';

/** Create, update and delete in Firefly. Every successful write invalidates the cache it affects. */
export function writeRoutes(_s: Services) {
  const api = new Hono<AppEnv>();

  const fetchGroup = async (data: FireflyData, id: string) =>
    (await data.ff.get<FfSingle<FfTransactionGroup>>(`/v1/transactions/${encodeURIComponent(id)}`)).data;
  const idOf = (c: Context<AppEnv>) => idParam.parse(c.req.param('id'));

  // ── Lookups for the editors ─────────────────────────────────────────────────
  api.get('/lookups/editor', async (c) => {
    const data = c.get('data');
    const [accounts, categories, tags, budgets, bills, piggyBanks, currencies, primary] = await Promise.all([
      data.accounts('all'),
      data.categories(),
      data.tags(),
      data.budgets(),
      data.billsAll(),
      data.piggyBanks(),
      data.currencies(),
      data.primaryCurrency(),
    ]);
    const editorAccounts: EditorAccount[] = accounts.flatMap((a) => {
      const kind = accountKind(a.type);
      if (!kind || !a.active) return [];
      return [
        {
          id: a.id,
          name: a.name,
          kind,
          liabilityType: kind === 'liability' ? a.liabilityType : null,
          currency: a.currency || primary.code,
          balance: a.balance,
          role: a.role,
          group: a.group,
        },
      ];
    });
    const body: EditorLookups = {
      accounts: editorAccounts,
      categories,
      tags,
      budgets: budgets.map((b) => ({ id: b.id, name: b.attributes.name })),
      bills: bills.map((b) => ({ id: b.id, name: b.attributes.name, currency: b.attributes.currency_code ?? primary.code, active: b.attributes.active })),
      piggyBanks: piggyBanks.map((p) => ({ id: p.id, name: p.attributes.name, currency: p.attributes.currency_code ?? primary.code })),
      currencies: currencies
        .filter((x) => x.enabled)
        .map((x) => ({ code: x.code, name: x.name, symbol: x.symbol, decimals: x.decimal_places })),
      defaultAccountId: editorAccounts.find((a) => a.kind === 'asset' && a.role === 'defaultAsset')?.id ?? null,
    };
    return c.json(body);
  });

  /** Descriptions already used, for the suggestions under the description field (Firefly's own autocomplete). */
  api.get('/lookups/descriptions', async (c) => {
    const { q } = z.object({ q: z.string().trim().min(1).max(100) }).parse(c.req.query());
    const found = await c.get('data').ff.get<{ name?: string; description?: string }[]>('/v1/autocomplete/transactions', { query: q, limit: 20 });
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of found) {
      const text = (item.description ?? item.name ?? '').trim();
      if (text && !seen.has(text.toLowerCase())) {
        seen.add(text.toLowerCase());
        out.push(text);
      }
    }
    return c.json(out.slice(0, 10));
  });

  // ── Transactions ────────────────────────────────────────────────────────────
  /** Matches the request against real accounts and currencies. */
  async function resolve(data: FireflyData, req: TxWriteBody) {
    const [accounts, currencies, primary] = await Promise.all([data.accounts('all'), data.currencies(), data.primaryCurrency()]);
    const enabled = new Set(currencies.filter((x) => x.enabled).map((x) => x.code));
    return resolveTransaction(req, accounts, primary.code, enabled);
  }

  api.get('/transactions/:id', async (c) => {
    const group = await fetchGroup(c.get('data'), idOf(c));
    return c.json(toEditPayload(group));
  });

  api.post('/transactions', async (c) => {
    const data = c.get('data');
    const req = await parseBody(c, txWriteSchema);
    const resolved = await resolve(data, req);
    const created = await c.get('writer').post<FfSingle<FfTransactionGroup>>(
      '/v1/transactions',
      transactionBody(req, resolved, { date: momentOf(req.date, req.time) }),
    );
    data.invalidateAfterTransaction([req.date]);
    const split = created.data.attributes.transactions[0]!;
    const body: TxWriteResult = { groupId: created.data.id, journalId: split.transaction_journal_id, type: resolved.type };
    return c.json(body, 201);
  });

  api.put('/transactions/:id', async (c) => {
    const data = c.get('data');
    const id = idOf(c);
    const req = await parseBody(c, txWriteSchema);
    // A PUT drops every split it doesn't send, so never write over a group with several.
    const current = await fetchGroup(data, id);
    assertEditable(current);
    const split = current.attributes.transactions[0]!;
    const resolved = await resolve(data, req);
    // Nothing about when it happened changed: keep the stored moment (seconds and offset included).
    const keepsMoment = split.date.slice(0, 10) === req.date && (req.time === null || split.date.slice(11, 16) === req.time);
    await c.get('writer').put(`/v1/transactions/${encodeURIComponent(id)}`, transactionBody(req, resolved, {
      date: keepsMoment ? split.date : momentOf(req.date, req.time),
      journalId: split.transaction_journal_id,
    }));
    data.invalidateAfterTransaction([split.date, req.date]);
    const body: TxWriteResult = { groupId: id, journalId: split.transaction_journal_id, type: resolved.type };
    return c.json(body);
  });

  api.delete('/transactions/:id', async (c) => {
    const data = c.get('data');
    const id = idOf(c);
    const current = await fetchGroup(data, id);
    await c.get('writer').delete(`/v1/transactions/${encodeURIComponent(id)}`);
    data.invalidateAfterTransaction(current.attributes.transactions.map((t) => t.date));
    return c.body(null, 204);
  });

  // ── Exchange rates ──────────────────────────────────────────────────────────
  const ratePath = (from: string, to: string, date: string) => `/v1/exchange-rates/${from}/${to}/${date}`;

  /** Always read fresh: the check before a write must not trust a list cached before someone edited Firefly. */
  const storedRates = async (data: FireflyData) => (await data.ff.list<FfExchangeRate>('/v1/exchange-rates')).map((r) => r.attributes);

  api.get('/exchange-rates', async (c) => {
    const data = c.get('data');
    const [primary, currencies, stored] = await Promise.all([data.primaryCurrency(), data.currencies(), data.exchangeRates()]);
    const rates = stored.flatMap<ExchangeRateRow>((r) => {
      const value = Number(r.rate);
      if (!(value > 0)) return [];
      const date = r.date.slice(0, 10);
      if (r.to_currency_code === primary.code && r.from_currency_code !== primary.code) {
        return [{ currency: r.from_currency_code, date, rate: value, from: r.from_currency_code, to: r.to_currency_code }];
      }
      if (r.from_currency_code === primary.code && r.to_currency_code !== primary.code) {
        return [{ currency: r.to_currency_code, date, rate: 1 / value, from: r.from_currency_code, to: r.to_currency_code }];
      }
      return [];
    });
    rates.sort((a, b) => b.date.localeCompare(a.date) || a.currency.localeCompare(b.currency));
    const body: ExchangeRatesResponse = {
      primary: primary.code,
      currencies: currencies.filter((x) => x.enabled && x.code !== primary.code).map((x) => x.code),
      rates,
    };
    return c.json(body);
  });

  api.post('/exchange-rates', async (c) => {
    const data = c.get('data');
    const req = await parseBody(c, exchangeRateSchema);
    const primary = (await data.primaryCurrency()).code;
    if (req.currency === primary) throw new ValidationFailed({ currency: ['Pick a currency other than the primary one.'] });
    const enabled = (await data.currencies()).some((x) => x.enabled && x.code === req.currency);
    if (!enabled) throw new ValidationFailed({ currency: ['That currency is not enabled in Firefly.'] });
    // One rate per pair and day: replace whatever is stored, in the direction it is stored.
    const existing = (await storedRates(data)).find(
      (r) =>
        r.date.slice(0, 10) === req.date &&
        ((r.from_currency_code === req.currency && r.to_currency_code === primary) || (r.from_currency_code === primary && r.to_currency_code === req.currency)),
    );
    const inverse = existing?.from_currency_code === primary;
    const rate = inverse ? (1 / Number(req.rate)).toFixed(12) : req.rate;
    const writer = c.get('writer');
    if (existing) await writer.put(ratePath(existing.from_currency_code, existing.to_currency_code, req.date), { rate });
    else await writer.post(ratePath(req.currency, primary, req.date), { rate });
    data.invalidate();
    return c.body(null, existing ? 200 : 201);
  });

  api.delete('/exchange-rates/:from/:to/:date', async (c) => {
    const data = c.get('data');
    const { from, to, date } = exchangePairParams.parse(c.req.param());
    await c.get('writer').delete(ratePath(from, to, date));
    data.invalidate();
    return c.body(null, 204);
  });

  // ── Categories and tags ─────────────────────────────────────────────────────
  crudRoutes<CategoryWrite, CategoryEditPayload, FfCategory>(api, {
    name: 'categories',
    ff: '/v1/categories',
    schema: categorySchema,
    body: categoryBody,
    edit: toCategoryEdit,
  });
  crudRoutes<TagWrite, TagEditPayload, FfTag>(api, {
    name: 'tags',
    ff: '/v1/tags',
    schema: tagSchema,
    body: tagBody,
    edit: toTagEdit,
  });

  // ── Budgets and subscriptions ───────────────────────────────────────────────
  crudRoutes<BudgetWrite, BudgetEditPayload, FfBudget>(api, {
    name: 'budgets',
    ff: '/v1/budgets',
    schema: budgetSchema,
    body: budgetBody,
    edit: async (r, data) => toBudgetEdit(r, (await data.primaryCurrency()).code),
  });
  crudRoutes<BillWrite, BillEditPayload, FfBill>(api, {
    name: 'bills',
    ff: '/v1/bills',
    schema: billSchema,
    body: billBody,
    edit: async (r, data) => toBillEdit(r, (await data.primaryCurrency()).code),
  });

  // ── Accounts and goals ──────────────────────────────────────────────────────
  crudRoutes<AccountWrite, AccountEditPayload, FfAccount>(api, {
    name: 'accounts',
    ff: '/v1/accounts',
    schema: accountSchema,
    body: accountBody,
    edit: async (r, data) => {
      // Deleting an account deletes its transactions: the form shows how many.
      const list = await data.ff.page<FfTransactionGroup>(`/v1/accounts/${encodeURIComponent(r.id)}/transactions`, { type: 'all' }, 1, 1);
      return toAccountEdit(r, list.meta?.pagination?.total ?? list.data.length);
    },
  });
  crudRoutes<PiggyWrite, PiggyEditPayload, FfPiggyBank>(api, {
    name: 'piggy-banks',
    ff: '/v1/piggy-banks',
    schema: piggySchema,
    body: piggyBody,
    edit: async (r, data) => toPiggyEdit(r, (await data.primaryCurrency()).code),
  });

  api.onError(handleApiError);
  return api;
}
