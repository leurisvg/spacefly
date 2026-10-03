/**
 * Synthetic Firefly III 6.6 API data in the exact wire format (amounts as strings, pc_* fields).
 * Primary currency DOP, one USD account, a DOP credit card with USD foreign amounts,
 * monthly USD→DOP rates. Replace/extend with real anonymized captures from
 * `npm run fixtures:capture` (see server/scripts/capture-fixtures.ts).
 */

import { createFakeFirefly, type FakeDataset, type FakeFireflyLog } from './fake-firefly';

type Split = Record<string, unknown>;

let journal = 100;
function tx(
  date: string,
  type: 'withdrawal' | 'deposit' | 'transfer',
  amount: number,
  currency: 'DOP' | 'USD',
  from: [string, string, string],
  to: [string, string, string],
  extra: Partial<{
    category: [string, string];
    budget: [string, string];
    bill: [string, string];
    tags: string[];
    pc: number;
    foreign: [number, string];
    description: string;
  }> = {},
) {
  const id = String(++journal);
  const split: Split = {
    transaction_journal_id: id,
    type,
    date: `${date}T12:00:00-04:00`,
    description: extra.description ?? `${type} ${id}`,
    amount: amount.toFixed(2),
    pc_amount: extra.pc !== undefined ? extra.pc.toFixed(2) : currency === 'DOP' ? amount.toFixed(2) : null,
    currency_code: currency,
    primary_currency_code: 'DOP',
    foreign_amount: extra.foreign ? extra.foreign[0].toFixed(2) : null,
    foreign_currency_code: extra.foreign ? extra.foreign[1] : null,
    source_id: from[0],
    source_name: from[1],
    source_type: from[2],
    destination_id: to[0],
    destination_name: to[1],
    destination_type: to[2],
    category_id: extra.category?.[0] ?? null,
    category_name: extra.category?.[1] ?? null,
    budget_id: extra.budget?.[0] ?? null,
    budget_name: extra.budget?.[1] ?? null,
    bill_id: extra.bill?.[0] ?? null,
    bill_name: extra.bill?.[1] ?? null,
    tags: extra.tags ?? [],
    notes: null,
  };
  return { type: 'transactions', id: `g${id}`, attributes: { group_title: null, transactions: [split] } };
}

const BANCO: [string, string, string] = ['1', 'Banco Popular', 'Asset account'];
const USD_ACC: [string, string, string] = ['2', 'Cuenta USD', 'Asset account'];
const VISA: [string, string, string] = ['3', 'Tarjeta Visa', 'Asset account'];
const EMPRESA: [string, string, string] = ['10', 'Empresa SRL', 'Revenue account'];
const FREELANCE: [string, string, string] = ['11', 'Freelance Inc', 'Revenue account'];
const SUPER: [string, string, string] = ['20', 'Supermercado Nacional', 'Expense account'];
const NETFLIX: [string, string, string] = ['21', 'Netflix', 'Expense account'];
const EDENORTE: [string, string, string] = ['22', 'Edenorte', 'Expense account'];
const RESTAURANTE: [string, string, string] = ['23', 'Restaurante', 'Expense account'];

const SALARIO: [string, string] = ['1', 'Salario'];
const COMIDA: [string, string] = ['2', 'Comida'];
const SERVICIOS: [string, string] = ['3', 'Servicios'];
const ENTRETENIMIENTO: [string, string] = ['4', 'Entretenimiento'];
const HOGAR: [string, string] = ['1', 'Hogar'];
const OCIO: [string, string] = ['2', 'Ocio'];

export const SEPTEMBER = [
  tx('2026-09-01', 'deposit', 120000, 'DOP', EMPRESA, BANCO, { category: SALARIO, description: 'Nómina septiembre' }),
  tx('2026-09-03', 'withdrawal', 8500, 'DOP', BANCO, SUPER, { category: COMIDA, budget: HOGAR, tags: ['hogar'], description: 'Compra quincenal' }),
  tx('2026-09-10', 'withdrawal', 4200, 'DOP', VISA, SUPER, { category: COMIDA, description: 'Compra rápida' }),
  tx('2026-09-12', 'withdrawal', 975.39, 'DOP', VISA, NETFLIX, {
    category: ENTRETENIMIENTO,
    budget: OCIO,
    tags: ['suscripcion'],
    foreign: [15.99, 'USD'],
    description: 'Netflix',
  }),
  tx('2026-09-15', 'deposit', 500, 'USD', FREELANCE, USD_ACC, { pc: 30500, description: 'Proyecto freelance' }),
  tx('2026-09-20', 'withdrawal', 3500, 'DOP', BANCO, EDENORTE, { category: SERVICIOS, budget: HOGAR, bill: ['1', 'Luz'], description: 'Factura luz' }),
  tx('2026-09-21', 'withdrawal', 50, 'USD', USD_ACC, RESTAURANTE, { category: ENTRETENIMIENTO, pc: 3050, description: 'Cena' }),
  tx('2026-09-25', 'transfer', 5000, 'DOP', BANCO, VISA, { description: 'Pago tarjeta' }),
  tx('2026-09-28', 'withdrawal', 1200, 'DOP', BANCO, RESTAURANTE, { description: 'Almuerzo' }),
];

