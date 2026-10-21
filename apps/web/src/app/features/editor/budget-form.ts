import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormField as Field } from '@angular/forms/signals';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { HlmSwitch } from '@spartan-ng/helm/switch';
import { HlmTextarea } from '@spartan-ng/helm/textarea';
import { Select } from '../../shared/components/select';
import { FormField } from '../../shared/forms/form-field';
import { FormFooter } from '../../shared/forms/form-footer';
import { MoneyInput } from '../../shared/forms/money-input';
import { budgetFormViewModel } from '@spacefly/client/features/editor/budget-form.vm';
import { EntityForm } from './entity-form';

/** Create or edit a budget: name, active, notes and the optional automatic budget (type, amount, period, currency). */
@Component({
  selector: 'sf-budget-form',
  imports: [Field, HlmButton, HlmInput, HlmSkeleton, HlmSwitch, HlmTextarea, Select, FormField, FormFooter, MoneyInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (vm.state() === 'loading') {
      <div hlmSkeleton class="h-32 w-full"></div>
    } @else if (vm.state() !== 'ready') {
      <p class="text-sm" role="alert">{{ vm.i18n.t(vm.state() === 'missing' ? 'editor.missing' : 'editor.loadError') }}</p>
      <div class="mt-3 flex gap-2">
        <button hlmBtn size="sm" variant="outline" type="button" (click)="vm.cancel()">{{ vm.i18n.t('editor.back') }}</button>
        @if (vm.state() === 'error') {
          <button hlmBtn size="sm" type="button" (click)="vm.reload()">{{ vm.i18n.t('editor.retry') }}</button>
        }
      </div>
    } @else {
      <form class="flex flex-col gap-4" novalidate (submit)="$event.preventDefault(); vm.save()">
        <sf-form-field [label]="vm.i18n.t('editor.fields.name')" [required]="true" [field]="vm.f.name">
          <input hlmInput type="text" class="h-9" autocomplete="off" [formField]="vm.f.name" />
        </sf-form-field>
        <label class="flex items-center gap-2 text-sm">
          <hlm-switch [formField]="vm.f.active" [aria-label]="vm.i18n.t('editor.fields.active')" />
          <span>{{ vm.i18n.t('editor.fields.active') }}</span>
        </label>
        <sf-form-field [label]="vm.i18n.t('editor.fields.notes')" [field]="vm.f.notes">
          <textarea hlmTextarea rows="3" [formField]="vm.f.notes"></textarea>
        </sf-form-field>

        <fieldset class="flex flex-col gap-3 rounded-lg border border-border/70 p-3">
          <legend class="px-1 text-xs text-muted-foreground">{{ vm.i18n.t('editor.entity.budget.autoHint') }}</legend>
          <label class="flex items-center gap-2 text-sm">
            <hlm-switch [formField]="vm.f.auto" [aria-label]="vm.i18n.t('editor.entity.budget.auto')" />
            <span>{{ vm.i18n.t('editor.entity.budget.auto') }}</span>
          </label>
          @if (vm.model().auto) {
            <sf-form-field [label]="vm.i18n.t('editor.entity.budget.autoType')" [field]="vm.f.autoType">
              <sf-select [formField]="vm.f.autoType" [options]="vm.typeOptions()" [searchable]="false" [label]="vm.i18n.t('editor.entity.budget.autoType')" class="w-full" />
            </sf-form-field>
            <div class="grid gap-3 sm:grid-cols-2">
              <sf-form-field [label]="vm.i18n.t('editor.entity.budget.autoAmount')" [required]="true" [field]="vm.f.autoAmount">
                <sf-money-input [formField]="vm.f.autoAmount" [currency]="vm.model().autoCurrency" />
              </sf-form-field>
              <sf-form-field [label]="vm.i18n.t('editor.fields.currency')" [field]="vm.f.autoCurrency">
                <sf-select [formField]="vm.f.autoCurrency" [options]="vm.currencyOptions()" [searchable]="false" [label]="vm.i18n.t('editor.fields.currency')" class="w-full" />
              </sf-form-field>
            </div>
            <sf-form-field [label]="vm.i18n.t('editor.entity.budget.autoPeriod')" [field]="vm.f.autoPeriod">
              <sf-select [formField]="vm.f.autoPeriod" [options]="vm.periodOptions()" [searchable]="false" [label]="vm.i18n.t('editor.entity.budget.autoPeriod')" class="w-full" />
            </sf-form-field>
          }
        </fieldset>

        <sf-form-footer inset="sheet" [saving]="vm.saving()" [canDelete]="vm.isEdit()" (save)="vm.save()" (dismissed)="vm.cancel()" (remove)="vm.remove()" />
      </form>
    }
  `,
})
export class BudgetForm extends EntityForm {
  protected readonly vm = budgetFormViewModel({ id: this.id, done: () => this.done.emit() });
}
