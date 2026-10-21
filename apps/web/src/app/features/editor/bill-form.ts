import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormField as Field } from '@angular/forms/signals';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { HlmSwitch } from '@spartan-ng/helm/switch';
import { HlmTextarea } from '@spartan-ng/helm/textarea';
import { Select } from '../../shared/components/select';
import { DateInput } from '../../shared/forms/date-input';
import { FormField } from '../../shared/forms/form-field';
import { FormFooter } from '../../shared/forms/form-footer';
import { MoneyInput } from '../../shared/forms/money-input';
import { billFormViewModel } from '@spacefly/client/features/editor/bill-form.vm';
import { EntityForm } from './entity-form';

/** Create or edit a subscription (bill): amounts, first date, frequency, optional end, group and notes. */
@Component({
  selector: 'sf-bill-form',
  imports: [Field, HlmButton, HlmInput, HlmSkeleton, HlmSwitch, HlmTextarea, Select, DateInput, FormField, FormFooter, MoneyInput],
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

        <div class="flex flex-col gap-3 rounded-lg border border-border/70 p-3">
          <label class="flex items-center gap-2 text-sm">
            <hlm-switch [formField]="vm.f.fixed" [aria-label]="vm.i18n.t('editor.entity.bill.fixed')" />
            <span>{{ vm.i18n.t('editor.entity.bill.fixed') }}</span>
          </label>
          <div class="grid gap-3 sm:grid-cols-2">
            <sf-form-field [label]="vm.i18n.t(vm.model().fixed ? 'editor.entity.bill.amount' : 'editor.entity.bill.amountMin')" [required]="true" [field]="vm.f.amountMin">
              <sf-money-input [formField]="vm.f.amountMin" [currency]="vm.model().currency" />
            </sf-form-field>
            @if (!vm.model().fixed) {
              <sf-form-field [label]="vm.i18n.t('editor.entity.bill.amountMax')" [required]="true" [field]="vm.f.amountMax">
                <sf-money-input [formField]="vm.f.amountMax" [currency]="vm.model().currency" />
              </sf-form-field>
            }
          </div>
          <sf-form-field [label]="vm.i18n.t('editor.fields.currency')" [field]="vm.f.currency">
            <sf-select [formField]="vm.f.currency" [options]="vm.currencyOptions()" [searchable]="false" [label]="vm.i18n.t('editor.fields.currency')" class="w-full" />
          </sf-form-field>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <sf-form-field [label]="vm.i18n.t('editor.entity.bill.freq')" [field]="vm.f.repeatFreq">
            <sf-select [formField]="vm.f.repeatFreq" [options]="vm.freqOptions()" [searchable]="false" [label]="vm.i18n.t('editor.entity.bill.freq')" class="w-full" />
          </sf-form-field>
          <sf-form-field [label]="vm.i18n.t('editor.entity.bill.skip')" [hint]="vm.i18n.t('editor.entity.bill.skipHint')" [field]="vm.f.skip">
            <input hlmInput type="number" class="h-9" inputmode="numeric" [formField]="vm.f.skip" />
          </sf-form-field>
        </div>
        <sf-form-field [label]="vm.i18n.t('editor.entity.bill.date')" [required]="true" [field]="vm.f.date">
          <sf-date-input [formField]="vm.f.date" />
        </sf-form-field>
        <sf-form-field [label]="vm.i18n.t('editor.entity.bill.endDate')" [hint]="vm.i18n.t('editor.entity.bill.endDateHint')" [field]="vm.f.endDate">
          <div class="flex items-center gap-2">
            <sf-date-input [formField]="vm.f.endDate" />
            @if (vm.model().endDate) {
              <button hlmBtn type="button" variant="ghost" size="sm" (click)="vm.f.endDate().value.set('')">{{ vm.i18n.t('editor.clear') }}</button>
            }
          </div>
        </sf-form-field>

        <label class="flex items-center gap-2 text-sm">
          <hlm-switch [formField]="vm.f.active" [aria-label]="vm.i18n.t('editor.fields.active')" />
          <span>{{ vm.i18n.t('editor.fields.active') }}</span>
        </label>
        <sf-form-field [label]="vm.i18n.t('editor.fields.group')" [field]="vm.f.group">
          <input hlmInput type="text" class="h-9" autocomplete="off" [formField]="vm.f.group" />
        </sf-form-field>
        <sf-form-field [label]="vm.i18n.t('editor.fields.notes')" [field]="vm.f.notes">
          <textarea hlmTextarea rows="3" [formField]="vm.f.notes"></textarea>
        </sf-form-field>

        <sf-form-footer inset="sheet" [saving]="vm.saving()" [canDelete]="vm.isEdit()" (save)="vm.save()" (dismissed)="vm.cancel()" (remove)="vm.remove()" />
      </form>
    }
  `,
})
export class BillForm extends EntityForm {
  protected readonly vm = billFormViewModel({ id: this.id, done: () => this.done.emit() });
}
