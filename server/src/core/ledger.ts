import type { FxPart, Period, Ref, TxFilter, TxRow } from '@shared';
import type { FfResource, FfTransactionGroup } from '../firefly/firefly.types';
import type { CurrencyService } from './currency.service';

/** A normalized transaction split. Cached per month, independent of the display currency. */
export interface Split {
  id: string;
  groupId: string;
  date: string;
  type: string;
  description: string;
  /** Positive amount in the transaction currency. */
  amount: number;
  currency: string;
  foreignAmount: number | null;
  foreignCurrency: string | null;
  /** Firefly's own primary-currency amount (`pc_amount`), positive, when provided. */
  pcAmount: number | null;
  categoryId: string | null;
  categoryName: string | null;
  budgetId: string | null;
  budgetName: string | null;
  billId: string | null;
  billName: string | null;
  tags: string[];
  sourceId: string;
  sourceName: string;
  sourceType: string;
  destId: string;
  destName: string;
  destType: string;
  notes: string | null;
}

const num = (v: string | null | undefined): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function normalizeGroups(groups: FfResource<FfTransactionGroup>[]): Split[] {
  const out: Split[] = [];
  for (const g of groups) {
    for (const t of g.attributes.transactions) {
      const amount = Math.abs(num(t.amount) ?? 0);
      if (amount === 0) continue;
      const fa = num(t.foreign_amount);
      const pc = num(t.pc_amount);
      out.push({
        id: t.transaction_journal_id,
        groupId: g.id,
        date: t.date.slice(0, 10),
        type: t.type,
        description: t.description || g.attributes.group_title || '—',
        amount,
        currency: t.currency_code,
        foreignAmount: fa !== null && fa !== 0 ? Math.abs(fa) : null,
        foreignCurrency: fa !== null && fa !== 0 ? (t.foreign_currency_code ?? null) : null,
        pcAmount: pc !== null && pc !== 0 ? Math.abs(pc) : null,
        categoryId: t.category_id ?? null,
        categoryName: t.category_name ?? null,
        budgetId: t.budget_id ?? null,
        budgetName: t.budget_name ?? null,
        billId: t.bill_id ?? t.subscription_id ?? null,
        billName: t.bill_name ?? t.subscription_name ?? null,
        tags: t.tags ?? [],
        sourceId: t.source_id,
        sourceName: t.source_name,
        sourceType: t.source_type,
        destId: t.destination_id,
        destName: t.destination_name,
        destType: t.destination_type,
        notes: t.notes ?? null,
      });
    }
  }
  return out;
}

export const isExpense = (s: Split) => s.type === 'withdrawal';
export const isIncome = (s: Split) => s.type === 'deposit';
export const isTransfer = (s: Split) => s.type === 'transfer';

/** Signed contribution to "net" from the user's point of view: +income, −expense, 0 otherwise. */
export function signOf(s: Split): number {
  if (isIncome(s)) return 1;
  if (isExpense(s)) return -1;
  return 0;
}

/** The asset side of a split (source for expenses, destination for income). */
export function assetSide(s: Split): { id: string; name: string } {
  return isIncome(s) ? { id: s.destId, name: s.destName } : { id: s.sourceId, name: s.sourceName };
}

/** The counterparty (expense/revenue account) side of a split. */
export function counterpartySide(s: Split): { id: string; name: string } {
  return isIncome(s) ? { id: s.sourceId, name: s.sourceName } : { id: s.destId, name: s.destName };
}

/**
 * Everything a report needs to turn splits into display-currency numbers.
 * Primary amounts use Firefly's `pc_amount` when present; otherwise the user's rates.
 */
export class ReportContext {
  constructor(
    readonly period: Period,
    readonly currency: string,
    readonly fx: CurrencyService,
  ) {}

  get primary(): string {
    return this.fx.primary;
  }

  /** Positive amount of a split in the primary currency. */
  primaryValue(s: Split): number {
    if (s.currency === this.primary) return s.amount;
    if (s.foreignCurrency === this.primary && s.foreignAmount) return s.foreignAmount;
    if (s.pcAmount) return s.pcAmount;
    return s.amount * this.fx.toPrimary(s.currency, s.date).rate;
  }

