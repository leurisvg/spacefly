/**
 * Local mock of the Firefly III API with ~14 months of realistic synthetic data
 * (DOP primary, a USD account, credit card with USD foreign amounts, budgets, bills,
 * recurrences, piggy banks). Lets you run the whole UI without a Firefly instance:
 *
 *   npm run dev:mock     # mock on :8081 + SpaceFly server (DEV token) + ng serve
 *
 * Deterministic (seeded) so screenshots and numbers are stable between runs.
 */
import { createServer } from 'node:http';
import { addDays, addMonths, daysInMonth, monthsInRange, startOfMonth, todayIso } from '../../shared/utils/dates';
import { createFakeFirefly, type FakeDataset } from '../test/fixtures/fake-firefly';

const PORT = Number(process.env['MOCK_PORT'] ?? 8081);

// ── Seeded PRNG ──────────────────────────────────────────────────────────────
let seed = 20261002;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const between = (a: number, b: number) => Math.round((a + rnd() * (b - a)) * 100) / 100;
const pick = <T>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];

// ── Reference data ───────────────────────────────────────────────────────────
type Acc = { id: string; name: string; type: 'asset' | 'expense' | 'revenue' | 'liabilities'; currency: string; role?: string; opening?: number };
const A = {
  banco: { id: '1', name: 'Banco Popular', type: 'asset', currency: 'DOP', role: 'defaultAsset', opening: 85000 },
  ahorros: { id: '2', name: 'Ahorros BHD', type: 'asset', currency: 'DOP', role: 'savingAsset', opening: 240000 },
  usd: { id: '3', name: 'Cuenta USD', type: 'asset', currency: 'USD', role: 'savingAsset', opening: 3200 },
  visa: { id: '4', name: 'Tarjeta Visa', type: 'asset', currency: 'DOP', role: 'ccAsset', opening: 0 },
  efectivo: { id: '5', name: 'Efectivo', type: 'asset', currency: 'DOP', role: 'cashWalletAsset', opening: 4000 },
  prestamo: { id: '6', name: 'Préstamo vehículo', type: 'liabilities', currency: 'DOP', opening: -420000 },
} satisfies Record<string, Acc>;
const R = {
  empresa: { id: '10', name: 'Empresa SRL', type: 'revenue', currency: 'DOP' },
  freelance: { id: '11', name: 'Freelance Inc', type: 'revenue', currency: 'USD' },
  intereses: { id: '12', name: 'Intereses BHD', type: 'revenue', currency: 'DOP' },
} satisfies Record<string, Acc>;
let expenseId = 100;
const merchants = new Map<string, Acc>();
const merchant = (name: string): Acc => {
  if (!merchants.has(name)) merchants.set(name, { id: String(++expenseId), name, type: 'expense', currency: 'DOP' });
  return merchants.get(name)!;
};

const CATS: [string, string][] = [
  ['1', 'Salario'],
  ['2', 'Freelance'],
  ['3', 'Intereses'],
  ['4', 'Supermercado'],
  ['5', 'Restaurantes'],
  ['6', 'Transporte'],
  ['7', 'Servicios'],
  ['8', 'Entretenimiento'],
  ['9', 'Salud'],
  ['10', 'Compras'],
  ['11', 'Educación'],
  ['12', 'Viajes'],
  ['13', 'Hogar'],
];
const cat = (name: string) => CATS.find((c) => c[1] === name)!;
const BUDGETS = [
  { id: '1', name: 'Hogar', amount: 32000 },
  { id: '2', name: 'Transporte', amount: 12000 },
  { id: '3', name: 'Ocio', amount: 9000 },
  { id: '4', name: 'Salud', amount: 5000 },
];
const budget = (name: string) => BUDGETS.find((b) => b.name === name)!;

// ── Transactions ─────────────────────────────────────────────────────────────
const today = todayIso();
const firstMonth = addMonths(startOfMonth(today), -13);
const rateFor = (month: string) => 58.4 + monthsInRange(firstMonth, `${month}-01`).length * 0.22;
const groups: FakeDataset['groups'] = [];
let journal = 1000;

