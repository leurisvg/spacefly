import { monthsInRange, startOfMonth, todayIso, type Period } from '@shared';
import type { Config } from '../config';
import type { Db } from '../db/sqlite';
import type { FireflyReader } from '../firefly/firefly.client';
import type {
  FfAbout,
  FfAccount,
  FfAvailableBudget,
  FfBill,
  FfBudget,
  FfBudgetLimit,
  FfCategory,
  FfCurrency,
  FfExchangeRate,
  FfPiggyBank,
  FfPiggyBankEvent,
  FfRecurrence,
  FfResource,
  FfSingle,
  FfTag,
  FfTransactionGroup,
  FfList,
} from '../firefly/firefly.types';
import type { Cache } from './cache';
import { CurrencyService, fetchFallbackRates, type FallbackRates } from './currency.service';
import { inPeriod, normalizeGroups, type Split } from './ledger';

export interface Account {
  id: string;
  name: string;
  type: string;
  role: string | null;
  currency: string;
  balance: number;
  pcBalance: number | null;
  includeNetWorth: boolean;
  active: boolean;
  isCreditCard: boolean;
  group: string | null;
  order: number;
  liabilityType: string | null;
  liabilityDirection: string | null;
  iban: string | null;
  notes: string | null;
}

const META_TTL = 10 * 60;
const HOUR = 60 * 60;

/**
 * Per-user, cached access to Firefly data. Transactions are cached per calendar month:
 * closed months get a long TTL, the current month a short one.
 */
export class FireflyData {
  constructor(
    readonly ff: FireflyReader,
    private readonly cache: Cache,
    readonly userId: string,
    private readonly config: Config,
    private readonly db: Db | null,
  ) {}

  private key(...parts: (string | number)[]): string {
    return `u:${this.userId}:${parts.join(':')}`;
  }

  /** TTL in seconds for data belonging to a month (YYYY-MM) or a date. */
  ttlFor(dateOrMonth: string): number {
    const currentMonth = todayIso().slice(0, 7);
    return dateOrMonth.slice(0, 7) < currentMonth ? this.config.CACHE_TTL_CLOSED_MONTH : this.config.CACHE_TTL_CURRENT_MONTH;
  }

  invalidate(): void {
    this.cache.deletePrefix(`u:${this.userId}:`);
  }

  /**
   * After a transaction write: drops the months it touched (`tx2:`) plus everything derived from
   * transactions — balances, budgets, subscriptions, goals, categories and tags. Closed months that
   * weren't touched stay cached.
   */
  invalidateAfterTransaction(dates: string[]): void {
    for (const month of new Set(dates.map((d) => d.slice(0, 7)))) this.cache.deletePrefix(this.key('tx2', month));
    for (const prefix of ['accounts', 'available', 'bills', 'piggy-banks', 'piggy-events', 'categories', 'tags', 'budgets']) {
      this.cache.deletePrefix(this.key(prefix));
    }
  }

  /** Drops cached lists of one kind (e.g. `categories`) after an entity write. */
  invalidateKinds(...kinds: string[]): void {
    for (const kind of kinds) this.cache.deletePrefix(this.key(kind));
  }

  about(): Promise<FfAbout> {
    return this.cache.wrap(this.key('about'), HOUR, async () => (await this.ff.get<{ data: FfAbout }>('/v1/about')).data);
  }

  primaryCurrency(): Promise<FfCurrency> {
    return this.cache.wrap(this.key('primary'), HOUR, async () => {
      const res = await this.ff.get<FfSingle<FfCurrency>>('/v1/currencies/primary');
      return res.data.attributes;
    });
  }

  currencies(): Promise<FfCurrency[]> {
    return this.cache.wrap(this.key('currencies'), HOUR, async () =>
      (await this.ff.list<FfCurrency>('/v1/currencies')).map((r) => r.attributes),
    );
  }

  exchangeRates(): Promise<FfExchangeRate[]> {
    return this.cache.wrap(this.key('rates'), HOUR, async () =>
      (await this.ff.list<FfExchangeRate>('/v1/exchange-rates')).map((r) => r.attributes),
    );
  }

