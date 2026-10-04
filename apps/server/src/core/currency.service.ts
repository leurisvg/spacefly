import type { RateInUse } from '@spacefly/shared';
import type { FfExchangeRate } from '../firefly/firefly.types';

/** One known rate: `value` primary-currency units per 1 unit of the foreign currency. */
export interface RatePoint {
  date: string;
  value: number;
}

export interface FallbackRates {
  day: string;
  /** primary units per 1 foreign unit, keyed by currency. */
  rates: Record<string, number>;
}

export interface RateLookup {
  rate: number;
  date: string;
  source: 'identity' | 'firefly' | 'fallback' | 'missing';
}

/**
 * Converts between the primary currency (DOP) and any other currency using the user's own
 * exchange rates stored in Firefly: the most recent rate on or before the transaction date.
 * When Firefly has no applicable rate the fallback provider rate (open.er-api) is used.
 */
export class CurrencyService {
  private readonly series = new Map<string, RatePoint[]>();

  constructor(
    readonly primary: string,
    rates: FfExchangeRate[],
    private readonly fallback: FallbackRates | null,
  ) {
    for (const r of rates) {
      const value = Number(r.rate);
      if (!Number.isFinite(value) || value <= 0) continue;
      const date = r.date.slice(0, 10);
      if (r.to_currency_code === primary && r.from_currency_code !== primary) {
        this.push(r.from_currency_code, { date, value });
      } else if (r.from_currency_code === primary && r.to_currency_code !== primary) {
        this.push(r.to_currency_code, { date, value: 1 / value });
      }
    }
    for (const points of this.series.values()) points.sort((a, b) => a.date.localeCompare(b.date));
  }

  /** Primary units per 1 unit of `currency` effective on `date`. */
  toPrimary(currency: string, date: string): RateLookup {
    if (currency === this.primary) return { rate: 1, date, source: 'identity' };
    const points = this.series.get(currency);
    if (points?.length) {
      const hit = latestOnOrBefore(points, date);
      if (hit) return { rate: hit.value, date: hit.date, source: 'firefly' };
    }
    const fb = this.fallback?.rates[currency];
    if (fb) return { rate: fb, date: this.fallback!.day, source: 'fallback' };
    // Before the first stored rate and no fallback: use the earliest known rate rather than 1.
    if (points?.length) return { rate: points[0].value, date: points[0].date, source: 'firefly' };
    return { rate: 1, date, source: 'missing' };
  }

  /** Converts `amount` from one currency to another on a given date. Returns value and the rate used. */
  convert(amount: number, from: string, to: string, date: string): { value: number; rate: number } {
    if (from === to) return { value: amount, rate: 1 };
    const fromRate = this.toPrimary(from, date).rate;
    const toRate = this.toPrimary(to, date).rate;
    const rate = fromRate / toRate;
    return { value: amount * rate, rate };
  }

  /** Converts an amount already expressed in the primary currency to `to`. */
  fromPrimary(pcAmount: number, to: string, date: string): number {
    if (to === this.primary) return pcAmount;
    return pcAmount / this.toPrimary(to, date).rate;
  }

  /** Effective rate per month for the settings page ("tasas en uso"). */
  ratesInUse(currency: string, months: string[]): RateInUse[] {
    return months.map((month) => {
      const lastDay = `${month}-31`;
      const r = this.toPrimary(currency, lastDay);
      return {
        month,
        base: currency,
        quote: this.primary,
        rate: r.rate,
        date: r.date,
        source: r.source === 'fallback' || r.source === 'missing' ? 'fallback' : 'firefly',
      };
    });
  }

  hasRates(currency: string): boolean {
    return (this.series.get(currency)?.length ?? 0) > 0;
  }

  private push(currency: string, point: RatePoint): void {
    const list = this.series.get(currency) ?? [];
    list.push(point);
    this.series.set(currency, list);
  }
}

function latestOnOrBefore(points: RatePoint[], date: string): RatePoint | null {
  let lo = 0;
  let hi = points.length - 1;
  let found: RatePoint | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].date <= date) {
      found = points[mid];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

/** Fetches open.er-api.com latest rates and returns primary units per 1 foreign unit. */
export async function fetchFallbackRates(
  primary: string,
  currencies: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<Record<string, number>> {
  const res = await fetchImpl(`https://open.er-api.com/v6/latest/${encodeURIComponent(primary)}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`open.er-api returned ${res.status}`);
  const body = (await res.json()) as { rates?: Record<string, number> };
  const out: Record<string, number> = {};
  for (const c of currencies) {
    const perPrimary = body.rates?.[c];
    if (perPrimary && perPrimary > 0) out[c] = 1 / perPrimary;
  }
  return out;
}
