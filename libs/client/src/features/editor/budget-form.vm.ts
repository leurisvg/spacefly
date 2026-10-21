import { computed, inject, signal } from '@angular/core';
import { maxLength, validate } from '@angular/forms/signals';
import { isPositiveAmount, type AutoBudgetPeriod, type AutoBudgetType, type BudgetEditPayload, type BudgetWrite } from '@spacefly/shared';
import { EditorLookupsStore } from '../../state/editor-lookups.store';
import { MetaStore } from '../../state/meta.store';
import { entityFormViewModel, type EntityFormInputs } from './entity-form.vm';

export interface BudgetModel {
  name: string;
  active: boolean;
  notes: string;
  /** Automatic budget on/off and its settings. */
  auto: boolean;
  autoType: AutoBudgetType;
  autoAmount: string;
  autoPeriod: AutoBudgetPeriod;
  autoCurrency: string;
}

const TYPES: AutoBudgetType[] = ['reset', 'rollover', 'adjusted'];
const PERIODS: AutoBudgetPeriod[] = ['daily', 'weekly', 'monthly', 'quarterly', 'half-year', 'yearly'];

/** Create or edit a budget: name, active, notes and the optional automatic budget (type, amount, period, currency). */
export function budgetFormViewModel(inputs: EntityFormInputs) {
  const lookups = inject(EditorLookupsStore);
  const meta = inject(MetaStore);
  const blank = (): BudgetModel => ({ name: '', active: true, notes: '', auto: false, autoType: 'reset', autoAmount: '', autoPeriod: 'monthly', autoCurrency: meta.primary() });
  const model = signal(blank());
  const base = entityFormViewModel<BudgetModel, BudgetEditPayload>({
    ...inputs,
    kind: 'budget',
    path: 'budgets',
    model,
    schema: (p) => {
      validate(p.name, (c) => (c.value().trim() ? undefined : { kind: 'required' }));
      maxLength(p.name, 255);
      maxLength(p.notes, 65000);
      validate(p.autoAmount, (c) => {
        if (!model().auto) return undefined;
        return !c.value().trim() ? { kind: 'required' } : isPositiveAmount(c.value()) ? undefined : { kind: 'positive' };
      });
    },
    blank,
    toModel: (p) => ({
      name: p.name,
      active: p.active,
      notes: p.notes ?? '',
      auto: !!p.autoBudget,
      autoType: p.autoBudget?.type ?? 'reset',
      autoAmount: p.autoBudget?.amount ?? '',
      autoPeriod: p.autoBudget?.period ?? 'monthly',
      autoCurrency: p.autoBudget?.currency ?? meta.primary(),
    }),
    toRequest: (m): BudgetWrite => ({
      name: m.name.trim(),
      active: m.active,
      notes: m.notes.trim() || null,
      autoBudget: m.auto ? { type: m.autoType, amount: m.autoAmount, period: m.autoPeriod, currency: m.autoCurrency } : null,
    }),
    displayName: (m) => m.name,
  });

  return {
    ...base,
    typeOptions: computed(() => TYPES.map((t) => ({ value: t, label: base.i18n.t(`editor.entity.budget.autoTypes.${t}`) }))),
    periodOptions: computed(() => PERIODS.map((p) => ({ value: p, label: base.i18n.t(`editor.periods.${p}`) }))),
    currencyOptions: computed(() => lookups.currencies().map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` }))),
  };
}