  async fx(): Promise<CurrencyService> {
    const [primary, rates, currencies] = await Promise.all([this.primaryCurrency(), this.exchangeRates(), this.currencies()]);
    const foreign = [
      ...new Set([...this.config.displayCurrencies, ...currencies.filter((c) => c.enabled).map((c) => c.code)]),
    ].filter((c) => c !== primary.code);
    const fallback = await this.fallbackRates(primary.code, foreign);
    return new CurrencyService(primary.code, rates, fallback);
  }

  private async fallbackRates(primary: string, currencies: string[]): Promise<FallbackRates | null> {
    if (this.config.FX_FALLBACK_PROVIDER === 'none' || currencies.length === 0) return null;
    const day = todayIso();
    return this.cache.wrap(
      `fx:fallback:${primary}:${day}`,
      HOUR * 6,
      async () => {
        const stored = this.readStoredFallback(primary, day);
        if (stored && currencies.every((c) => stored.rates[c])) return stored;
        try {
          const rates = await fetchFallbackRates(primary, currencies);
          const insert = this.db?.prepare('INSERT OR REPLACE INTO fx_fallback (day, base, quote, rate) VALUES (?, ?, ?, ?)');
          for (const [c, r] of Object.entries(rates)) insert?.run(day, c, primary, r);
          return { day, rates };
        } catch (err) {
          console.warn('[fx] fallback provider failed:', (err as Error).message);
          return this.readStoredFallback(primary, null);
        }
      },
      false,
    );
  }

  /** Latest stored fallback rates (for a given day, or the most recent one). */
  private readStoredFallback(primary: string, day: string | null): FallbackRates | null {
    if (!this.db) return null;
    const d =
      day ??
      (this.db.prepare('SELECT MAX(day) AS day FROM fx_fallback WHERE quote = ?').get(primary) as { day: string | null } | undefined)
        ?.day;
    if (!d) return null;
    const rows = this.db.prepare('SELECT base, rate FROM fx_fallback WHERE day = ? AND quote = ?').all(d, primary) as {
      base: string;
      rate: number;
    }[];
    if (!rows.length) return null;
    return { day: d, rates: Object.fromEntries(rows.map((r) => [r.base, r.rate])) };
  }

