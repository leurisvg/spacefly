import { httpResource } from '@angular/common/http';
import { computed, effect, inject, linkedSignal, signal, untracked, type Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, maxLength, submit, validate, type FieldTree, type ValidationError } from '@angular/forms/signals';
import { Subject, debounceTime } from 'rxjs';
import {
  amountSide,
  inferTransactionType,
  isIsoDate,
  isPositiveAmount,
  todayIso,
  type AccountInput,
  type AccountSlot,
  type EditorAccount,
  type TxEditPayload,
  type TxWriteRequest,
} from '@spacefly/shared';
import { WriteApi, WriteError } from '../../api/write-api';
import { I18n } from '../../i18n/i18n';
import { BackNavigation } from '../../platform/back-navigation';
import { Confirm } from '../../platform/confirm';
import { Toast } from '../../platform/toast';
import { EditorLookupsStore } from '../../state/editor-lookups.store';
import { localPref } from '../../state/local-pref';
import { MetaStore } from '../../state/meta.store';
import { nowTime, parseTime } from '../../ui-logic/time';

/** The form's own shape: strings everywhere so every control binds directly. */
export interface TxModel {
  description: string;
  source: AccountInput | null;
  destination: AccountInput | null;
  amount: string;
  /** Amount in the other currency (received amount of a cross-currency transfer, or "other currency"). */
  foreignAmount: string;
  foreignCurrency: string;
  otherCurrency: boolean;
  date: string;
  /** `HH:mm`, or empty to let the server decide (noon, or the stored time when editing an unchanged day). */
  time: string;
  category: string;
  budgetId: string;
  billId: string;
  tags: string[];
  notes: string;
}

export interface AfterSave {
  /** Stay on the form after saving instead of going back. */
  stay: boolean;
  /** When staying after a creation: empty the form (today's date, default account) instead of keeping the data. */
  reset: boolean;
}

/** What `/transactions/new?source=…&destination=…` can pre-fill (account ids or names, plain text). */
export interface TxQueryValues {
  source?: string;
  destination?: string;
  date?: string;
  description?: string;
  amount?: string;
  category?: string;
  budget?: string;
  bill?: string;
}

export type TxFormState = 'loading' | 'ready' | 'notEditable' | 'missing' | 'error';

export const TX_FORM_FALLBACK = '/transactions';

export const blankTxModel = (): TxModel => ({
  description: '',
  source: null,
  destination: null,
  amount: '',
  foreignAmount: '',
  foreignCurrency: '',
  otherCurrency: false,
  date: todayIso(),
  time: nowTime(),
  category: '',
  budgetId: '',
  billId: '',
  tags: [],
  notes: '',
});

export const isAfterSave = (v: unknown): v is AfterSave =>
  !!v && typeof v === 'object' && typeof (v as AfterSave).stay === 'boolean' && typeof (v as AfterSave).reset === 'boolean';

/**
 * Today's date, the default account and whatever the query string asked for. `accountIds` tells an existing
 * account (by id) from a name to create.
 */
export function withDefaults(m: TxModel, ctx: { accountIds: ReadonlySet<string>; defaultAccountId: string | null; query: TxQueryValues | null }): TxModel {
  const asAccount = (v: string | undefined): AccountInput | null => (!v ? null : ctx.accountIds.has(v) ? { id: v } : { name: v });
  const q = ctx.query;
  return {
    ...m,
    source: asAccount(q?.source) ?? (ctx.defaultAccountId ? { id: ctx.defaultAccountId } : null),
    destination: asAccount(q?.destination),
    date: q?.date && isIsoDate(q.date) ? q.date : todayIso(),
    time: nowTime(),
    description: q?.description ?? m.description,
    amount: q?.amount && isPositiveAmount(q.amount) ? q.amount : m.amount,
    category: q?.category ?? m.category,
    budgetId: q?.budget ?? m.budgetId,
    billId: q?.bill ?? m.billId,
  };
}

/** The form model of a stored transaction. */
export function txModelFromPayload(tx: TxEditPayload): TxModel {
  const hasForeign = tx.type !== 'transfer' && !!tx.foreignAmount;
  return {
    description: tx.description,
    source: { id: tx.source.id },
    destination: { id: tx.destination.id },
    amount: tx.amount,
    foreignAmount: tx.foreignAmount ?? '',
    foreignCurrency: tx.foreignCurrency ?? '',
    otherCurrency: hasForeign,
    date: tx.date,
    time: tx.time ?? '',
    category: tx.category ?? '',
    budgetId: tx.budgetId ?? '',
    billId: tx.billId ?? '',
    tags: tx.tags,
    notes: tx.notes ?? '',
  };
}