export const AUGUST = [
  tx('2026-08-01', 'deposit', 120000, 'DOP', EMPRESA, BANCO, { category: SALARIO }),
  tx('2026-08-05', 'withdrawal', 9000, 'DOP', BANCO, SUPER, { category: COMIDA, budget: HOGAR }),
  tx('2026-08-20', 'withdrawal', 3300, 'DOP', BANCO, EDENORTE, { category: SERVICIOS, budget: HOGAR, bill: ['1', 'Luz'] }),
  tx('2026-08-22', 'withdrawal', 2000, 'DOP', BANCO, RESTAURANTE, { category: ENTRETENIMIENTO }),
];

export const RATES = [
  { from_currency_code: 'USD', to_currency_code: 'DOP', rate: '60.000000', date: '2026-08-01T00:00:00-04:00' },
  { from_currency_code: 'USD', to_currency_code: 'DOP', rate: '61.000000', date: '2026-09-01T00:00:00-04:00' },
];

const account = (id: string, name: string, currency: string, balance: number, extra: Record<string, unknown> = {}) => ({
  type: 'accounts',
  id,
  attributes: {
    name,
    type: 'asset',
    active: true,
    account_role: 'defaultAsset',
    currency_code: currency,
    primary_currency_code: 'DOP',
    current_balance: balance.toFixed(2),
    pc_current_balance: null,
    include_net_worth: true,
    credit_card_type: null,
    ...extra,
  },
});

/** Balances at a date: a simple function of the month so history charts have shape. */
function accountsAt(date: string) {
  const m = Number(date.slice(5, 7));
  return [
    account('1', 'Banco Popular', 'DOP', 150000 + m * 10000),
    account('2', 'Cuenta USD', 'USD', 2000 + m * 100),
    account('3', 'Tarjeta Visa', 'DOP', -8000, { account_role: 'ccAsset', credit_card_type: 'monthlyFull' }),
  ];
}

export type { FakeFireflyLog } from './fake-firefly';

const BUDGETS = [
  { type: 'budgets', id: '1', attributes: { name: 'Hogar', active: true, auto_budget_type: null, auto_budget_amount: null } },
  { type: 'budgets', id: '2', attributes: { name: 'Ocio', active: true, auto_budget_type: null, auto_budget_amount: null } },
  { type: 'budgets', id: '3', attributes: { name: 'Viajes', active: true, auto_budget_type: null, auto_budget_amount: null } },
];

function limits(start: string, end: string) {
  return ['2026-08', '2026-09']
    .filter((m) => `${m}-01` <= end && `${m}-31` >= start)
    .flatMap((m) => {
      const last = m === '2026-09' ? '30' : '31';
      return [
        ['1', '15000.00', 'DOP'],
        ['2', '5000.00', 'DOP'],
        ['3', '100.00', 'USD'],
      ].map(([budget_id, amount, currency_code]) => ({
        type: 'budget_limits',
        id: `${m}-${budget_id}`,
        attributes: { budget_id, start: `${m}-01T00:00:00-04:00`, end: `${m}-${last}T23:59:59-04:00`, amount, currency_code },
      }));
    });
}

const BILL = {
  type: 'bills',
  id: '1',
  attributes: {
    name: 'Luz',
    active: true,
    currency_code: 'DOP',
    amount_min: '3000.00',
    amount_max: '3400.00',
    date: '2026-01-20T00:00:00-04:00',
    repeat_freq: 'monthly',
    skip: 0,
    next_expected_match: '2026-10-20T00:00:00-04:00',
    pay_dates: ['2026-09-20T00:00:00-04:00', '2026-10-20T00:00:00-04:00'],
    paid_dates: [],
  },
};

const RECURRENCE = {
  type: 'recurrences',
  id: '1',
  attributes: {
    type: 'withdrawal',
    title: 'Gimnasio',
    first_date: '2026-01-05',
    active: true,
    repetitions: [{ type: 'monthly', moment: '5', skip: 0, weekend: 1, occurrences: ['2026-10-05T00:00:00-04:00', '2026-11-05T00:00:00-04:00'] }],
    transactions: [{ description: 'Gimnasio', amount: '2500.00', currency_code: 'DOP', source_id: '1', source_name: 'Banco Popular', destination_id: '24', destination_name: 'Gym' }],
  },
};

export const FIXTURE: FakeDataset = {
  version: '6.6.2',
  email: 'leurisvg003@gmail.com',
  token: 'test-token',
  primary: { code: 'DOP', name: 'Peso dominicano', symbol: 'RD$' },
  currencies: [
    { code: 'DOP', name: 'Peso dominicano', symbol: 'RD$' },
    { code: 'USD', name: 'US Dollar', symbol: 'US$' },
  ],
  groups: [...AUGUST, ...SEPTEMBER],
  rates: RATES,
  accountsAt: (type, date) => (type === 'asset' ? accountsAt(date) : []),
  categories: [SALARIO, COMIDA, SERVICIOS, ENTRETENIMIENTO, ['5', 'Transporte']],
  tags: ['hogar', 'suscripcion'],
  budgets: BUDGETS,
  limits,
  bills: () => [BILL],
  recurrences: [RECURRENCE],
  piggyBanks: [],
};

/** A `fetch` implementation answering like Firefly III for the fixture data. */
export function fakeFirefly(log?: FakeFireflyLog): typeof fetch {
  return createFakeFirefly(FIXTURE, log);
}