  /** Positive amount of a split in the display currency. */
  value(s: Split): number {
    if (s.currency === this.currency) return s.amount;
    if (s.foreignCurrency === this.currency && s.foreignAmount) return s.foreignAmount;
    return this.fx.fromPrimary(this.primaryValue(s), this.currency, s.date);
  }

  /** Converts an arbitrary amount (e.g. an account balance) to the display currency. */
  convert(amount: number, from: string, date: string): number {
    return this.fx.convert(amount, from || this.primary, this.currency, date).value;
  }

  /** Foreign-currency breakdown for a set of splits (only when something is not in the display currency). */
  parts(splits: Split[], signed = true): FxPart[] | undefined {
    const byCur = new Map<string, { original: number; display: number }>();
    for (const s of splits) {
      const sign = signed ? signOf(s) || 1 : 1;
      const cur = byCur.get(s.currency) ?? { original: 0, display: 0 };
      cur.original += sign * s.amount;
      cur.display += sign * this.value(s);
      byCur.set(s.currency, cur);
    }
    if (byCur.size === 0 || (byCur.size === 1 && byCur.has(this.currency))) return undefined;
    return [...byCur.entries()]
      .filter(([, v]) => v.original !== 0)
      .map(([currency, v]) => ({
        original: round(v.original),
        currency,
        rate: currency === this.currency ? 1 : v.original ? Math.abs(v.display / v.original) : 1,
      }));
  }

  row(s: Split): TxRow {
    const value = this.value(s);
    const ref = (id: string | null, name: string | null): Ref | null => (id && name ? { id, name } : null);
    return {
      id: s.id,
      groupId: s.groupId,
      date: s.date,
      type: s.type,
      description: s.description,
      amount: round(value),
      originalAmount: s.amount,
      originalCurrency: s.currency,
      foreignAmount: s.foreignAmount,
      foreignCurrency: s.foreignCurrency,
      rate: s.currency === this.currency ? 1 : value / s.amount,
      category: ref(s.categoryId, s.categoryName),
      budget: ref(s.budgetId, s.budgetName),
      bill: ref(s.billId, s.billName),
      tags: s.tags,
      source: { id: s.sourceId, name: s.sourceName, type: s.sourceType },
      destination: { id: s.destId, name: s.destName, type: s.destType },
      notes: s.notes,
    };
  }

  sum(splits: Split[]): number {
    let total = 0;
    for (const s of splits) total += this.value(s);
    return total;
  }
}

export function inPeriod(splits: Split[], p: Period): Split[] {
  return splits.filter((s) => s.date >= p.start && s.date <= p.end);
}

/** Applies a drill-down filter. `none` matches splits without that attribute. */
export function applyFilter(splits: Split[], f: Omit<TxFilter, 'start' | 'end'>): Split[] {
  const q = f.q?.trim().toLowerCase();
  const categories = f.categories ? new Set(f.categories.split(',').filter(Boolean)) : null;
  const match = (filter: string | undefined, id: string | null) =>
    filter === undefined || (filter === 'none' ? !id : id === filter);
  return splits.filter((s) => {
    if (f.type && s.type !== f.type) return false;
    if (!match(f.category, s.categoryId)) return false;
    if (categories && !categories.has(s.categoryId ?? 'none')) return false;
    if (!match(f.budget, s.budgetId)) return false;
    if (!match(f.bill, s.billId)) return false;
    if (f.tag !== undefined && (f.tag === 'none' ? s.tags.length > 0 : !s.tags.includes(f.tag))) return false;
    if (f.account && s.sourceId !== f.account && s.destId !== f.account) return false;
    if (f.counterparty && counterpartySide(s).id !== f.counterparty) return false;
    if (q && !`${s.description} ${s.sourceName} ${s.destName} ${s.categoryName ?? ''} ${s.notes ?? ''}`.toLowerCase().includes(q))
      return false;
    return true;
  });
}

export function round(n: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

/** Groups splits by a key, preserving the first-seen display name. */
export function groupBy<K extends string | null>(
  splits: Split[],
  key: (s: Split) => K,
  name: (s: Split) => string,
): Map<K, { name: string; splits: Split[] }> {
  const map = new Map<K, { name: string; splits: Split[] }>();
  for (const s of splits) {
    const k = key(s);
    const entry = map.get(k);
    if (entry) entry.splits.push(s);
    else map.set(k, { name: name(s), splits: [s] });
  }
  return map;
}