interface TxOpts {
  category?: string;
  budget?: string;
  tags?: string[];
  bill?: [string, string];
  foreign?: [number, string];
  description?: string;
}
function tx(date: string, type: 'withdrawal' | 'deposit' | 'transfer', amount: number, currency: string, from: Acc, to: Acc, o: TxOpts = {}) {
  if (date > today) return;
  const id = String(++journal);
  const c = o.category ? cat(o.category) : null;
  const b = o.budget ? budget(o.budget) : null;
  const rate = rateFor(date.slice(0, 7));
  const pc = currency === 'DOP' ? amount : o.foreign?.[1] === 'DOP' ? o.foreign[0] : Math.round(amount * rate * 100) / 100;
  groups.push({
    type: 'transactions',
    id,
    attributes: {
      group_title: null,
      transactions: [
        {
          transaction_journal_id: id,
          type,
          date: `${date}T12:00:00-04:00`,
          description: o.description ?? to.name,
          amount: amount.toFixed(2),
          pc_amount: pc.toFixed(2),
          currency_code: currency,
          primary_currency_code: 'DOP',
          foreign_amount: o.foreign ? o.foreign[0].toFixed(2) : null,
          foreign_currency_code: o.foreign?.[1] ?? null,
          source_id: from.id,
          source_name: from.name,
          source_type: from.type === 'asset' ? 'Asset account' : from.type === 'revenue' ? 'Revenue account' : 'Loan',
          destination_id: to.id,
          destination_name: to.name,
          destination_type: to.type === 'asset' ? 'Asset account' : to.type === 'expense' ? 'Expense account' : 'Loan',
          category_id: c?.[0] ?? null,
          category_name: c?.[1] ?? null,
          budget_id: b?.id ?? null,
          budget_name: b?.name ?? null,
          bill_id: o.bill?.[0] ?? null,
          bill_name: o.bill?.[1] ?? null,
          tags: o.tags ?? [],
          notes: null,
        },
      ],
    },
  });
}

