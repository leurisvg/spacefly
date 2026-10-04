/**
 * A `fetch` implementation that answers like Firefly III (v1 API + /oauth/token) from an
 * in-memory dataset, writes included. Used by the tests and by the local mock server
 * (`npm run dev:mock`). Paginates like Firefly so the client's paging is exercised.
 *
 * Writes mutate the dataset's `groups` array in place (so the mock's balances follow) and keep
 * everything else in per-instance overlays, so a dataset's accounts/bills/… stay reusable.
 * Validation errors use Firefly's 422 shape: `{ message, errors: { field: [..] } }`.
 */
import { accountKind, inferTransactionType, isPositiveAmount, type AccountKind, type AccountSlot } from '@spacefly/shared';

type Resource = { type: string; id: string; attributes: Record<string, unknown> };
type Attrs = Record<string, unknown>;

export interface FakeDataset {
  version: string;
  email: string;
  token: string;
  primary: { code: string; name: string; symbol: string };
  currencies: { code: string; name: string; symbol: string }[];
  groups: Resource[];
  rates: Record<string, unknown>[];
  accountsAt: (type: string, date: string) => Resource[];
  categories: [string, string][];
  tags: string[];
  budgets: Resource[];
  limits: (start: string, end: string) => Resource[];
  available?: (start: string, end: string) => Resource[];
  bills: (start: string, end: string) => Resource[];
  recurrences: Resource[];
  piggyBanks: Resource[];
  piggyEvents?: Record<string, Record<string, unknown>[]>;
}

export interface FakeFireflyLog {
  methods: string[];
  paths: string[];
  /** Path plus query string, parallel to `paths`. */
  urls: string[];
  /** Parsed JSON body of each request (`undefined` when it had none), parallel to `methods`. */
  bodies: unknown[];
}

export const newLog = (): FakeFireflyLog => ({ methods: [], paths: [], urls: [], bodies: [] });

function page(data: unknown[], q: URLSearchParams) {
  const limit = Math.min(Number(q.get('limit') ?? 50) || 50, 500);
  const current = Math.max(Number(q.get('page') ?? 1) || 1, 1);
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    data: data.slice((current - 1) * limit, current * limit),
    meta: { pagination: { total, count: Math.min(limit, total), per_page: limit, current_page: current, total_pages: totalPages } },
  };
}

/** Created / patched / deleted resources layered over a read-only base list. */
class Overlay {
  private created: Resource[] = [];
  private patches = new Map<string, Attrs>();
  private deleted = new Set<string>();

  constructor(
    private readonly type: string,
    private readonly ids: () => string,
  ) {}

  /** The base list with patches and deletions applied (created items excluded). */
  applyBase(base: Resource[]): Resource[] {
    return base
      .filter((r) => !this.deleted.has(r.id))
      .map((r) => (this.patches.has(r.id) ? { ...r, attributes: { ...r.attributes, ...this.patches.get(r.id) } } : r));
  }

  createdItems(): Resource[] {
    return this.applyBase(this.created);
  }

  apply(base: Resource[]): Resource[] {
    return [...this.applyBase(base), ...this.createdItems()];
  }

  find(base: Resource[], id: string): Resource | undefined {
    return this.apply(base).find((r) => r.id === id);
  }

  create(attributes: Attrs): Resource {
    const r = { type: this.type, id: this.ids(), attributes };
    this.created.push(r);
    return r;
  }

  patch(id: string, attributes: Attrs): void {
    this.patches.set(id, { ...this.patches.get(id), ...attributes });
  }

  remove(id: string): void {
    this.deleted.add(id);
  }
}

const TYPE_LABEL: Record<AccountKind, string> = {
  asset: 'Asset account',
  expense: 'Expense account',
  revenue: 'Revenue account',
  cash: 'Cash account',
  liability: 'Loan',
};

const str = (v: unknown): string => (typeof v === 'string' ? v : v === null || v === undefined ? '' : String(v));
const has = (o: Attrs, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);
const isDate = (v: string): boolean => /^\d{4}-\d{2}-\d{2}/.test(v) && !Number.isNaN(Date.parse(v.slice(0, 10)));

