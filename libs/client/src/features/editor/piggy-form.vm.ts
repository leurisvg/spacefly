import { computed, inject, signal } from '@angular/core';
import { applyEach, maxLength, validate } from '@angular/forms/signals';
import { isIsoDate, isPositiveAmount, parseAmount, type PiggyEditPayload, type PiggyWrite } from '@spacefly/shared';
import { EditorLookupsStore } from '../../state/editor-lookups.store';
import { MetaStore } from '../../state/meta.store';
import { entityFormViewModel, type EntityFormInputs } from './entity-form.vm';

export interface PiggyRow {
  accountId: string;
  /** Money set aside in this goal from that account. */
  currentAmount: string;
  /** Scratch amount for "add / remove". */
  adjust: string;
}

export interface PiggyModel {
  name: string;
  currency: string;
  targetAmount: string;
  startDate: string;
  targetDate: string;
  group: string;
  notes: string;
  accounts: PiggyRow[];
}

const cents = (amount: string): number => Math.round(Number(amount) * 100);

/**
 * Create or edit a goal (piggy bank): name, currency, target, dates and the accounts it saves from, each with its amount. "Add /
 * remove" moves the saved amount of one account up or down; saving always sends the complete list, because Firefly replaces the
 * goal's accounts with it.
 */
export function piggyFormViewModel(inputs: EntityFormInputs) {
  const lookups = inject(EditorLookupsStore);
  const meta = inject(MetaStore);
  const blank = (): PiggyModel => ({ name: '', currency: meta.primary(), targetAmount: '', startDate: '', targetDate: '', group: '', notes: '', accounts: [] });
  const model = signal(blank());
  const base = entityFormViewModel<PiggyModel, PiggyEditPayload>({
    ...inputs,
    kind: 'piggy',
    path: 'piggy-banks',
    model,
    schema: (p) => {
      validate(p.name, (c) => (c.value().trim() ? undefined : { kind: 'required' }));
      maxLength(p.name, 255);
      maxLength(p.group, 255);
      maxLength(p.notes, 65000);
      validate(p.targetAmount, (c) => (!c.value().trim() || isPositiveAmount(c.value()) ? undefined : { kind: 'positive' }));
      validate(p.startDate, (c) => (!c.value() || isIsoDate(c.value()) ? undefined : { kind: 'date' }));
      validate(p.targetDate, (c) => {
        if (!c.value()) return undefined;
        if (!isIsoDate(c.value())) return { kind: 'date' };
        return model().startDate && c.value() < model().startDate ? { kind: 'endDate' } : undefined;
      });
      validate(p.accounts, (c) => (c.value().length ? undefined : { kind: 'accounts' }));
      applyEach(p.accounts, (row) => {
        validate(row.currentAmount, (c) => (/^\d+(\.\d+)?$/.test(c.value().trim()) ? undefined : { kind: 'amount' }));
      });
    },
    blank,
    toModel: (p) => ({
      name: p.name,
      currency: p.currency,
      targetAmount: p.targetAmount ?? '',
      startDate: p.startDate ?? '',
      targetDate: p.targetDate ?? '',
      group: p.group ?? '',
      notes: p.notes ?? '',
      accounts: p.accounts.map((a) => ({ accountId: a.accountId, currentAmount: a.currentAmount, adjust: '' })),
    }),
    /** The complete list of accounts, always: Firefly drops the ones that aren't sent. */
    toRequest: (m): PiggyWrite => ({
      name: m.name.trim(),
      currency: m.currency,
      targetAmount: m.targetAmount.trim() || null,
      startDate: m.startDate || null,
      targetDate: m.targetDate || null,
      group: m.group.trim() || null,
      notes: m.notes.trim() || null,
      accounts: m.accounts.map((a) => ({ accountId: a.accountId, currentAmount: a.currentAmount.trim() })),
    }),
    displayName: (m) => m.name,
  });

  const canAdjust = (index: number): boolean => {
    const raw = model().accounts[index]?.adjust ?? '';
    return isPositiveAmount(parseAmount(raw) ?? raw);
  };

  return {
    ...base,
    canAdjust,
    currencyOptions: computed(() => lookups.currencies().map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` }))),
    /** Asset accounts not in the goal yet; once the goal has one, only those in its currency. */
    accountOptions: computed(() => {
      const m = model();
      const taken = new Set(m.accounts.map((a) => a.accountId));
      return lookups
        .accounts()
        .filter((a) => a.kind === 'asset' && !taken.has(a.id) && (m.accounts.length === 0 || a.currency === m.currency))
        .map((a) => ({ value: a.id, label: `${a.name} · ${a.currency}` }));
    }),

    accountName(id: string | undefined): string {
      return lookups.accounts().find((a) => a.id === id)?.name ?? id ?? '';
    },

    addAccount(id: string): void {
      if (!id) return;
      const account = lookups.accounts().find((a) => a.id === id);
      model.update((m) => ({
        ...m,
        // The first account decides the currency of the goal.
        currency: m.accounts.length === 0 && account ? account.currency : m.currency,
        accounts: [...m.accounts, { accountId: id, currentAmount: '0', adjust: '' }],
      }));
    },

    removeAccount(index: number): void {
      model.update((m) => ({ ...m, accounts: m.accounts.filter((_, i) => i !== index) }));
    },

    /** Adds to or removes from what one account has set aside (never below zero). */
    adjust(index: number, sign: 1 | -1): void {
      model.update((m) => ({
        ...m,
        accounts: m.accounts.map((row, i) => {
          if (i !== index || !canAdjust(i)) return row;
          const delta = cents(parseAmount(row.adjust) ?? row.adjust);
          const next = Math.max(0, cents(row.currentAmount) + sign * delta);
          return { ...row, currentAmount: (next / 100).toFixed(2), adjust: '' };
        }),
      }));
    },
  };
}
