import { Hono, type Context } from 'hono';
import { z } from 'zod';
import {
  addDays,
  addMonths,
  endOfMonth,
  isIsoDate,
  monthsInRange,
  presetPeriod,
  previousPeriod,
  startOfMonth,
  startOfYear,
  todayIso,
  type MetaResponse,
  type Period,
  type Report,
  type SettingsResponse,
  type TxListResponse,
} from '@shared';
import type { AppEnv, Services } from '../app.types';
import { monthEnds, type FireflyData } from '../core/firefly-data';
import { applyFilter, isExpense, isIncome, isTransfer, ReportContext, round } from '../core/ledger';
import { buildAccounts, buildNetWorth } from '../reports/accounts.report';
import { buildBudgets } from '../reports/budgets.report';
import { buildCalendar, buildYearHeatmap, scheduledItems } from '../reports/calendar.report';
import { buildAnnual, buildCompare } from '../reports/compare.report';
import { buildDashboard } from '../reports/dashboard.report';
import { buildMonthly, buildSavingsSeries } from '../reports/monthly.report';
import { buildBills, buildPiggyBanks, buildProjection, buildRecurrences } from '../reports/planning.report';
import { buildRanking, keyFns } from '../reports/ranking.report';
import { buildSankey } from '../reports/sankey.report';
import { savingsAccounts } from '../reports/helpers';
import { FireflyError } from '../firefly/firefly.client';
import packageJson from '../../../package.json' with { type: 'json' };

const date = z.string().refine(isIsoDate, 'expected YYYY-MM-DD');
const bool = z.enum(['1', '0', 'true', 'false']).transform((v) => v === '1' || v === 'true');
const groupBy = z.enum(['category', 'tag', 'budget', 'account', 'counterparty']);
const kind = z.enum(['expense', 'income']);

class BadRequest extends Error {}

function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  const pb = b.replace(/^v/, '').split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