export function createFakeFirefly(ds: FakeDataset, log: FakeFireflyLog = newLog()): typeof fetch {
  let seq = 9000;
  const nextId = () => String(++seq);
  const accounts = new Overlay('accounts', nextId);
  const bills = new Overlay('bills', nextId);
  const budgets = new Overlay('budgets', nextId);
  const categories = new Overlay('categories', nextId);
  const tags = new Overlay('tags', nextId);
  const piggies = new Overlay('piggy_banks', nextId);

  const today = new Date().toISOString().slice(0, 10);
  const allAccounts = (): Resource[] => accounts.apply(ds.accountsAt('all', today));
  const allCategories = (): Resource[] =>
    categories.apply(ds.categories.map(([id, name]) => ({ type: 'categories', id, attributes: { name } })));
  const allTags = (): Resource[] => tags.apply(ds.tags.map((tag, i) => ({ type: 'tags', id: String(i + 1), attributes: { tag } })));
  const allBudgets = (): Resource[] => budgets.apply(ds.budgets);
  // Like Firefly, listing without a range returns the bills with no pay dates worth speaking of.
  const allBills = (start = today, end = today): Resource[] => bills.apply(ds.bills(start, end));
  const allPiggies = (): Resource[] => piggies.apply(ds.piggyBanks);

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const fail = (errors: Record<string, string[]>) => json({ message: 'The given data was invalid.', errors }, 422);
  const notFound = () => json({ message: 'Resource not found', exception: 'NotFoundHttpException' }, 404);
  const one = (r: Resource) => json({ data: r });

  // ── Accounts ───────────────────────────────────────────────────────────────
  const kindOf = (a: Resource): AccountKind | null => accountKind(str(a.attributes['type']));
  const accountById = (id: string) => allAccounts().find((a) => a.id === id);
  const accountByName = (name: string, kinds: AccountKind[]) =>
    allAccounts().find((a) => str(a.attributes['name']).toLowerCase() === name.toLowerCase() && kinds.includes(kindOf(a)!));

  function createAccountNamed(name: string, kind: 'expense' | 'revenue') {
    return accounts.create({
      name,
      type: kind,
      active: true,
      account_role: null,
      currency_code: ds.primary.code,
      primary_currency_code: ds.primary.code,
      current_balance: '0.00',
      pc_current_balance: null,
      include_net_worth: true,
    });
  }

  function validateAccount(b: Attrs, existing?: Attrs): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    const type = str(b['type'] ?? existing?.['type']);
    if (!existing || has(b, 'name')) {
      if (!str(b['name']).trim()) errors['name'] = ['The name field is required.'];
    }
    if (!existing && !['asset', 'expense', 'revenue', 'liability', 'liabilities'].includes(type)) {
      errors['type'] = ['The selected type is invalid.'];
    }
    if (!existing && type === 'asset' && !str(b['account_role'])) errors['account_role'] = ['The account role field is required.'];
    if (!existing && (type === 'asset' || type.startsWith('liabilit')) && !str(b['currency_code']) && !str(b['currency_id'])) {
      errors['currency_code'] = ['The currency code field is required.'];
    }
    if (!existing && type.startsWith('liabilit')) {
      if (!['loan', 'debt', 'mortgage'].includes(str(b['liability_type']))) errors['liability_type'] = ['The selected liability type is invalid.'];
      if (!['credit', 'debit'].includes(str(b['liability_direction']))) errors['liability_direction'] = ['The selected liability direction is invalid.'];
    }
    return errors;
  }

  function accountAttrs(b: Attrs, base: Attrs = {}): Attrs {
    const type = str(b['type'] ?? base['type']);
    const out: Attrs = { ...base };
    const copy = (from: string, to = from) => {
      if (has(b, from)) out[to] = b[from];
    };
    out['type'] = type.startsWith('liabilit') ? 'liabilities' : type;
    copy('name');
    out['active'] = has(b, 'active') ? b['active'] !== false : (base['active'] ?? true);
    copy('account_role');
    copy('currency_code');
    copy('iban');
    copy('notes');
    copy('include_net_worth');
    copy('credit_card_type');
    copy('monthly_payment_date');
    copy('liability_type');
    copy('liability_direction');
    copy('interest');
    copy('interest_period');
    copy('opening_balance');
    copy('opening_balance_date');
    out['primary_currency_code'] = ds.primary.code;
    out['current_balance'] = base['current_balance'] ?? str(b['opening_balance'] ?? '0.00') ?? '0.00';
    out['pc_current_balance'] = null;
    if (out['include_net_worth'] === undefined) out['include_net_worth'] = true;
    return out;
  }

  // ── Transactions ───────────────────────────────────────────────────────────
  const dateOf = (v: string): string => {
    if (v.length === 10) return `${v}T00:00:00-04:00`;
    return /(Z|[+-]\d{2}:?\d{2})$/.test(v) ? v : `${v}-04:00`;
  };

  /** Validates one split body and builds the stored split; returns errors keyed like Firefly's. */
  function buildSplit(t: Attrs, index: number, journalId: string, rules: boolean): { split?: Attrs; errors?: Record<string, string[]> } {
    const e: Record<string, string[]> = {};
    const key = (f: string) => `transactions.${index}.${f}`;
    const type = str(t['type']);
    if (!['withdrawal', 'deposit', 'transfer'].includes(type)) e[key('type')] = ['The selected type is invalid.'];
    if (!str(t['description']).trim()) e[key('description')] = ['The description field is required.'];
    if (!isPositiveAmount(str(t['amount']))) e[key('amount')] = ['The amount must be greater than 0.'];
    if (!isDate(str(t['date']))) e[key('date')] = ['The date field is not a valid date.'];

    let source = t['source_id'] ? accountById(str(t['source_id'])) : undefined;
    let dest = t['destination_id'] ? accountById(str(t['destination_id'])) : undefined;
    if (t['source_id'] && !source) e[key('source_id')] = ['The selected source account is invalid.'];
    if (t['destination_id'] && !dest) e[key('destination_id')] = ['The selected destination account is invalid.'];
    const srcName = str(t['source_name']).trim();
    const dstName = str(t['destination_name']).trim();
    if (!t['source_id'] && !srcName) e[key('source_id')] = ['The source account is required.'];
    if (!t['destination_id'] && !dstName) e[key('destination_id')] = ['The destination account is required.'];

    if (!source && srcName) source = accountByName(srcName, ['asset', 'liability', 'revenue', 'cash']);
    if (!dest && dstName) dest = accountByName(dstName, ['asset', 'liability', 'expense', 'cash']);
    const slot = (r: Resource | undefined, named: string): AccountSlot => (r ? kindOf(r) : named ? 'new' : null);
    const inferred = inferTransactionType(slot(source, srcName), slot(dest, dstName));
    if (!Object.keys(e).length && inferred !== type) {
      e[key('destination_id')] = [`Account types are not valid for a ${type} (${inferred ?? 'no valid type'}).`];
    }
    if (Object.keys(e).length) return { errors: e };

    const sCur = str(source?.attributes['currency_code']) || ds.primary.code;
    const dCur = str(dest?.attributes['currency_code']) || ds.primary.code;
    const currency = str(t['currency_code']) || (type === 'deposit' ? dCur : sCur);
    const foreignAmount = str(t['foreign_amount']);
    const foreignCode = str(t['foreign_currency_code']);
    if (foreignAmount && !isPositiveAmount(foreignAmount)) {
      return { errors: { [key('foreign_amount')]: ['The foreign amount must be greater than 0.'] } };
    }
    if (type === 'transfer' && sCur !== dCur && !isPositiveAmount(foreignAmount)) {
      return { errors: { [key('foreign_amount')]: ['A transfer between currencies needs the foreign amount.'] } };
    }
    const budget = t['budget_id'] ? allBudgets().find((b) => b.id === str(t['budget_id'])) : undefined;
    if (t['budget_id'] && !budget) return { errors: { [key('budget_id')]: ['The selected budget is invalid.'] } };
    const billId = str(t['bill_id'] ?? t['subscription_id']);
    const bill = billId ? allBills().find((b) => b.id === billId) : undefined;
    if (billId && !bill) return { errors: { [key('bill_id')]: ['The selected bill is invalid.'] } };

    // Everything is valid: now create what's new (expense / revenue accounts, categories).
    source ??= createAccountNamed(srcName, 'revenue');
    dest ??= createAccountNamed(dstName, 'expense');
    const catName = str(t['category_name']).trim();
    const cat = catName
      ? (allCategories().find((c) => str(c.attributes['name']).toLowerCase() === catName.toLowerCase()) ?? categories.create({ name: catName }))
      : t['category_id']
        ? allCategories().find((c) => c.id === str(t['category_id']))
        : undefined;

    const tagList = Array.isArray(t['tags']) ? (t['tags'] as unknown[]).map(str).filter(Boolean) : [];
    let notes = t['notes'] ? str(t['notes']) : null;
    // Stand-in for a user rule: a description mentioning "regla" gets tagged when rules run.
    if (rules && /regla/i.test(str(t['description'])) && !tagList.includes('regla-aplicada')) tagList.push('regla-aplicada');
    if (rules && /regla-nota/i.test(str(t['description']))) notes = `${notes ?? ''}[regla]`;

    const label = (r: Resource) => TYPE_LABEL[kindOf(r) ?? 'asset'];
    return {
      split: {
        transaction_journal_id: journalId,
        type,
        date: dateOf(str(t['date'])),
        description: str(t['description']),
        amount: str(t['amount']),
        pc_amount: currency === ds.primary.code ? str(t['amount']) : null,
        currency_code: currency,
        primary_currency_code: ds.primary.code,
        foreign_amount: foreignAmount || null,
        foreign_currency_code: foreignAmount ? foreignCode || (type === 'transfer' ? dCur : null) : null,
        source_id: source.id,
        source_name: str(source.attributes['name']),
        source_type: label(source),
        destination_id: dest.id,
        destination_name: str(dest.attributes['name']),
        destination_type: label(dest),
        category_id: cat?.id ?? null,
        category_name: cat ? str(cat.attributes['name']) : null,
        budget_id: budget?.id ?? null,
        budget_name: budget ? str(budget.attributes['name']) : null,
        bill_id: bill?.id ?? null,
        bill_name: bill ? str(bill.attributes['name']) : null,
        tags: tagList,
        notes,
      },
    };
  }

  const groupById = (id: string) => ds.groups.find((g) => g.id === id);
  const splitsOf = (g: Resource) => g.attributes['transactions'] as Attrs[];

  function storeTransaction(body: Attrs): Response {
    const list = Array.isArray(body['transactions']) ? (body['transactions'] as Attrs[]) : [];
    if (!list.length) return fail({ transactions: ['The transactions field is required.'] });
    const rules = body['apply_rules'] === true;
    const built: Attrs[] = [];
    const errors: Record<string, string[]> = {};
    list.forEach((t, i) => {
      const r = buildSplit(t, i, nextId(), rules);
      if (r.errors) Object.assign(errors, r.errors);
      else built.push(r.split!);
    });
    if (Object.keys(errors).length) return fail(errors);
    const group: Resource = { type: 'transactions', id: nextId(), attributes: { group_title: body['group_title'] ?? null, transactions: built } };
    ds.groups.push(group);
    return one(group);
  }

  function updateTransaction(id: string, body: Attrs): Response {
    const group = groupById(id);
    if (!group) return notFound();
    const current = splitsOf(group);
    const rules = body['apply_rules'] === true;
    let next = current;
    if (Array.isArray(body['transactions'])) {
      // Like Firefly: parts that aren't sent are deleted.
      const errors: Record<string, string[]> = {};
      next = (body['transactions'] as Attrs[]).flatMap((t, i) => {
        const base = current.find((c) => str(c['transaction_journal_id']) === str(t['transaction_journal_id'])) ?? current[i];
        const fromBase: Attrs = base ? splitToBody(base) : {};
        // Sending either the id or the name of a side replaces both stored values.
        for (const side of ['source', 'destination', 'category']) {
          if (has(t, `${side}_id`) || has(t, `${side}_name`)) {
            delete fromBase[`${side}_id`];
            delete fromBase[`${side}_name`];
          }
        }
        const merged: Attrs = { ...fromBase, ...t };
        const r = buildSplit(merged, i, base ? str(base['transaction_journal_id']) : nextId(), rules);
        if (r.errors) {
          Object.assign(errors, r.errors);
          return [];
        }
        return [r.split!];
      });
      if (Object.keys(errors).length) return fail(errors);
    }
    group.attributes['transactions'] = next;
    if (has(body, 'group_title')) group.attributes['group_title'] = body['group_title'];
    return one(group);
  }

  /** The request-body shape of a stored split, so a partial PUT can be merged over it. */
  function splitToBody(s: Attrs): Attrs {
    return {
      type: s['type'],
      date: s['date'],
      description: s['description'],
      amount: s['amount'],
      currency_code: s['currency_code'],
      foreign_amount: s['foreign_amount'],
      foreign_currency_code: s['foreign_currency_code'],
      source_id: s['source_id'],
      destination_id: s['destination_id'],
      category_id: s['category_id'],
      budget_id: s['budget_id'],
      bill_id: s['bill_id'],
      tags: s['tags'],
      notes: s['notes'],
    };
  }

  // ── Simple entities ────────────────────────────────────────────────────────
  const required = (b: Attrs, field: string, label = field): string[] | null =>
    str(b[field]).trim() ? null : [`The ${label} field is required.`];

  function simpleCrud(
    store: Overlay,
    base: () => Resource[],
    id: string | undefined,
    method: string,
    body: Attrs,
    spec: { requiredField: string; attrs: (b: Attrs, existing?: Attrs) => Attrs; validate?: (b: Attrs, existing?: Attrs) => Record<string, string[]> },
  ): Response | null {
    const taken = (self?: string): Record<string, string[]> => {
      const wanted = str(body[spec.requiredField]).trim().toLowerCase();
      const clash = wanted && store.apply(base()).some((r) => r.id !== self && str(r.attributes[spec.requiredField]).trim().toLowerCase() === wanted);
      return clash ? { [spec.requiredField]: [`The ${spec.requiredField} is already in use.`] } : {};
    };
    if (method === 'POST' && !id) {
      const errors = { ...(required(body, spec.requiredField) ? { [spec.requiredField]: required(body, spec.requiredField)! } : {}), ...taken(), ...spec.validate?.(body) };
      if (Object.keys(errors).length) return fail(errors);
      return one(store.create(spec.attrs(body)));
    }
    if (!id) return null;
    const found = store.find(base(), id);
    if (!found) return notFound();
    if (method === 'GET') return one(found);
    if (method === 'DELETE') {
      store.remove(id);
      return new Response(null, { status: 204 });
    }
    if (method === 'PUT') {
      const errors = {
        ...(has(body, spec.requiredField) && required(body, spec.requiredField) ? { [spec.requiredField]: required(body, spec.requiredField)! } : {}),
        ...(has(body, spec.requiredField) ? taken(id) : {}),
        ...spec.validate?.(body, found.attributes),
      };
      if (Object.keys(errors).length) return fail(errors);
      store.patch(id, spec.attrs(body, found.attributes));
      return one(store.find(base(), id)!);
    }
    return null;
  }

  const pick = (b: Attrs, _existing: Attrs | undefined, fields: string[]): Attrs => {
    const out: Attrs = {};
    for (const f of fields) if (has(b, f)) out[f] = b[f];
    return out;
  };

  const AUTO_TYPES = ['none', 'reset', 'rollover', 'adjusted'];
  const FREQS = ['weekly', 'monthly', 'quarterly', 'half-year', 'yearly'];

  function piggyAttrs(b: Attrs, existing?: Attrs): Attrs {
    const out: Attrs = { ...existing, ...pick(b, existing, ['name', 'target_amount', 'start_date', 'target_date', 'notes', 'object_group_title', 'currency_code']) };
    if (Array.isArray(b['accounts'])) {
      const list = (b['accounts'] as Attrs[]).map((a) => ({
        account_id: str(a['account_id']),
        name: str(accountById(str(a['account_id']))?.attributes['name']),
        current_amount: Number(str(a['current_amount'] ?? '0')).toFixed(2),
      }));
      out['accounts'] = list;
      out['current_amount'] = list.reduce((sum, a) => sum + Number(a.current_amount), 0).toFixed(2);
    }
    if (out['active'] === undefined) out['active'] = true;
    out['current_amount'] ??= '0.00';
    const target = Number(out['target_amount'] ?? 0);
    out['left_to_save'] = target ? (target - Number(out['current_amount'])).toFixed(2) : null;
    return out;
  }

  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const method = init?.method ?? 'GET';
    let body: Attrs = {};
    let parsed: unknown;
    if (typeof init?.body === 'string' || init?.body instanceof Uint8Array) {
      const raw = typeof init.body === 'string' ? init.body : new TextDecoder().decode(init.body);
      try {
        parsed = raw ? JSON.parse(raw) : undefined;
      } catch {
        parsed = undefined; // e.g. the form-encoded OAuth token request
      }
      body = (parsed && typeof parsed === 'object' ? parsed : {}) as Attrs;
    }
    log.methods.push(method);
    log.paths.push(url.pathname);
    log.urls.push(url.pathname + url.search);
    log.bodies.push(parsed);

    if (url.pathname === '/oauth/token' && method === 'POST') {
      return json({ access_token: ds.token, refresh_token: 'refresh', expires_in: 3600 });
    }
    const auth = new Headers(init?.headers).get('authorization');
    if (url.pathname.startsWith('/api/') && auth !== `Bearer ${ds.token}`) return json({ message: 'Unauthenticated.' }, 401);

    const p = url.pathname.replace(/^\/api/, '');
    const q = url.searchParams;
    const start = q.get('start') ?? '0000-01-01';
    const end = q.get('end') ?? '9999-12-31';
    const currency = (c: { code: string; name: string; symbol: string }, i: number) => ({
      type: 'currencies',
      id: String(i + 1),
      attributes: { ...c, decimal_places: 2, enabled: true, primary: c.code === ds.primary.code },
    });

    // ── Writes and single-resource reads ────────────────────────────────────
    const tx = p.match(/^\/v1\/transactions(?:\/([^/]+))?$/);
    if (tx && (method !== 'GET' || tx[1])) {
      const id = tx[1];
      if (method === 'POST' && !id) return storeTransaction(body);
      if (!id) return json({ message: 'method not allowed' }, 405);
      const group = groupById(id);
      if (method === 'GET') return group ? one(group) : notFound();
      if (method === 'PUT') return updateTransaction(id, body);
      if (method === 'DELETE') {
        if (!group) return notFound();
        ds.groups.splice(ds.groups.indexOf(group), 1);
        return new Response(null, { status: 204 });
      }
    }

    const acc = p.match(/^\/v1\/accounts(?:\/([^/]+)(\/transactions)?)?$/);
    if (acc && (method !== 'GET' || acc[1])) {
      const id = acc[1];
      if (acc[2]) {
        const groups = ds.groups.filter((g) => splitsOf(g).some((s) => str(s['source_id']) === id || str(s['destination_id']) === id));
        return json(page(groups, q));
      }
      if (method === 'POST' && !id) {
        const errors = validateAccount(body);
        if (Object.keys(errors).length) return fail(errors);
        return one(accounts.create(accountAttrs(body)));
      }
      const found = id ? accountById(id) : undefined;
      if (!found) return notFound();
      if (method === 'GET') return one(found);
      if (method === 'DELETE') {
        accounts.remove(found.id);
        for (const g of [...ds.groups]) {
          if (splitsOf(g).some((s) => str(s['source_id']) === found.id || str(s['destination_id']) === found.id)) {
            ds.groups.splice(ds.groups.indexOf(g), 1);
          }
        }
        return new Response(null, { status: 204 });
      }
      if (method === 'PUT') {
        const errors = validateAccount(body, found.attributes);
        if (Object.keys(errors).length) return fail(errors);
        accounts.patch(found.id, accountAttrs(body, found.attributes));
        return one(accountById(found.id)!);
      }
    }

    const entity = p.match(/^\/v1\/(categories|tags|budgets|bills|piggy-banks)(?:\/([^/]+))?$/);
    if (entity && (method !== 'GET' || entity[2])) {
      const [, kind, id] = entity;
      let res: Response | null = null;
      if (kind === 'categories') {
        res = simpleCrud(categories, allCategories, id, method, body, { requiredField: 'name', attrs: (b, e) => ({ ...e, ...pick(b, e, ['name', 'notes']) }) });
      } else if (kind === 'tags') {
        res = simpleCrud(tags, allTags, id, method, body, { requiredField: 'tag', attrs: (b, e) => ({ ...e, ...pick(b, e, ['tag', 'date', 'description']) }) });
      } else if (kind === 'budgets') {
        res = simpleCrud(budgets, allBudgets, id, method, body, {
          requiredField: 'name',
          attrs: (b, e) => ({ active: true, ...e, ...pick(b, e, ['name', 'active', 'notes', 'auto_budget_type', 'auto_budget_period', 'auto_budget_amount']), ...(has(b, 'auto_budget_currency_code') ? { currency_code: b['auto_budget_currency_code'] } : {}) }),
          validate: (b) => {
            const errors: Record<string, string[]> = {};
            const type = str(b['auto_budget_type'] ?? 'none');
            if (!AUTO_TYPES.includes(type)) errors['auto_budget_type'] = ['The selected auto budget type is invalid.'];
            else if (type !== 'none') {
              if (!isPositiveAmount(str(b['auto_budget_amount']))) errors['auto_budget_amount'] = ['The auto budget amount must be greater than 0.'];
              if (!str(b['auto_budget_period'])) errors['auto_budget_period'] = ['The auto budget period field is required.'];
            }
            return errors;
          },
        });
      } else if (kind === 'bills') {
        res = simpleCrud(bills, () => allBills(), id, method, body, {
          requiredField: 'name',
          attrs: (b, e) => ({ active: true, skip: 0, ...e, ...pick(b, e, ['name', 'amount_min', 'amount_max', 'currency_code', 'date', 'repeat_freq', 'skip', 'end_date', 'active', 'object_group_title', 'notes']) }),
          validate: (b, e) => {
            const errors: Record<string, string[]> = {};
            const min = str(b['amount_min'] ?? e?.['amount_min']);
            const max = str(b['amount_max'] ?? e?.['amount_max']);
            if (!e || has(b, 'amount_min')) if (!isPositiveAmount(min)) errors['amount_min'] = ['The minimum amount must be greater than 0.'];
            if (!e || has(b, 'amount_max')) if (!isPositiveAmount(max)) errors['amount_max'] = ['The maximum amount must be greater than 0.'];
            if (!errors['amount_min'] && !errors['amount_max'] && Number(min) > Number(max)) errors['amount_max'] = ['The maximum amount must be at least the minimum.'];
            if (!e || has(b, 'date')) if (!isDate(str(b['date']))) errors['date'] = ['The date field is not a valid date.'];
            if (!e || has(b, 'repeat_freq')) if (!FREQS.includes(str(b['repeat_freq']))) errors['repeat_freq'] = ['The selected repeat frequency is invalid.'];
            const endDate = str(b['end_date'] ?? e?.['end_date']);
            const date = str(b['date'] ?? e?.['date']);
            if (endDate && date && endDate.slice(0, 10) <= date.slice(0, 10)) errors['end_date'] = ['The end date must be after the date.'];
            return errors;
          },
        });
      } else {
        res = simpleCrud(piggies, allPiggies, id, method, body, {
          requiredField: 'name',
          attrs: piggyAttrs,
          validate: (b) => {
            const errors: Record<string, string[]> = {};
            if (has(b, 'accounts')) {
              const list = Array.isArray(b['accounts']) ? (b['accounts'] as Attrs[]) : [];
              list.forEach((a, i) => {
                if (!accountById(str(a['account_id']))) errors[`accounts.${i}.account_id`] = ['The selected account is invalid.'];
              });
            } else if (method === 'POST') errors['accounts'] = ['The accounts field is required.'];
            if (b['target_amount'] && !isPositiveAmount(str(b['target_amount']))) errors['target_amount'] = ['The target amount must be greater than 0.'];
            return errors;
          },
        });
      }
      if (res) return res;
    }
    if (method !== 'GET') return json({ message: `not mocked: ${method} ${p}` }, 405);

    // ── Lists ───────────────────────────────────────────────────────────────
    if (p === '/v1/about') return json({ data: { version: ds.version, api_version: ds.version, php_version: '8.4', os: 'Linux', driver: 'mysql' } });
    if (p === '/v1/about/user') return json({ data: { type: 'users', id: '1', attributes: { email: ds.email } } });
    if (p === '/v1/currencies/primary') return json({ data: currency(ds.primary, 0) });
    if (p === '/v1/currencies') return json(page(ds.currencies.map(currency), q));
    if (p === '/v1/exchange-rates') return json(page(ds.rates.map((r, i) => ({ type: 'currency_exchange_rates', id: String(i + 1), attributes: r })), q));
    if (p === '/v1/transactions') {
      const type = q.get('type') ?? 'all';
      const rows = ds.groups.filter((g) => {
        const t = splitsOf(g)[0];
        if (!t) return false;
        const d = String(t['date']).slice(0, 10);
        return d >= start && d <= end && (type === 'all' || t['type'] === type);
      });
      return json(page(rows, q));
    }
    if (p === '/v1/autocomplete/transactions') {
      const needle = (q.get('query') ?? '').toLowerCase();
      const limit = Number(q.get('limit') ?? 10) || 10;
      const hits = ds.groups
        .flatMap((g) => splitsOf(g).map((t) => ({ id: str(t['transaction_journal_id']), transaction_group_id: g.id, name: str(t['description']), description: str(t['description']) })))
        .filter((x) => x.description.toLowerCase().includes(needle))
        .sort((a, b) => a.description.localeCompare(b.description));
      return json(hits.slice(0, limit));
    }
    if (p === '/v1/search/transactions') {
      const needle = (q.get('query') ?? '').toLowerCase();
      const rows = ds.groups.filter((g) => splitsOf(g).some((t) => String(t['description']).toLowerCase().includes(needle)));
      return json(page(rows, q));
    }
    if (p === '/v1/accounts') {
      const type = q.get('type') ?? 'all';
      const date = q.get('date') ?? end;
      const own = accounts
        .createdItems()
        .filter((a) => type === 'all' || str(a.attributes['type']) === type || (type === 'liabilities' && kindOf(a) === 'liability'));
      return json(page([...accounts.applyBase(ds.accountsAt(type, date)), ...own], q));
    }
    if (p === '/v1/categories') return json(page(allCategories(), q));
    if (p === '/v1/tags') return json(page(allTags(), q));
    if (p === '/v1/budgets') return json(page(allBudgets(), q));
    if (p === '/v1/budget-limits') return json({ data: ds.limits(start, end) });
    if (p === '/v1/available-budgets') return json(page(ds.available?.(start, end) ?? [], q));
    if (p === '/v1/bills') return json(page(q.has('start') && q.has('end') ? allBills(start, end) : allBills(), q));
    if (p === '/v1/recurrences') return json(page(ds.recurrences, q));
    if (p === '/v1/piggy-banks') return json(page(allPiggies(), q));
    const ev = p.match(/^\/v1\/piggy-banks\/([^/]+)\/events$/);
    if (ev) return json(page((ds.piggyEvents?.[ev[1]] ?? []).map((a, i) => ({ type: 'piggy_bank_events', id: String(i), attributes: a })), q));
    return json({ message: `not mocked: ${p}` }, 404);
  }) as typeof fetch;
}
