import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { form, FormField as Field, maxLength, validate } from '@angular/forms/signals';
import { isPositiveAmount, type AutoBudgetPeriod, type AutoBudgetType, type BudgetEditPayload, type BudgetWrite } from '@spacefly/shared';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { HlmSwitch } from '@spartan-ng/helm/switch';
import { HlmTextarea } from '@spartan-ng/helm/textarea';
import { EditorLookupsStore } from '../../core/state/editor-lookups.store';
import { MetaStore } from '../../core/state/meta.store';
import { Select } from '../../shared/components/select';
import { FormField } from '../../shared/forms/form-field';
import { FormFooter } from '../../shared/forms/form-footer';
import { MoneyInput } from '../../shared/forms/money-input';
import { EntityForm } from './entity-form';

interface Model {
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
@Component({
  selector: 'sf-budget-form',
  imports: [Field, HlmButton, HlmInput, HlmSkeleton, HlmSwitch, HlmTextarea, Select, FormField, FormFooter, MoneyInput],
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
        <label class="flex items-center gap-2 text-sm">
          <hlm-switch [formField]="f.active" [aria-label]="i18n.t('editor.fields.active')" />
          <span>{{ i18n.t('editor.fields.active') }}</span>
        </label>
        <sf-form-field [label]="i18n.t('editor.fields.notes')" [field]="f.notes">
          <textarea hlmTextarea rows="3" [formField]="f.notes"></textarea>
        </sf-form-field>

        <fieldset class="flex flex-col gap-3 rounded-lg border border-border/70 p-3">
          <legend class="px-1 text-xs text-muted-foreground">{{ i18n.t('editor.entity.budget.autoHint') }}</legend>
          <label class="flex items-center gap-2 text-sm">
            <hlm-switch [formField]="f.auto" [aria-label]="i18n.t('editor.entity.budget.auto')" />
            <span>{{ i18n.t('editor.entity.budget.auto') }}</span>
          </label>
          @if (model().auto) {
            <sf-form-field [label]="i18n.t('editor.entity.budget.autoType')" [field]="f.autoType">
              <sf-select [formField]="f.autoType" [options]="typeOptions()" [searchable]="false" [label]="i18n.t('editor.entity.budget.autoType')" class="w-full" />
            </sf-form-field>
            <div class="grid gap-3 sm:grid-cols-2">
              <sf-form-field [label]="i18n.t('editor.entity.budget.autoAmount')" [required]="true" [field]="f.autoAmount">
                <sf-money-input [formField]="f.autoAmount" [currency]="model().autoCurrency" />
              </sf-form-field>
              <sf-form-field [label]="i18n.t('editor.fields.currency')" [field]="f.autoCurrency">
                <sf-select [formField]="f.autoCurrency" [options]="currencyOptions()" [searchable]="false" [label]="i18n.t('editor.fields.currency')" class="w-full" />
              </sf-form-field>
            </div>
            <sf-form-field [label]="i18n.t('editor.entity.budget.autoPeriod')" [field]="f.autoPeriod">
              <sf-select [formField]="f.autoPeriod" [options]="periodOptions()" [searchable]="false" [label]="i18n.t('editor.entity.budget.autoPeriod')" class="w-full" />
            </sf-form-field>
          }
        </fieldset>

        <sf-form-footer inset="sheet" [saving]="saving()" [canDelete]="isEdit()" (save)="save()" (dismissed)="cancel()" (remove)="remove()" />
      </form>
    }
  `,
})
export class BudgetForm extends EntityForm<Model, BudgetEditPayload> {
  private readonly lookups = inject(EditorLookupsStore);
  private readonly meta = inject(MetaStore);

  protected readonly kind = 'budget';
  protected readonly path = 'budgets';
  protected readonly model = signal<Model>(this.blank());
  protected readonly f = form(this.model, (p) => {
    validate(p.name, (c) => (c.value().trim() ? undefined : { kind: 'required' }));
    maxLength(p.name, 255);
    maxLength(p.notes, 65000);
    validate(p.autoAmount, (c) => {
      if (!this.model().auto) return undefined;
      return !c.value().trim() ? { kind: 'required' } : isPositiveAmount(c.value()) ? undefined : { kind: 'positive' };
    });
  });

  protected readonly typeOptions = computed(() => TYPES.map((t) => ({ value: t, label: this.i18n.t(`editor.entity.budget.autoTypes.${t}`) })));
  protected readonly periodOptions = computed(() => PERIODS.map((p) => ({ value: p, label: this.i18n.t(`editor.periods.${p}`) })));
  protected readonly currencyOptions = computed(() => this.lookups.currencies().map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` })));

  protected blank(): Model {
    return { name: '', active: true, notes: '', auto: false, autoType: 'reset', autoAmount: '', autoPeriod: 'monthly', autoCurrency: this.meta.primary() };
  }

  protected toModel(p: BudgetEditPayload): Model {
    return {
      name: p.name,
      active: p.active,
      notes: p.notes ?? '',
      auto: !!p.autoBudget,
      autoType: p.autoBudget?.type ?? 'reset',
      autoAmount: p.autoBudget?.amount ?? '',
      autoPeriod: p.autoBudget?.period ?? 'monthly',
      autoCurrency: p.autoBudget?.currency ?? this.meta.primary(),
    };
  }

  protected toRequest(): BudgetWrite {
    const m = this.model();
    return {
      name: m.name.trim(),
      active: m.active,
      notes: m.notes.trim() || null,
      autoBudget: m.auto ? { type: m.autoType, amount: m.autoAmount, period: m.autoPeriod, currency: m.autoCurrency } : null,
    };
  }

  protected displayName(): string {
    return this.model().name;
  }
}
