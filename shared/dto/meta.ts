import type { CurrencyInfo, RateInUse } from './money';

export interface MeResponse {
  authenticated: boolean;
  email?: string;
  userId?: string;
}

export interface MetaResponse {
  fireflyVersion: string;
  fireflyVersionOk: boolean;
  minFireflyVersion: string;
  fireflyPublicUrl: string;
  primaryCurrency: CurrencyInfo;
  displayCurrencies: CurrencyInfo[];
  email: string;
  appVersion: string;
}

export interface UserSettings {
  /** Asset account ids excluded from savings/net-worth charts (equivalent to `exclude_accounts`). */
  excludedAccounts: string[];
  /** Default number of months for balance history charts. */
  balanceMonths: number;
  /** Sankey "Others" grouping threshold, 0–0.2. */
  sankeyThreshold: number;
}

export interface SettingsResponse {
  settings: UserSettings;
  rates: RateInUse[];
  accounts: { id: string; name: string; role: string | null; currency: string }[];
}