/** The write request for a valid model. `foreign` is the already-resolved other-currency amount, if the type needs one. */
export function buildTxRequest(m: TxModel, type: ReturnType<typeof inferTransactionType>, foreign: { amount: string; currency: string } | null): TxWriteRequest {
  return {
    description: m.description.trim(),
    date: m.date,
    time: parseTime(m.time),
    source: m.source!,
    destination: m.destination!,
    amount: m.amount,
    foreignAmount: foreign?.amount ?? null,
    foreignCurrency: foreign?.currency ?? null,
    category: m.category.trim() || null,
    budgetId: type === 'withdrawal' ? m.budgetId || null : null,
    billId: type === 'withdrawal' ? m.billId || null : null,
    tags: m.tags,
    notes: m.notes.trim() || null,
  };
}

export interface TxFormInputs {
  /** Route param of `/transactions/:id/edit`. */
  id: Signal<string | undefined>;
  /** Pre-fill from the route's query string (create mode). */
  query: Signal<TxQueryValues>;
}

/**
 * Create or edit one transaction. The user never picks a type: it follows from the two accounts and is shown
 * live. Firefly's rules and webhooks always run on save. Call it in an injection context; the signal form
 * (`f`) is bound by each platform's controls.
 */
export function transactionFormViewModel(inputs: TxFormInputs) {
  const i18n = inject(I18n);
  const lookups = inject(EditorLookupsStore);
  const api = inject(WriteApi);
  const meta = inject(MetaStore);
  const back = inject(BackNavigation);
  const confirm = inject(Confirm);
  const toast = inject(Toast);

  const isEdit = computed(() => !!inputs.id());
  const state = signal<TxFormState>('ready');
  const blockedReason = signal<string | null>(null);
  const saving = signal(false);
  const after = localPref<AfterSave>('spacefly.tx.afterSave', { stay: false, reset: true }, isAfterSave);

  const model = signal<TxModel>(blankTxModel());

  // ── What the chosen accounts mean ───────────────────────────────────────────
  const accountById = computed(() => new Map<string, EditorAccount>(lookups.accounts().map((a) => [a.id, a])));
  const slotOf = (v: AccountInput | null): AccountSlot => {
    if (!v) return null;
    if ('name' in v) return 'new';
    return accountById().get(v.id)?.kind ?? null;
  };
  const sourceSlot = computed(() => slotOf(model().source));
  const destinationSlot = computed(() => slotOf(model().destination));
  const sourceAccount = computed(() => {
    const s = model().source;
    return s && 'id' in s ? accountById().get(s.id) : undefined;
  });
  const destinationAccount = computed(() => {
    const d = model().destination;
    return d && 'id' in d ? accountById().get(d.id) : undefined;
  });
  const type = computed(() => inferTransactionType(sourceSlot(), destinationSlot()));
  /** The amount is in the currency of the account on the amount side; the source's while the type is unknown. */
  const amountCurrency = computed(() => {
    const t = type();
    const account = t && amountSide(t) === 'destination' ? destinationAccount() : sourceAccount();
    return account?.currency ?? sourceAccount()?.currency ?? meta.primary();
  });
  const receivedCurrency = computed(() => destinationAccount()?.currency ?? '');
  const crossCurrency = computed(() => type() === 'transfer' && !!sourceAccount() && !!destinationAccount() && sourceAccount()!.currency !== destinationAccount()!.currency);
  const showOtherCurrency = computed(() => type() === 'withdrawal' || type() === 'deposit');
  const showBudgetBill = computed(() => type() === 'withdrawal');
  const foreignRequired = computed(() => crossCurrency() || (showOtherCurrency() && model().otherCurrency));

  const f = form(model, (p) => {
    validate(p.description, (c) => (c.value().trim() ? undefined : { kind: 'required' }));
    maxLength(p.description, 1000);
    maxLength(p.notes, 65000);
    validate(p.source, (c) => (c.value() ? undefined : { kind: 'required' }));
    validate(p.destination, (c) => {
      if (!c.value()) return { kind: 'required' };
      return sourceSlot() && type() === null ? { kind: 'combination' } : undefined;
    });
    validate(p.amount, (c) => (!c.value().trim() ? { kind: 'required' } : isPositiveAmount(c.value()) ? undefined : { kind: 'positive' }));
    validate(p.foreignAmount, (c) => {
      if (!foreignRequired()) return undefined;
      return !c.value().trim() ? { kind: 'foreign' } : isPositiveAmount(c.value()) ? undefined : { kind: 'positive' };
    });
    validate(p.foreignCurrency, (c) => (foreignRequired() && !crossCurrency() && !c.value() ? { kind: 'required' } : undefined));
    validate(p.date, (c) => (isIsoDate(c.value()) ? undefined : { kind: 'date' }));
    validate(p.time, (c) => (!c.value().trim() || parseTime(c.value()) ? undefined : { kind: 'time' }));
  });

  // ── Option lists ────────────────────────────────────────────────────────────
  const categoryOptions = computed(() => lookups.categories().map((c) => ({ value: c.name, label: c.name })));
  const budgetOptions = computed(() => lookups.budgets().map((b) => ({ value: b.id, label: b.name })));
  const billOptions = computed(() =>
    lookups
      .bills()
      .filter((b) => b.active || b.id === model().billId)
      .map((b) => ({ value: b.id, label: b.name })),
  );
  const tagNames = computed(() => lookups.tags().map((t) => t.name));
  const otherCurrencyOptions = computed(() =>
    lookups
      .currencies()
      .filter((c) => c.code !== amountCurrency())
      .map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` })),
  );

  // ── Description suggestions: what was used before, as you type ──────────────
  const descriptionTerm = signal('');
  const typed$ = new Subject<string>();
  typed$.pipe(debounceTime(200), takeUntilDestroyed()).subscribe((term) => descriptionTerm.set(term));
  const suggestionsRes = httpResource<string[]>(() => (descriptionTerm() ? { url: '/api/lookups/descriptions', params: { q: descriptionTerm() } } : undefined));
  /** Keeps the previous suggestions while the next ones load (the list filters them by what is typed), so it doesn't blink on every key. */
  const descriptionOptions = linkedSignal<{ term: string; found: string[] | undefined }, { value: string; label: string }[]>({
    source: () => ({ term: descriptionTerm(), found: suggestionsRes.hasValue() ? suggestionsRes.value() : undefined }),
    computation: ({ term, found }, previous) => (!term ? [] : found ? found.map((d) => ({ value: d, label: d })) : (previous?.value ?? [])),
  });

  const formErrors = computed(() => f().errors().map((e) => e.message ?? ''));
  const fireflyUrl = computed(() => (inputs.id() ? meta.fireflyUrl(`/transactions/show/${inputs.id()}`) : null));

  const defaults = (m: TxModel, useQuery = true): TxModel =>
    withDefaults(m, { accountIds: new Set(accountById().keys()), defaultAccountId: lookups.defaultAccountId(), query: useQuery ? inputs.query() : null });

  // ── Loading (edit) ──────────────────────────────────────────────────────────
  async function load(id: string): Promise<void> {
    state.set('loading');
    try {
      const tx = await api.getTransaction(id);
      model.set(txModelFromPayload(tx));
      f().reset();
      state.set('ready');
    } catch (err) {
      if (err instanceof WriteError && err.kind === 'not_editable') {
        blockedReason.set(err.reason);
        state.set('notEditable');
      } else {
        state.set(err instanceof WriteError && err.kind === 'not_found' ? 'missing' : 'error');
      }
    }
  }

  let initialized = false;
  // Edit mode: load the transaction whenever the route's id changes.
  effect(() => {
    const id = inputs.id();
    untracked(() => {
      if (id) void load(id);
      else state.set('ready');
    });
  });
  // Create mode: fill in the defaults once the account list is known.
  effect(() => {
    if (inputs.id() || initialized || !lookups.lookups()) return;
    untracked(() => {
      initialized = true;
      model.set(defaults(blankTxModel()));
    });
  });

  // ── Saving ──────────────────────────────────────────────────────────────────
  const request = (): TxWriteRequest => {
    const m = model();
    const foreign = crossCurrency()
      ? { amount: m.foreignAmount, currency: receivedCurrency() }
      : showOtherCurrency() && m.otherCurrency
        ? { amount: m.foreignAmount, currency: m.foreignCurrency }
        : null;
    return buildTxRequest(m, type(), foreign);
  };

  function serverErrors(err: WriteError): ValidationError.WithOptionalFieldTree[] {
    const targets: Record<string, FieldTree<unknown>> = {
      description: f.description,
      source: f.source,
      destination: f.destination,
      amount: f.amount,
      foreignAmount: f.foreignAmount,
      foreignCurrency: f.foreignCurrency,
      date: f.date,
      time: f.time,
      category: f.category,
      budgetId: f.budgetId,
      billId: f.billId,
      tags: f.tags,
      notes: f.notes,
    };
    return Object.entries(err.fields).flatMap(([key, messages]) => messages.map((message) => ({ kind: 'server', message, fieldTree: targets[key] ?? f })));
  }

  async function afterSave(): Promise<void> {
    const { stay, reset } = after();
    const id = inputs.id();
    if (!stay) {
      back.back(TX_FORM_FALLBACK);
    } else if (id) {
      // Rules may have changed fields: show what Firefly actually stored.
      await load(id);
    } else if (reset) {
      model.set(defaults(blankTxModel(), false));
      f().reset();
      f.description().focusBoundControl();
    } else {
      f().reset();
    }
  }

  /** Sends the transaction and then does what "after saving" asks for. Returns server-side field errors, if any. */
  async function persist(): Promise<ValidationError.WithOptionalFieldTree[] | undefined> {
    saving.set(true);
    try {
      const id = inputs.id();
      if (id) await api.updateTransaction(id, request());
      else await api.createTransaction(request());
      toast.success(i18n.t(id ? 'editor.tx.updated' : 'editor.tx.created'));
      await afterSave();
      return undefined;
    } catch (err) {
      if (err instanceof WriteError) {
        if (err.kind === 'validation') return serverErrors(err);
        if (err.kind === 'not_editable') {
          blockedReason.set(err.reason);
          state.set('notEditable');
          return undefined;
        }
        toast.error(i18n.t(err.kind === 'network' ? 'editor.networkError' : 'errors.generic'));
        return undefined;
      }
      toast.error(i18n.t('errors.generic'));
      return undefined;
    } finally {
      saving.set(false);
    }
  }

  return {
    i18n,
    lookups,
    isEdit,
    state,
    blockedReason,
    saving,
    after,
    model,
    f,
    sourceSlot,
    destinationSlot,
    type,
    amountCurrency,
    receivedCurrency,
    crossCurrency,
    showOtherCurrency,
    showBudgetBill,
    categoryOptions,
    budgetOptions,
    billOptions,
    tagNames,
    otherCurrencyOptions,
    descriptionOptions,
    formErrors,
    fireflyUrl,

    /** The description field changed: look up earlier descriptions once typing pauses. */
    onDescriptionTyped(text: string): void {
      const term = text.trim();
      if (!term) descriptionTerm.set('');
      typed$.next(term);
    },

    reload(): void {
      const id = inputs.id();
      if (id) void load(id);
    },

    swap(): void {
      model.update((m) => ({ ...m, source: m.destination, destination: m.source }));
    },

    setAfter(patch: Partial<AfterSave>): void {
      after.update((a) => ({ ...a, ...patch }));
    },

    cancel(): void {
      back.back(TX_FORM_FALLBACK);
    },

    async save(): Promise<void> {
      if (saving()) return;
      await submit(f, {
        action: () => persist(),
        onInvalid: (root) => root().errorSummary()[0]?.fieldTree().focusBoundControl(),
      });
    },

    async remove(): Promise<void> {
      const id = inputs.id();
      if (!id) return;
      const name = model().description || i18n.t('nav.explorer');
      const ok = await confirm.confirm({
        title: i18n.t('editor.tx.deleteTitle'),
        message: i18n.t('editor.tx.deleteMessage', { name }),
        confirmLabel: i18n.t('forms.delete'),
        destructive: true,
      });
      if (!ok) return;
      saving.set(true);
      try {
        await api.deleteTransaction(id);
        toast.success(i18n.t('editor.tx.deleted'));
        back.back(TX_FORM_FALLBACK);
      } catch {
        toast.error(i18n.t('errors.generic'));
      } finally {
        saving.set(false);
      }
    },
  };
}
