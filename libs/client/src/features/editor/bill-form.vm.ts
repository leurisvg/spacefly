import { computed, inject, signal } from '@angular/core';
import { max, maxLength, min, validate } from '@angular/forms/signals';
import { isIsoDate, isPositiveAmount, todayIso, type BillEditPayload, type BillWrite, type RepeatFreq } from '@spacefly/shared';
import { EditorLookupsStore } from '../../state/editor-lookups.store';
import { MetaStore } from '../../state/meta.store';
import { entityFormViewModel, type EntityFormInputs } from './entity-form.vm';

export interface BillModel {
  name: string;
  /** Same amount every time: only one amount is asked and it is sent as both minimum and maximum. */
  fixed: boolean;
  amountMin: string;
  amountMax: string;
  currency: string;
  date: string;
  repeatFreq: RepeatFreq;
  skip: number;
  endDate: string;
  active: boolean;
  group: string;
  notes: string;
}

const FREQS: RepeatFreq[] = ['weekly', 'monthly', 'quarterly', 'half-year', 'yearly'];

/** Create or edit a subscription (bill): amounts, first date, frequency, optional end, group and notes. */
export function billFormViewModel(inputs: EntityFormInputs) {
  const lookups = inject(EditorLookupsStore);
  const meta = inject(MetaStore);
  const blank = (): BillModel => ({
    name: '',
    fixed: true,
    amountMin: '',
    amountMax: '',
    currency: meta.primary(),
    date: todayIso(),
    repeatFreq: 'monthly',
    skip: 0,
    endDate: '',
    active: true,
    group: '',
    notes: '',
  });
  const model = signal(blank());
  const base = entityFormViewModel<BillModel, BillEditPayload>({
    ...inputs,
    kind: 'bill',
    path: 'bills',
    model,
    schema: (p) => {
      validate(p.name, (c) => (c.value().trim() ? undefined : { kind: 'required' }));
      maxLength(p.name, 255);
      maxLength(p.group, 255);
      maxLength(p.notes, 65000);
      validate(p.amountMin, (c) => (!c.value().trim() ? { kind: 'required' } : isPositiveAmount(c.value()) ? undefined : { kind: 'positive' }));
      validate(p.amountMax, (c) => {
        if (model().fixed) return undefined;
        if (!c.value().trim()) return { kind: 'required' };
        if (!isPositiveAmount(c.value())) return { kind: 'positive' };
        return isPositiveAmount(model().amountMin) && Number(c.value()) < Number(model().amountMin) ? { kind: 'range' } : undefined;
      });
      validate(p.date, (c) => (isIsoDate(c.value()) ? undefined : { kind: 'date' }));
      validate(p.endDate, (c) => {
        if (!c.value()) return undefined;
        if (!isIsoDate(c.value())) return { kind: 'date' };
        return isIsoDate(model().date) && c.value() <= model().date ? { kind: 'endDate' } : undefined;
      });
      min(p.skip, 0);
      max(p.skip, 31);
    },
    blank,
    toModel: (p) => ({
      name: p.name,
      fixed: Number(p.amountMin) === Number(p.amountMax),
      amountMin: p.amountMin,
      amountMax: p.amountMax,
      currency: p.currency,
      date: p.date,
      repeatFreq: p.repeatFreq,
      skip: p.skip,
      endDate: p.endDate ?? '',
      active: p.active,
      group: p.group ?? '',
      notes: p.notes ?? '',
    }),
    toRequest: (m): BillWrite => ({
      name: m.name.trim(),
      amountMin: m.amountMin,
      amountMax: m.fixed ? m.amountMin : m.amountMax,
      currency: m.currency,
      date: m.date,
      repeatFreq: m.repeatFreq,
      skip: Number.isFinite(m.skip) ? m.skip : 0,
      endDate: m.endDate || null,
      active: m.active,
      group: m.group.trim() || null,
      notes: m.notes.trim() || null,
    }),
    displayName: (m) => m.name,
  });

  return {
    ...base,
    freqOptions: computed(() => FREQS.map((x) => ({ value: x, label: base.i18n.t(`bills.freq.${x}`) }))),
    currencyOptions: computed(() => lookups.currencies().map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` }))),
  };
}