for (const month of monthsInRange(firstMonth, today)) {
  const d = (day: number) => `${month}-${String(Math.min(day, daysInMonth(`${month}-01`))).padStart(2, '0')}`;
  const rate = rateFor(month);
  // Income
  tx(d(15), 'deposit', 65000, 'DOP', R.empresa, A.banco, { category: 'Salario', description: 'Nómina 1ra quincena', tags: ['trabajo'] });
  tx(d(30), 'deposit', 65000, 'DOP', R.empresa, A.banco, { category: 'Salario', description: 'Nómina 2da quincena', tags: ['trabajo'] });
  if (rnd() > 0.25) tx(d(8 + Math.floor(rnd() * 10)), 'deposit', between(300, 950), 'USD', R.freelance, A.usd, { category: 'Freelance', description: 'Proyecto freelance', tags: ['trabajo'] });
  tx(d(28), 'deposit', between(900, 1300), 'DOP', R.intereses, A.ahorros, { category: 'Intereses', description: 'Intereses cuenta de ahorro' });
  // Fixed bills
  tx(d(5), 'withdrawal', 2500, 'DOP', A.banco, merchant('Smart Fit'), { category: 'Salud', budget: 'Salud', bill: ['5', 'Gimnasio'], description: 'Membresía gimnasio' });
  tx(d(10), 'withdrawal', between(2600, 3900), 'DOP', A.banco, merchant('Edenorte'), { category: 'Servicios', budget: 'Hogar', bill: ['1', 'Luz'], description: 'Factura de luz' });
  tx(d(12), 'withdrawal', 2890, 'DOP', A.banco, merchant('Claro'), { category: 'Servicios', budget: 'Hogar', bill: ['2', 'Internet y móvil'], description: 'Claro internet + móvil' });
  tx(d(14), 'withdrawal', Math.round(15.99 * rate * 100) / 100, 'DOP', A.visa, merchant('Netflix'), { category: 'Entretenimiento', budget: 'Ocio', bill: ['3', 'Netflix'], tags: ['suscripción'], foreign: [15.99, 'USD'], description: 'Netflix' });
  tx(d(18), 'withdrawal', Math.round(10.99 * rate * 100) / 100, 'DOP', A.visa, merchant('Spotify'), { category: 'Entretenimiento', budget: 'Ocio', bill: ['4', 'Spotify'], tags: ['suscripción'], foreign: [10.99, 'USD'], description: 'Spotify Premium' });
  tx(d(20), 'withdrawal', 18500, 'DOP', A.banco, A.prestamo, { description: 'Cuota préstamo vehículo' });
  // Variable spending
  for (let i = 0; i < 4; i++) tx(d(2 + i * 7 + Math.floor(rnd() * 3)), 'withdrawal', between(3200, 7800), 'DOP', pick([A.banco, A.visa]), merchant(pick(['Supermercado Nacional', 'La Sirena', 'Jumbo'])), { category: 'Supermercado', budget: 'Hogar', tags: ['hogar'], description: 'Compra supermercado' });
  for (let i = 0; i < 6; i++) tx(d(1 + Math.floor(rnd() * 28)), 'withdrawal', between(450, 2400), 'DOP', pick([A.visa, A.efectivo]), merchant(pick(['Adrian Tropical', 'Starbucks', 'Pizzarelli', 'Sushi Market'])), { category: 'Restaurantes', budget: 'Ocio', description: 'Comida fuera' });
  for (let i = 0; i < 3; i++) tx(d(3 + i * 9), 'withdrawal', between(2200, 3500), 'DOP', A.visa, merchant(pick(['Shell', 'Texaco', 'Sunix'])), { category: 'Transporte', budget: 'Transporte', description: 'Combustible' });
  for (let i = 0; i < 4; i++) tx(d(1 + Math.floor(rnd() * 28)), 'withdrawal', between(180, 650), 'DOP', A.visa, merchant('Uber'), { category: 'Transporte', budget: 'Transporte', description: 'Viaje Uber' });
  if (rnd() > 0.4) tx(d(1 + Math.floor(rnd() * 28)), 'withdrawal', between(40, 180), 'USD', A.usd, merchant('Amazon'), { category: 'Compras', description: 'Pedido Amazon', tags: ['online'] });
  if (rnd() > 0.5) tx(d(1 + Math.floor(rnd() * 28)), 'withdrawal', between(800, 3500), 'DOP', A.visa, merchant('Farmacia Carol'), { category: 'Salud', budget: 'Salud', description: 'Farmacia' });
  if (rnd() > 0.6) tx(d(1 + Math.floor(rnd() * 28)), 'withdrawal', between(1500, 6000), 'DOP', A.banco, merchant('Ferretería Americana'), { category: 'Hogar', budget: 'Hogar', tags: ['hogar'], description: 'Cosas de la casa' });
  if (rnd() > 0.7) tx(d(1 + Math.floor(rnd() * 28)), 'withdrawal', between(2000, 8000), 'DOP', A.visa, merchant('Zara'), { category: 'Compras', description: 'Ropa' });
  if (month.endsWith('-08') || month.endsWith('-01')) tx(d(6), 'withdrawal', 14500, 'DOP', A.banco, merchant('Coursera'), { category: 'Educación', description: 'Curso online' });
  if (month.endsWith('-07')) tx(d(22), 'withdrawal', 38000, 'DOP', A.visa, merchant('Hotel Punta Cana'), { category: 'Viajes', tags: ['vacaciones'], description: 'Hotel vacaciones' });
  tx(d(2 + Math.floor(rnd() * 5)), 'withdrawal', between(300, 900), 'DOP', A.efectivo, merchant('Colmado'), { description: 'Colmado' });
  // Transfers
  tx(d(16), 'transfer', 15000, 'DOP', A.banco, A.ahorros, { description: 'Ahorro quincenal' });
  tx(d(1), 'transfer', 6000, 'DOP', A.banco, A.efectivo, { description: 'Retiro cajero' });
  tx(d(25), 'transfer', between(18000, 26000), 'DOP', A.banco, A.visa, { description: 'Pago tarjeta Visa' });
}