export function apiRoutes(s: Services) {
  const api = new Hono<AppEnv>();

  /** Parses `start`, `end` and `currency`, defaulting to the current month in the primary currency. */
  async function context(c: Context<AppEnv>, override?: Partial<Period>) {
    const data = c.get('data');
    const q = z
      .object({ start: date.optional(), end: date.optional(), currency: z.string().regex(/^[A-Z]{3}$/).optional() })
      .parse(c.req.query());
    const fx = await data.fx();
    const def = presetPeriod('month', todayIso());
    const period: Period = { start: override?.start ?? q.start ?? def.start, end: override?.end ?? q.end ?? def.end };
    if (period.start > period.end) throw new BadRequest('start must be on or before end');
    const allowed = new Set([fx.primary, ...s.config.displayCurrencies]);
    const currency = q.currency && allowed.has(q.currency) ? q.currency : fx.primary;
    return { data, fx, period, currency, ctx: new ReportContext(period, currency, fx) };
  }

  function wrap<T>(ctx: ReportContext, data: T): Report<T> {
    return {
      meta: { period: ctx.period, currency: ctx.currency, primaryCurrency: ctx.primary, generatedAt: new Date().toISOString() },
      data,
    };
  }

  const settingsOf = (c: Context<AppEnv>) => s.settings.get(c.get('session').userId);
  const clampToday = (d: string) => (d > todayIso() ? todayIso() : d);

  async function snapshots(data: FireflyData, end: string, count: number, withLiabilities: boolean) {
    const ends = monthEnds(end, count);
    return Promise.all(
      ends.map(async (e) => {
        const [assets, liabilities] = await Promise.all([
          data.accounts('asset', e.date),
          withLiabilities ? data.accounts('liabilities', e.date) : Promise.resolve([]),
        ]);
        return { ...e, accounts: [...assets, ...liabilities] };
      }),
    );
  }

  // ── Meta ────────────────────────────────────────────────────────────────────
  api.get('/me', (c) => {
    const session = c.get('session');
    return c.json({ authenticated: true, email: session.email, userId: session.userId });
  });

  api.get('/meta', async (c) => {
    const data = c.get('data');
    const [about, primary, currencies] = await Promise.all([data.about(), data.primaryCurrency(), data.currencies()]);
    const info = (code: string) => {
      const cur = currencies.find((x) => x.code === code);
      return { code, name: cur?.name ?? code, symbol: cur?.symbol ?? code, decimals: cur?.decimal_places ?? 2 };
    };
    const display = [...new Set([primary.code, ...s.config.displayCurrencies])].map(info);
    const body: MetaResponse = {
      fireflyVersion: about.version,
      fireflyVersionOk: compareVersions(about.version, s.config.MIN_FIREFLY_VERSION) >= 0,
      minFireflyVersion: s.config.MIN_FIREFLY_VERSION,
      fireflyPublicUrl: s.config.FIREFLY_PUBLIC_URL,
      primaryCurrency: info(primary.code),
      displayCurrencies: display,
      email: c.get('session').email,
      appVersion: packageJson.version,
    };
    return c.json(body);
  });

  api.post('/refresh', (c) => {
    c.get('data').invalidate();
    return c.body(null, 204);
  });

  api.get('/settings', async (c) => {
    const data = c.get('data');
    const [fx, accounts] = await Promise.all([data.fx(), data.accounts('asset')]);
    const end = todayIso();
    const months = monthsInRange(addMonths(startOfMonth(end), -11), end);
    const foreign = s.config.displayCurrencies.filter((x) => x !== fx.primary);
    const body: SettingsResponse = {
      settings: settingsOf(c),
      rates: foreign.flatMap((cur) => fx.ratesInUse(cur, months)).reverse(),
      accounts: accounts.map((a) => ({ id: a.id, name: a.name, role: a.role, currency: a.currency })),
    };
    return c.json(body);
  });

  api.put('/settings', async (c) => {
    const saved = s.settings.put(c.get('session').userId, await c.req.json());
    return c.json(saved);
  });

  // ── Transactions ────────────────────────────────────────────────────────────
  api.get('/transactions', async (c) => {
    const { data, period, ctx } = await context(c);
    const f = z
      .object({
        type: z.enum(['withdrawal', 'deposit', 'transfer']).optional(),
        category: z.string().optional(),
        categories: z.string().max(4000).optional(),
        budget: z.string().optional(),
        tag: z.string().optional(),
        bill: z.string().optional(),
        account: z.string().optional(),
        counterparty: z.string().optional(),
        q: z.string().max(200).optional(),
      })
      .parse(c.req.query());
    const splits = applyFilter(await data.ledger(period), f);
    const body: TxListResponse = {
      rows: splits.map((x) => ctx.row(x)).reverse(),
      totals: {
        income: round(ctx.sum(splits.filter(isIncome))),
        expense: round(ctx.sum(splits.filter(isExpense))),
        transfer: round(ctx.sum(splits.filter(isTransfer))),
      },
    };
    return c.json(wrap(ctx, body));
  });

  api.get('/search', async (c) => {
    const { data, ctx } = await context(c);
    const q = z
      .object({
        query: z.string().min(1).max(500),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(10).max(200).default(50),
      })
      .parse(c.req.query());
    const res = await data.search(q.query, q.page, q.limit);
    return c.json(wrap(ctx, { rows: res.splits.map((x) => ctx.row(x)), page: res.page, totalPages: res.totalPages, total: res.total }));
  });

  // ── Reports ─────────────────────────────────────────────────────────────────
  api.get('/reports/monthly', async (c) => {
    const { data, period, ctx } = await context(c);
    const settings = settingsOf(c);
    const prev = previousPeriod(period);
    const ytd = { start: startOfYear(period.end), end: period.end };
    const nwDate = clampToday(period.end);
    const [splits, previousSplits, ytdSplits, categories, budgets, limits, balances, assets, liabilities] = await Promise.all([
      data.ledger(period),
      data.ledger(prev),
      data.ledger(ytd),
      data.categories(),
      data.budgets(),
      data.budgetLimits(period),
      snapshots(data, period.end, settings.balanceMonths, false),
      data.accounts('asset', nwDate),
      data.accounts('liabilities', nwDate),
    ]);
    return c.json(
      wrap(
        ctx,
        buildMonthly({
          ctx,
          splits,
          previousSplits,
          previousPeriod: prev,
          ytdSplits,
          categories,
          budgets,
          limits,
          balances,
          netWorthAccounts: [...assets, ...liabilities],
          excludedAccounts: settings.excludedAccounts,
        }),
      ),
    );
  });

  api.get('/reports/sankey', async (c) => {
    const { data, period, ctx } = await context(c);
    const q = z
      .object({
        mode: z.enum(['budget', 'tags']).default('budget'),
        budgets: bool.default(true),
        incomeCategories: bool.default(true),
        threshold: z.coerce.number().min(0).max(0.2).optional(),
      })
      .parse(c.req.query());
    const [splits, budgets] = await Promise.all([data.ledger(period), data.budgets()]);
    const report = buildSankey(
      ctx,
      splits,
      budgets.map((b) => b.attributes.name),
      {
        mode: q.mode,
        showBudgets: q.budgets,
        showIncomeCategories: q.incomeCategories,
        threshold: q.threshold ?? settingsOf(c).sankeyThreshold,
      },
    );
    return c.json(wrap(ctx, report));
  });

  api.get('/reports/calendar', async (c) => {
    const { data, period, ctx } = await context(c);
    const f = z
      .object({ account: z.string().optional(), category: z.string().optional(), tag: z.string().optional() })
      .parse(c.req.query());
    const [all, bills, recurrences, opening] = await Promise.all([
      data.ledger(period),
      data.bills(period),
      data.recurrences(),
      data.accounts('asset', addDays(period.start, -1)),
    ]);
    const splits = applyFilter(all, f);
    const scope = f.account ? opening.filter((a) => a.id === f.account) : opening;
    const startBalance =
      f.category || f.tag ? null : round(scope.reduce((sum, a) => sum + ctx.convert(a.balance, a.currency, period.start), 0));
    // Transfers between asset accounts don't change the combined balance; for one account they do.
    const balanceSplits = f.account ? splits : splits.filter((x) => !isTransfer(x));
    const report = buildCalendar(ctx, balanceSplits, startBalance, scheduledItems(ctx, period, bills, recurrences));
    if (f.account) {
      // Transfers count as income/expense for a single account's running balance.
      let running = startBalance ?? 0;
      for (const day of report.days) {
        const moved = splits
          .filter((x) => x.date === day.date && isTransfer(x))
          .reduce((sum, x) => sum + (x.destId === f.account ? 1 : -1) * ctx.value(x), 0);
        running += day.income - day.expense + moved;
        if (day.balance !== null) day.balance = round(running);
      }
    }
    return c.json(wrap(ctx, report));
  });

  api.get('/reports/calendar/year', async (c) => {
    const year = z.coerce.number().int().min(2000).max(2100).parse(c.req.query('year') ?? new Date().getFullYear());
    const { data, ctx } = await context(c, { start: `${year}-01-01`, end: `${year}-12-31` });
    return c.json(wrap(ctx, buildYearHeatmap(ctx, year, await data.ledger(ctx.period))));
  });

  api.get('/reports/dashboard', async (c) => {
    const { data, period, ctx, fx, currency } = await context(c);
    const prev = previousPeriod(period);
    const yearStart = addMonths(startOfMonth(period.end), -11);
    const months = monthsInRange(yearStart, period.end);
    const calPeriod = { start: startOfMonth(period.end), end: endOfMonth(period.end) };
    const prevNwDate = clampToday(prev.end);
    const [splits, previousSplits, yearSplits, netWorthHistory, prevAssets, prevLiabilities, budgets, limits, bills, calendarSplits] =
      await Promise.all([
        data.ledger(period),
        data.ledger(prev),
        data.ledger({ start: yearStart, end: period.end }),
        snapshots(data, period.end, 12, true),
        data.accounts('asset', prevNwDate),
        data.accounts('liabilities', prevNwDate),
        data.budgets(),
        data.budgetLimits(period),
        data.bills({ start: todayIso(), end: addDays(todayIso(), 30) }),
        data.ledger(calPeriod),
      ]);
    return c.json(
      wrap(
        ctx,
        buildDashboard({
          ctx,
          splits,
          previousSplits,
          yearSplits,
          months,
          netWorthHistory,
          previousNetWorthAccounts: [...prevAssets, ...prevLiabilities],
          previousEnd: prevNwDate,
          budgets,
          limits,
          bills,
          calendarSplits,
          calendarCtx: new ReportContext(calPeriod, currency, fx),
        }),
      ),
    );
  });

  api.get('/reports/compare', async (c) => {
    const { data, fx, currency } = await context(c);
    const q = z
      .object({ aStart: date, aEnd: date, bStart: date, bEnd: date, groupBy: groupBy.default('category'), kind: kind.default('expense') })
      .parse(c.req.query());
    const a = { start: q.aStart, end: q.aEnd };
    const b = { start: q.bStart, end: q.bEnd };
    const trendStart = addMonths(startOfMonth(q.aEnd), -11);
    const months = monthsInRange(trendStart, q.aEnd);
    const [sa, sb, trend] = await Promise.all([data.ledger(a), data.ledger(b), data.ledger({ start: trendStart, end: q.aEnd })]);
    const ctx = new ReportContext(a, currency, fx);
    return c.json(wrap(ctx, buildCompare(ctx, q.groupBy, q.kind, { period: a, splits: sa }, { period: b, splits: sb }, trend, months)));
  });

  api.get('/reports/annual', async (c) => {
    const year = z.coerce.number().int().min(2000).max(2100).parse(c.req.query('year') ?? new Date().getFullYear());
    const { data, ctx } = await context(c, { start: `${year}-01-01`, end: `${year}-12-31` });
    const lastMonth = todayIso().slice(0, 7) < `${year}-12` ? todayIso().slice(0, 7) : `${year}-12`;
    return c.json(wrap(ctx, buildAnnual(ctx, year, await data.ledger(ctx.period), lastMonth)));
  });

  api.get('/reports/ranking', async (c) => {
    const { data, period, ctx } = await context(c);
    const q = z.object({ by: groupBy.default('category'), kind: kind.default('expense') }).parse(c.req.query());
    const trendStart = addMonths(startOfMonth(period.end), -11);
    const months = monthsInRange(trendStart, period.end);
    const [splits, prev, trend] = await Promise.all([
      data.ledger(period),
      data.ledger(previousPeriod(period)),
      data.ledger({ start: trendStart, end: period.end }),
    ]);
    return c.json(wrap(ctx, buildRanking(ctx, q.kind, splits, prev, trend, months, keyFns[q.by])));
  });

  api.get('/reports/budgets', async (c) => {
    const { data, period, ctx } = await context(c);
    const histStart = addMonths(startOfMonth(period.end), -11);
    const months = monthsInRange(histStart, period.end);
    const histPeriod = { start: histStart, end: endOfMonth(period.end) };
    const [splits, budgets, limits, available, historySplits, historyLimits] = await Promise.all([
      data.ledger(period),
      data.budgets(),
      data.budgetLimits(period),
      data.availableBudgets(period),
      data.ledger(histPeriod),
      data.budgetLimits(histPeriod),
    ]);
    return c.json(wrap(ctx, buildBudgets({ ctx, splits, budgets, limits, available, historySplits, historyLimits, months })));
  });

  api.get('/reports/accounts', async (c) => {
    const { data, period, ctx } = await context(c);
    const settings = settingsOf(c);
    const months = z.coerce.number().int().min(2).max(60).parse(c.req.query('months') ?? settings.balanceMonths);
    const [current, splits, history] = await Promise.all([
      data.accounts('asset', clampToday(period.end)),
      data.ledger(period),
      snapshots(data, period.end, months, false),
    ]);
    return c.json(wrap(ctx, buildAccounts(ctx, current, splits, history, settings.excludedAccounts)));
  });

  api.get('/reports/net-worth', async (c) => {
    const { data, period, ctx } = await context(c);
    const months = z.coerce.number().int().min(2).max(60).parse(c.req.query('months') ?? 12);
    const history = await snapshots(data, period.end, months, true);
    return c.json(wrap(ctx, buildNetWorth(ctx, history, settingsOf(c).excludedAccounts)));
  });

  api.get('/reports/savings', async (c) => {
    const { data, period, ctx } = await context(c);
    const settings = settingsOf(c);
    const months = z.coerce.number().int().min(2).max(60).parse(c.req.query('months') ?? settings.balanceMonths);
    const history = await snapshots(data, period.end, months, false);
    return c.json(wrap(ctx, buildSavingsSeries(ctx, history, settings.excludedAccounts)));
  });

  api.get('/reports/bills', async (c) => {
    const { data, period, ctx } = await context(c);
    const [bills, splits] = await Promise.all([data.bills(period), data.ledger(period)]);
    return c.json(wrap(ctx, buildBills(ctx, bills, splits)));
  });

  api.get('/reports/recurrences', async (c) => {
    const { data, ctx } = await context(c);
    return c.json(wrap(ctx, buildRecurrences(ctx, await data.recurrences())));
  });

  api.get('/reports/projection', async (c) => {
    const { data, ctx } = await context(c);
    const days = z.coerce.number().int().min(7).max(365).parse(c.req.query('days') ?? 90);
    const today = todayIso();
    const [accounts, bills, recurrences] = await Promise.all([
      data.accounts('asset', today),
      data.bills({ start: today, end: addDays(today, days) }),
      data.recurrences(),
    ]);
    const excluded = new Set(settingsOf(c).excludedAccounts);
    const liquid = accounts.filter((a) => !excluded.has(a.id));
    const start = liquid.reduce((sum, a) => sum + ctx.convert(a.balance, a.currency, today), 0);
    return c.json(wrap(ctx, buildProjection(ctx, start, days, bills, recurrences)));
  });

  api.get('/reports/piggy-banks', async (c) => {
    const { data, ctx } = await context(c);
    const piggies = await data.piggyBanks();
    const events = new Map(
      await Promise.all(piggies.map(async (p) => [p.id, await data.piggyEvents(p.id).catch(() => [])] as const)),
    );
    return c.json(wrap(ctx, buildPiggyBanks(ctx, piggies, events)));
  });

  api.get('/lookups', async (c) => {
    const data = c.get('data');
    const [categories, tags, budgets, accounts] = await Promise.all([
      data.categories(),
      data.tags(),
      data.budgets(),
      data.accounts('asset'),
    ]);
    const excluded = new Set(settingsOf(c).excludedAccounts);
    return c.json({
      categories,
      tags,
      budgets: budgets.map((b) => ({ id: b.id, name: b.attributes.name })),
      accounts: accounts.map((a) => ({ id: a.id, name: a.name, savings: savingsAccounts([a], [...excluded]).length > 0 })),
    });
  });

  api.onError((err, c) => {
    if (err instanceof z.ZodError) return c.json({ error: 'bad_request', issues: err.issues }, 400);
    if (err instanceof BadRequest) return c.json({ error: 'bad_request', message: err.message }, 400);
    if (err instanceof FireflyError) {
      if (err.status === 401) return c.json({ error: 'unauthenticated' }, 401);
      console.error('[firefly]', err.message);
      return c.json({ error: 'firefly_error', status: err.status }, 502);
    }
    console.error('[api]', err);
    return c.json({ error: 'internal_error' }, 500);
  });

  return api;
}
