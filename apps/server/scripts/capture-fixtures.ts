/**
 * Captures real Firefly III responses for tests, anonymised.
 *
 *   FIREFLY_INTERNAL_URL=https://firefly.example.com DEV_FIREFLY_TOKEN=… \
 *     npm run fixtures:capture -- 2026-09
 *
 * Names, descriptions, notes, IBANs and tags are replaced by stable pseudonyms
 * ("Account 3", "Tx 41"…); amounts are multiplied by a random factor (0.5–1.5) applied
 * consistently to the whole capture, so ratios and totals still reconcile.
 * Output: server/test/fixtures/captured/<month>/*.json (git-ignored by default).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FireflyClient } from '../src/firefly/firefly.client';

const base = process.env['FIREFLY_INTERNAL_URL'];
const token = process.env['DEV_FIREFLY_TOKEN'];
const month = process.argv[2] ?? new Date().toISOString().slice(0, 7);
if (!base || !token) {
  console.error('Set FIREFLY_INTERNAL_URL and DEV_FIREFLY_TOKEN');
  process.exit(1);
}

const client = new FireflyClient(base.replace(/\/+$/, ''), { accessToken: async () => token, refresh: async () => null });
const factor = 0.5 + Math.random();
const pseudonyms = new Map<string, string>();
const counters = new Map<string, number>();
const alias = (kind: string, value: string) => {
  const key = `${kind}:${value}`;
  if (!pseudonyms.has(key)) {
    const n = (counters.get(kind) ?? 0) + 1;
    counters.set(kind, n);
    pseudonyms.set(key, `${kind} ${n}`);
  }
  return pseudonyms.get(key)!;
};

const NAME_KEYS: Record<string, string> = {
  source_name: 'Account',
  destination_name: 'Account',
  name: 'Name',
  category_name: 'Category',
  budget_name: 'Budget',
  bill_name: 'Bill',
  subscription_name: 'Bill',
  description: 'Tx',
  group_title: 'Group',
  title: 'Recurrence',
  tag: 'Tag',
};
const AMOUNT_KEY = /(^|_)(amount|balance|amount_min|amount_max|amount_avg|current_balance|sum|spent|earned|target_amount|current_amount|left_to_save|save_per_month|monetary_value)$/;
const DROP_KEYS = new Set(['notes', 'iban', 'bic', 'account_number', 'source_iban', 'destination_iban', 'external_url', 'internal_reference', 'external_id', 'import_hash_v2', 'latitude', 'longitude', 'email']);

function anonymise(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) {
    if (key === 'tags') return value.map((t) => alias('Tag', String(t)));
    return value.map((v) => anonymise(v, key));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, anonymise(v, k)]));
  }
  if (DROP_KEYS.has(key)) return null;
  if (typeof value === 'string' && NAME_KEYS[key]) return alias(NAME_KEYS[key], value);
  if (typeof value === 'string' && AMOUNT_KEY.test(key) && value !== '' && !Number.isNaN(Number(value))) {
    return (Number(value) * factor).toFixed(2);
  }
  return value;
}

const end = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);
const start = `${month}-01`;
const targets: Record<string, [string, Record<string, string>]> = {
  about: ['/v1/about', {}],
  currencies: ['/v1/currencies', {}],
  primary: ['/v1/currencies/primary', {}],
  'exchange-rates': ['/v1/exchange-rates', {}],
  transactions: ['/v1/transactions', { start, end, type: 'all' }],
  accounts: ['/v1/accounts', { type: 'asset', date: end }],
  categories: ['/v1/categories', {}],
  budgets: ['/v1/budgets', {}],
  'budget-limits': ['/v1/budget-limits', { start, end }],
  bills: ['/v1/bills', { start, end }],
  recurrences: ['/v1/recurrences', {}],
  'piggy-banks': ['/v1/piggy-banks', {}],
};

const dir = join(import.meta.dirname, '..', 'test', 'fixtures', 'captured', month);
mkdirSync(dir, { recursive: true });
for (const [name, [path, query]] of Object.entries(targets)) {
  const body = path.endsWith('/about') || path.endsWith('/primary') ? await client.get(path, query) : { data: await client.list(path, query) };
  writeFileSync(join(dir, `${name}.json`), JSON.stringify(anonymise(body), null, 2));
  console.log(`✔ ${name}`);
}
console.log(`Saved to ${dir} (amount factor kept private)`);