// ── Balances derived from the transactions ───────────────────────────────────
const owned: Acc[] = Object.values(A);
function balanceAt(acc: Acc, date: string): number {
  let bal = acc.opening ?? 0;
  for (const g of groups) {
    const t = (g.attributes['transactions'] as Record<string, string>[])[0];
    if (t['date'].slice(0, 10) > date) continue;
    const amount = acc.currency === t['currency_code'] ? Number(t['amount']) : Number(t['foreign_amount'] ?? t['amount']);
    if (t['source_id'] === acc.id) bal -= amount;
    if (t['destination_id'] === acc.id) bal += amount;
  }
  return Math.round(bal * 100) / 100;
}
const accountResource = (a: Acc, date: string) => ({
  type: 'accounts',
  id: a.id,
  attributes: {
    name: a.name,
    type: a.type === 'liabilities' ? 'liabilities' : a.type,
    active: true,
    account_role: a.role ?? null,
    currency_code: a.currency,
    primary_currency_code: 'DOP',
    current_balance: balanceAt(a, date).toFixed(2),
    pc_current_balance: null,
    include_net_worth: true,
    credit_card_type: a.role === 'ccAsset' ? 'monthlyFull' : null,
    liability_direction: a.type === 'liabilities' ? 'credit' : null,
  },
});

// ── Bills, recurrences, piggy banks ──────────────────────────────────────────
const BILLS = [
  { id: '1', name: 'Luz', min: 2600, max: 3900, day: 10, currency: 'DOP' },
  { id: '2', name: 'Internet y móvil', min: 2890, max: 2890, day: 12, currency: 'DOP' },
  { id: '3', name: 'Netflix', min: 15.99, max: 15.99, day: 14, currency: 'USD' },
  { id: '4', name: 'Spotify', min: 10.99, max: 10.99, day: 18, currency: 'USD' },
  { id: '5', name: 'Gimnasio', min: 2500, max: 2500, day: 5, currency: 'DOP' },
];
function bills(start: string, end: string) {
  return BILLS.map((b) => {
    const dates = monthsInRange(start, addMonths(end, 1))
      .map((m) => `${m}-${String(Math.min(b.day, daysInMonth(`${m}-01`))).padStart(2, '0')}`)
      .filter((d) => d >= start && d <= end);
    const next = monthsInRange(today, addMonths(today, 2))
      .map((m) => `${m}-${String(b.day).padStart(2, '0')}`)
      .find((d) => d >= today);
    return {
      type: 'bills',
      id: b.id,
      attributes: {
        name: b.name,
        active: true,
        currency_code: b.currency,
        amount_min: b.min.toFixed(2),
        amount_max: b.max.toFixed(2),
        date: `${firstMonth}T00:00:00-04:00`,
        repeat_freq: 'monthly',
        skip: 0,
        next_expected_match: next ? `${next}T00:00:00-04:00` : null,
        pay_dates: dates.map((d) => `${d}T00:00:00-04:00`),
        paid_dates: [],
      },
    };
  });
}

const occurrences = (day: number, n = 6) =>
  Array.from({ length: n }, (_, i) => addMonths(`${today.slice(0, 7)}-01`, i))
    .map((m) => `${m.slice(0, 7)}-${String(Math.min(day, daysInMonth(m))).padStart(2, '0')}`)
    .filter((d) => d > today)
    .map((d) => `${d}T00:00:00-04:00`);
const recurrence = (id: string, title: string, type: string, amount: number, from: Acc, to: Acc, day: number, category: string | null, billId?: string) => ({
  type: 'recurrences',
  id,
  attributes: {
    type,
    title,
    first_date: firstMonth,
    active: true,
    repeat_until: null,
    repetitions: [{ type: 'monthly', moment: String(day), skip: 0, weekend: 1, description: `Cada mes el día ${day}`, occurrences: occurrences(day) }],
    transactions: [
      {
        description: title,
        amount: amount.toFixed(2),
        currency_code: 'DOP',
        source_id: from.id,
        source_name: from.name,
        destination_id: to.id,
        destination_name: to.name,
        category_name: category,
        subscription_id: billId ?? null,
      },
    ],
  },
});

const piggy = (id: string, name: string, target: number | null, current: number, currency: string, targetDate: string | null, acc: Acc) => ({
  type: 'piggy_banks',
  id,
  attributes: {
    name,
    active: true,
    currency_code: currency,
    target_amount: target?.toFixed(2) ?? null,
    current_amount: current.toFixed(2),
    left_to_save: target ? (target - current).toFixed(2) : null,
    start_date: firstMonth,
    target_date: targetDate,
    object_group_title: 'Metas 2027',
    accounts: [{ account_id: acc.id, name: acc.name, current_amount: current.toFixed(2) }],
  },
});
const piggyEvents = (monthly: number) =>
  Array.from({ length: 8 }, (_, i) => ({ amount: monthly.toFixed(2), currency_code: 'DOP', created_at: `${addDays(addMonths(today, -i), -3)}T10:00:00-04:00` }));