  /** All splits of a calendar month (YYYY-MM). */
  monthSplits(month: string): Promise<Split[]> {
    return this.cache.wrap(this.key('tx2', month), this.ttlFor(month), async () => {
      const start = `${month}-01`;
      const end = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);
      const groups = await this.ff.list<FfTransactionGroup>('/v1/transactions', { start, end, type: 'all' });
      return normalizeGroups(groups);
    });
  }

  /** Every split in the period: one cached fetch per month, then filtered by date. */
  async ledger(p: Period): Promise<Split[]> {
    const months = monthsInRange(p.start, p.end);
    const chunks = await Promise.all(months.map((m) => this.monthSplits(m)));
    return inPeriod(chunks.flat(), p).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  }

  /** Accounts of a type, with balances as of `date` (defaults to today). */
  accounts(type: 'asset' | 'expense' | 'revenue' | 'liabilities' | 'all', date?: string): Promise<Account[]> {
    const d = date ?? todayIso();
    return this.cache.wrap(this.key('accounts', type, d), this.ttlFor(d), async () => {
      const list = await this.ff.list<FfAccount>('/v1/accounts', { type, date: d });
      return list.map(toAccount);
    });
  }

  /** Asset balances at the end of each month (month-end or today if the month is current). */
  async balancesAt(dates: string[]): Promise<Map<string, Account[]>> {
    const entries = await Promise.all(dates.map(async (d) => [d, await this.accounts('asset', d)] as const));
    return new Map(entries);
  }

  categories(): Promise<{ id: string; name: string }[]> {
    return this.cache.wrap(this.key('categories'), META_TTL, async () =>
      (await this.ff.list<FfCategory>('/v1/categories')).map((r) => ({ id: r.id, name: r.attributes.name })),
    );
  }

  tags(): Promise<{ id: string; name: string }[]> {
    return this.cache.wrap(this.key('tags'), META_TTL, async () =>
      (await this.ff.list<FfTag>('/v1/tags')).map((r) => ({ id: r.id, name: r.attributes.tag })),
    );
  }

  budgets(): Promise<FfResource<FfBudget>[]> {
    return this.cache.wrap(this.key('budgets'), META_TTL, () => this.ff.list<FfBudget>('/v1/budgets'));
  }

  budgetLimits(p: Period): Promise<FfResource<FfBudgetLimit>[]> {
    return this.cache.wrap(this.key('budget-limits', p.start, p.end), this.ttlFor(p.end), async () => {
      const res = await this.ff.get<FfList<FfBudgetLimit>>('/v1/budget-limits', { start: p.start, end: p.end });
      return res.data;
    });
  }

  availableBudgets(p: Period): Promise<FfResource<FfAvailableBudget>[]> {
    return this.cache.wrap(this.key('available', p.start, p.end), this.ttlFor(p.end), () =>
      this.ff.list<FfAvailableBudget>('/v1/available-budgets', { start: p.start, end: p.end }),
    );
  }

  bills(p: Period): Promise<FfResource<FfBill>[]> {
    return this.cache.wrap(this.key('bills', p.start, p.end), this.config.CACHE_TTL_CURRENT_MONTH, () =>
      this.ff.list<FfBill>('/v1/bills', { start: p.start, end: p.end }),
    );
  }

  /** Every subscription, without period-dependent pay dates (for pickers). */
  billsAll(): Promise<FfResource<FfBill>[]> {
    return this.cache.wrap(this.key('bills', 'all'), this.config.CACHE_TTL_CURRENT_MONTH, () => this.ff.list<FfBill>('/v1/bills'));
  }

  recurrences(): Promise<FfResource<FfRecurrence>[]> {
    return this.cache.wrap(this.key('recurrences'), META_TTL, () => this.ff.list<FfRecurrence>('/v1/recurrences'));
  }

  piggyBanks(): Promise<FfResource<FfPiggyBank>[]> {
    return this.cache.wrap(this.key('piggy-banks'), META_TTL, () => this.ff.list<FfPiggyBank>('/v1/piggy-banks'));
  }

  piggyEvents(id: string): Promise<FfPiggyBankEvent[]> {
    return this.cache.wrap(this.key('piggy-events', id), META_TTL, async () =>
      (await this.ff.list<FfPiggyBankEvent>(`/v1/piggy-banks/${encodeURIComponent(id)}/events`)).map((r) => r.attributes),
    );
  }

  /** One page of Firefly's search (`/v1/search/transactions`), not cached. */
  async search(query: string, page: number, limit: number) {
    const res = await this.ff.page<FfTransactionGroup>('/v1/search/transactions', { query }, page, limit);
    return {
      splits: normalizeGroups(res.data),
      page: res.meta?.pagination?.current_page ?? page,
      totalPages: res.meta?.pagination?.total_pages ?? 1,
      total: res.meta?.pagination?.total ?? res.data.length,
    };
  }
}

function toAccount(r: FfResource<FfAccount>): Account {
  const a = r.attributes;
  const pc = a.pc_current_balance === null || a.pc_current_balance === undefined ? null : Number(a.pc_current_balance);
  return {
    id: r.id,
    name: a.name,
    type: a.type,
    role: a.account_role ?? null,
    currency: a.currency_code ?? a.primary_currency_code ?? '',
    balance: Number(a.current_balance) || 0,
    pcBalance: pc !== null && Number.isFinite(pc) ? pc : null,
    includeNetWorth: a.include_net_worth !== false,
    active: a.active,
    isCreditCard: a.account_role === 'ccAsset' || (a.credit_card_type ?? '') !== '',
    group: a.object_group_title ?? null,
    order: a.order ?? 0,
    liabilityType: a.liability_type ?? null,
    liabilityDirection: a.liability_direction ?? null,
    iban: a.iban || null,
    notes: a.notes || null,
  };
}

/** Month-end dates for the `count` months ending at `lastMonthStart`'s month; today for the current month. */
export function monthEnds(endDate: string, count: number): { month: string; date: string }[] {
  const today = todayIso();
  const out: { month: string; date: string }[] = [];
  let cursor = startOfMonth(endDate);
  for (let i = 0; i < count; i++) {
    const month = cursor.slice(0, 7);
    const last = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);
    out.unshift({ month, date: last > today ? today : last });
    const prev = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 2, 1));
    cursor = prev.toISOString().slice(0, 10);
  }
  return out;
}
