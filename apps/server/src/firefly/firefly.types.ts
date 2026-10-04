/** Minimal typings for the Firefly III v1 API (6.6+). Amounts arrive as strings. */

export interface FfPagination {
  total: number;
  count: number;
  per_page: number;
  current_page: number;
  total_pages: number;
}

export interface FfList<T> {
  data: FfResource<T>[];
  meta?: { pagination?: FfPagination };
}

export interface FfSingle<T> {
  data: FfResource<T>;
}

export interface FfResource<T> {
  type: string;
  id: string;
  attributes: T;
}

export interface FfAbout {
  version: string;
  api_version: string;
  php_version: string;
  os: string;
  driver: string;
}

export interface FfUser {
  email: string;
  blocked?: boolean;
  role?: string | null;
}

export interface FfCurrency {
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  enabled: boolean;
  primary?: boolean;
  default?: boolean;
}

export interface FfSplit {
  transaction_journal_id: string;
  type: string;
  date: string;
  description: string;
  amount: string;
  pc_amount?: string | null;
  currency_code: string;
  foreign_amount?: string | null;
  pc_foreign_amount?: string | null;
  foreign_currency_code?: string | null;
  primary_currency_code?: string | null;
  source_id: string;
  source_name: string;
  source_type: string;
  destination_id: string;
  destination_name: string;
  destination_type: string;
  budget_id?: string | null;
  budget_name?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  bill_id?: string | null;
  bill_name?: string | null;
  subscription_id?: string | null;
  subscription_name?: string | null;
  tags?: string[] | null;
  notes?: string | null;
}

export interface FfTransactionGroup {
  group_title?: string | null;
  transactions: FfSplit[];
}

export interface FfAccount {
  name: string;
  type: string;
  active: boolean;
  account_role?: string | null;
  currency_code?: string | null;
  primary_currency_code?: string | null;
  current_balance: string;
  pc_current_balance?: string | null;
  current_balance_date?: string | null;
  include_net_worth?: boolean;
  liability_type?: string | null;
  liability_direction?: string | null;
  interest?: string | null;
  interest_period?: string | null;
  credit_card_type?: string | null;
  monthly_payment_date?: string | null;
  iban?: string | null;
  notes?: string | null;
  opening_balance?: string | null;
  opening_balance_date?: string | null;
  object_group_title?: string | null;
  order?: number | null;
}

export interface FfExchangeRate {
  from_currency_code: string;
  to_currency_code: string;
  rate: string;
  date: string;
}

export interface FfCategory {
  name: string;
  notes?: string | null;
}

export interface FfTag {
  tag: string;
  date?: string | null;
  description?: string | null;
}

export interface FfBudget {
  name: string;
  active: boolean;
  notes?: string | null;
  order?: number | null;
  auto_budget_type?: string | null;
  auto_budget_period?: string | null;
  auto_budget_amount?: string | null;
  pc_auto_budget_amount?: string | null;
  currency_code?: string | null;
}

export interface FfBudgetLimit {
  start: string;
  end: string;
  budget_id: string;
  amount: string;
  pc_amount?: string | null;
  currency_code?: string | null;
  period?: string | null;
}

export interface FfAvailableBudget {
  amount: string;
  pc_amount?: string | null;
  currency_code?: string | null;
  start: string;
  end: string;
  spent_in_budgets?: { sum: string; currency_code: string }[] | string | null;
  spent_outside_budgets?: { sum: string; currency_code: string }[] | string | null;
}

export interface FfBill {
  name: string;
  active: boolean;
  notes?: string | null;
  currency_code?: string | null;
  amount_min: string;
  amount_max: string;
  amount_avg?: string | null;
  pc_amount_min?: string | null;
  pc_amount_max?: string | null;
  date: string;
  end_date?: string | null;
  repeat_freq: string;
  skip: number;
  next_expected_match?: string | null;
  pay_dates?: string[];
  paid_dates?: { date: string; transaction_journal_id: string; transaction_group_id: string; amount?: string; pc_amount?: string; currency_code?: string }[];
  object_group_title?: string | null;
}

export interface FfRecurrence {
  type: string;
  title: string;
  description?: string | null;
  first_date: string;
  latest_date?: string | null;
  repeat_until?: string | null;
  nr_of_repetitions?: number | null;
  active: boolean;
  repetitions: { type: string; moment: string; skip: number; weekend: number; description?: string; occurrences?: string[] }[];
  transactions: {
    description: string;
    amount: string;
    pc_amount?: string | null;
    currency_code: string;
    foreign_amount?: string | null;
    foreign_currency_code?: string | null;
    source_id: string;
    source_name: string;
    source_type?: string | null;
    destination_id: string;
    destination_name: string;
    destination_type?: string | null;
    category_name?: string | null;
    budget_name?: string | null;
    subscription_id?: string | null;
    bill_id?: string | null;
  }[];
}

export interface FfPiggyBank {
  name: string;
  notes?: string | null;
  active?: boolean;
  currency_code?: string | null;
  target_amount?: string | null;
  pc_target_amount?: string | null;
  current_amount: string;
  pc_current_amount?: string | null;
  left_to_save?: string | null;
  percentage?: number | null;
  start_date?: string | null;
  target_date?: string | null;
  save_per_month?: string | null;
  object_group_title?: string | null;
  accounts?: { account_id?: string; id?: string; name: string; current_amount?: string }[];
}

export interface FfPiggyBankEvent {
  amount: string;
  currency_code?: string | null;
  created_at: string;
}

export interface FfPreference {
  name: string;
  data: unknown;
}