const dataset: FakeDataset = {
  version: '6.6.2',
  email: 'demo@spacefly.local',
  token: process.env['DEV_FIREFLY_TOKEN'] ?? 'mock-token',
  primary: { code: 'DOP', name: 'Peso dominicano', symbol: 'RD$' },
  currencies: [
    { code: 'DOP', name: 'Peso dominicano', symbol: 'RD$' },
    { code: 'USD', name: 'US Dollar', symbol: 'US$' },
  ],
  groups,
  rates: monthsInRange(firstMonth, today).map((m) => ({ from_currency_code: 'USD', to_currency_code: 'DOP', rate: rateFor(m).toFixed(4), date: `${m}-01T00:00:00-04:00` })),
  accountsAt: (type, date) => {
    const d = date > today ? today : date;
    const pool = type === 'asset' ? owned.filter((a) => a.type === 'asset') : type === 'liabilities' ? owned.filter((a) => a.type === 'liabilities') : type === 'expense' ? [...merchants.values()] : type === 'revenue' ? Object.values(R) : owned;
    return pool.map((a) => accountResource(a, d));
  },
  categories: CATS,
  tags: ['hogar', 'trabajo', 'suscripción', 'vacaciones', 'online'],
  budgets: BUDGETS.map((b) => ({ type: 'budgets', id: b.id, attributes: { name: b.name, active: true, auto_budget_type: b.name === 'Hogar' ? 'reset' : null, auto_budget_period: b.name === 'Hogar' ? 'monthly' : null, auto_budget_amount: b.name === 'Hogar' ? String(b.amount) : null } })),
  limits: (start, end) =>
    monthsInRange(start, end).flatMap((m) =>
      BUDGETS.map((b) => ({
        type: 'budget_limits',
        id: `${m}-${b.id}`,
        attributes: { budget_id: b.id, start: `${m}-01T00:00:00-04:00`, end: `${m}-${daysInMonth(`${m}-01`)}T23:59:59-04:00`, amount: b.amount.toFixed(2), currency_code: 'DOP' },
      })),
    ),
  available: (start, end) =>
    monthsInRange(start, end).map((m) => ({
      type: 'available_budgets',
      id: m,
      attributes: { amount: '70000.00', currency_code: 'DOP', start: `${m}-01T00:00:00-04:00`, end: `${m}-${daysInMonth(`${m}-01`)}T23:59:59-04:00` },
    })),
  bills,
  recurrences: [
    recurrence('1', 'Nómina 1ra quincena', 'deposit', 65000, R.empresa, A.banco, 15, 'Salario'),
    recurrence('2', 'Nómina 2da quincena', 'deposit', 65000, R.empresa, A.banco, 30, 'Salario'),
    recurrence('3', 'Membresía gimnasio', 'withdrawal', 2500, A.banco, merchant('Smart Fit'), 5, 'Salud', '5'),
    recurrence('4', 'Cuota préstamo vehículo', 'withdrawal', 18500, A.banco, A.prestamo, 20, null),
    recurrence('5', 'Ahorro quincenal', 'transfer', 15000, A.banco, A.ahorros, 16, null),
  ],
  piggyBanks: [
    piggy('1', 'Fondo de emergencia', 300000, 186500, 'DOP', null, A.ahorros),
    piggy('2', 'Vacaciones Punta Cana', 60000, 41200, 'DOP', '2027-03-15', A.ahorros),
    piggy('3', 'Laptop nueva', 95000, 22000, 'DOP', '2026-12-20', A.banco),
  ],
  piggyEvents: { '1': piggyEvents(8000), '2': piggyEvents(4500), '3': piggyEvents(1800) },
};

const handler = createFakeFirefly(dataset);
createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const response = await handler(`http://localhost:${PORT}${req.url}`, {
    method: req.method,
    headers: req.headers as Record<string, string>,
    body: chunks.length ? Buffer.concat(chunks) : undefined,
  });
  res.writeHead(response.status, { 'Content-Type': 'application/json' });
  res.end(await response.text());
}).listen(PORT, () => {
  console.log(`🧪 Mock Firefly III on http://localhost:${PORT} · ${groups.length} transactions · token "${dataset.token}"`);
});
