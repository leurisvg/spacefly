import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { form, FormField as Field, max, maxLength, min, validate } from '@angular/forms/signals';
import { isIsoDate, isPositiveAmount, todayIso, type BillEditPayload, type BillWrite, type RepeatFreq } from '@spacefly/shared';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { HlmSwitch } from '@spartan-ng/helm/switch';
import { HlmTextarea } from '@spartan-ng/helm/textarea';
import { EditorLookupsStore } from '@spacefly/client/state/editor-lookups.store';
import { MetaStore } from '@spacefly/client/state/meta.store';
import { Select } from '../../shared/components/select';
import { DateInput } from '../../shared/forms/date-input';
import { FormField } from '../../shared/forms/form-field';
import { FormFooter } from '../../shared/forms/form-footer';
import { MoneyInput } from '../../shared/forms/money-input';
import { EntityForm } from './entity-form';

interface Model {
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
@Component({
  selector: 'sf-bill-form',
  imports: [Field, HlmButton, HlmInput, HlmSkeleton, HlmSwitch, HlmTextarea, Select, DateInput, FormField, FormFooter, MoneyInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (state() === 'loading') {
      <div hlmSkeleton class="h-32 w-full"></div>
    } @else if (state() !== 'ready') {
      <p class="text-sm" role="alert">{{ i18n.t(state() === 'missing' ? 'editor.missing' : 'editor.loadError') }}</p>
      <div class="mt-3 flex gap-2">
        <button hlmBtn size="sm" variant="outline" type="button" (click)="cancel()">{{ i18n.t('editor.back') }}</button>
        @if (state() === 'error') {
          <button hlmBtn size="sm" type="button" (click)="reload()">{{ i18n.t('editor.retry') }}</button>
        }
      </div>
    } @else {
      <form class="flex flex-col gap-4" novalidate (submit)="$event.preventDefault(); save()">
        <sf-form-field [label]="i18n.t('editor.fields.name')" [required]="true" [field]="f.name">
          <input hlmInput type="text" class="h-9" autocomplete="off" [formField]="f.name" />
        </sf-form-field>

        <div class="flex flex-col gap-3 rounded-lg border border-border/70 p-3">
          <label class="flex items-center gap-2 text-sm">
            <hlm-switch [formField]="f.fixed" [aria-label]="i18n.t('editor.entity.bill.fixed')" />
            <span>{{ i18n.t('editor.entity.bill.fixed') }}</span>
          </label>
          <div class="grid gap-3 sm:grid-cols-2">
            <sf-form-field [label]="i18n.t(model().fixed ? 'editor.entity.bill.amount' : 'editor.entity.bill.amountMin')" [required]="true" [field]="f.amountMin">
              <sf-money-input [formField]="f.amountMin" [currency]="model().currency" />
            </sf-form-field>
            @if (!model().fixed) {
              <sf-form-field [label]="i18n.t('editor.entity.bill.amountMax')" [required]="true" [field]="f.amountMax">
                <sf-money-input [formField]="f.amountMax" [currency]="model().currency" />
              </sf-form-field>
            }
          </div>
          <sf-form-field [label]="i18n.t('editor.fields.currency')" [field]="f.currency">
            <sf-select [formField]="f.currency" [options]="currencyOptions()" [searchable]="false" [label]="i18n.t('editor.fields.currency')" class="w-full" />
          </sf-form-field>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <sf-form-field [label]="i18n.t('editor.entity.bill.freq')" [field]="f.repeatFreq">
            <sf-select [formField]="f.repeatFreq" [options]="freqOptions()" [searchable]="false" [label]="i18n.t('editor.entity.bill.freq')" class="w-full" />
          </sf-form-field>
          <sf-form-field [label]="i18n.t('editor.entity.bill.skip')" [hint]="i18n.t('editor.entity.bill.skipHint')" [field]="f.skip">
            <input hlmInput type="number" class="h-9" inputmode="numeric" [formField]="f.skip" />
          </sf-form-field>
        </div>
        <sf-form-field [label]="i18n.t('editor.entity.bill.date')" [required]="true" [field]="f.date">
          <sf-date-input [formField]="f.date" />
        </sf-form-field>
        <sf-form-field [label]="i18n.t('editor.entity.bill.endDate')" [hint]="i18n.t('editor.entity.bill.endDateHint')" [field]="f.endDate">
          <div class="flex items-center gap-2">
            <sf-date-input [formField]="f.endDate" />
            @if (model().endDate) {
              <button hlmBtn type="button" variant="ghost" size="sm" (click)="f.endDate().value.set('')">{{ i18n.t('editor.clear') }}</button>
            }
          </div>
        </sf-form-field>

        <label class="flex items-center gap-2 text-sm">
          <hlm-switch [formField]="f.active" [aria-label]="i18n.t('editor.fields.active')" />
          <span>{{ i18n.t('editor.fields.active') }}</span>
        </label>
        <sf-form-field [label]="i18n.t('editor.fields.group')" [field]="f.group">
          <input hlmInput type="text" class="h-9" autocomplete="off" [formField]="f.group" />
        </sf-form-field>
        <sf-form-field [label]="i18n.t('editor.fields.notes')" [field]="f.notes">
          <textarea hlmTextarea rows="3" [formField]="f.notes"></textarea>
        </sf-form-field>

        <sf-form-footer inset="sheet" [saving]="saving()" [canDelete]="isEdit()" (save)="save()" (dismissed)="cancel()" (remove)="remove()" />
      </form>
    }
  `,
})
export class BillForm extends EntityForm<Model, BillEditPayload> {
  private readonly lookups = inject(EditorLookupsStore);
  private readonly meta = inject(MetaStore);

  protected readonly kind = 'bill';
  protected readonly path = 'bills';
  protected readonly model = signal<Model>(this.blank());
  protected readonly f = form(this.model, (p) => {
    validate(p.name, (c) => (c.value().trim() ? undefined : { kind: 'required' }));
    maxLength(p.name, 255);
    maxLength(p.group, 255);
    maxLength(p.notes, 65000);
    validate(p.amountMin, (c) => (!c.value().trim() ? { kind: 'required' } : isPositiveAmount(c.value()) ? undefined : { kind: 'positive' }));
    validate(p.amountMax, (c) => {
      if (this.model().fixed) return undefined;
      if (!c.value().trim()) return { kind: 'required' };
      if (!isPositiveAmount(c.value())) return { kind: 'positive' };
      return isPositiveAmount(this.model().amountMin) && Number(c.value()) < Number(this.model().amountMin) ? { kind: 'range' } : undefined;
    });
    validate(p.date, (c) => (isIsoDate(c.value()) ? undefined : { kind: 'date' }));
    validate(p.endDate, (c) => {
      if (!c.value()) return undefined;
      if (!isIsoDate(c.value())) return { kind: 'date' };
      return isIsoDate(this.model().date) && c.value() <= this.model().date ? { kind: 'endDate' } : undefined;
    });
    min(p.skip, 0);
    max(p.skip, 31);
  });

  protected readonly freqOptions = computed(() => FREQS.map((x) => ({ value: x, label: this.i18n.t(`bills.freq.${x}`) })));
  protected readonly currencyOptions = computed(() => this.lookups.currencies().map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` })));

  protected blank(): Model {
    return {
      name: '',
      fixed: true,
      amountMin: '',
      amountMax: '',
      currency: this.meta.primary(),
      date: todayIso(),
      repeatFreq: 'monthly',
      skip: 0,
      endDate: '',
      active: true,
      group: '',
      notes: '',
    };
  }

  protected toModel(p: BillEditPayload): Model {
    return {
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
    };
  }

  protected toRequest(): BillWrite {
    const m = this.model();
    return {
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
    };
  }

  protected displayName(): string {
    return this.model().name;
  }
}
