import type { CurrencyCode } from './money';

/**
 * One exchange rate stored in Firefly. `rate` is always primary-currency units per 1 unit of `currency`,
 * whichever direction Firefly stores it in (`from` → `to` is kept so the row can be deleted).
 */
export interface ExchangeRateRow {
  currency: CurrencyCode;
  date: string;
  rate: number;
  from: CurrencyCode;
  to: CurrencyCode;
}

export interface ExchangeRatesResponse {
  primary: CurrencyCode;
  /** Enabled currencies other than the primary one: the ones a rate can be entered for. */
  currencies: CurrencyCode[];
  /** Newest date first. */
  rates: ExchangeRateRow[];
}

/** Sets the rate of `currency` on `date`: replaces the one stored for that day, or adds it. `rate` is a decimal string. */
export interface ExchangeRateWrite {
  currency: CurrencyCode;
  date: string;
  rate: string;
}
