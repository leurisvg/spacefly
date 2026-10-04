/** ISO 4217 currency code (DOP, USD, …). */
export type CurrencyCode = string;

/**
 * One original-currency component of a converted amount, mirroring the
 * "original → converted (×rate)" sub-lines of the email report.
 * `rate` = display-currency units per 1 unit of `currency`.
 */
export interface FxPart {
  original: number;
  currency: CurrencyCode;
  rate: number;
}

/** A value already expressed in the display currency plus its foreign parts (if any). */
export interface Amount {
  value: number;
  parts?: FxPart[];
}

export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  decimals: number;
}

/** Exchange rate used for a given month: units of `quote` per 1 `base`. */
export interface RateInUse {
  month: string;
  base: CurrencyCode;
  quote: CurrencyCode;
  rate: number;
  date: string;
  source: 'firefly' | 'fallback';
}
