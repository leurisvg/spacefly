import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormField as Field } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMinus, lucidePlus, lucideX } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { HlmTextarea } from '@spartan-ng/helm/textarea';
import { Select } from '../../shared/components/select';
import { DateInput } from '../../shared/forms/date-input';
import { FormField } from '../../shared/forms/form-field';
import { FormFooter } from '../../shared/forms/form-footer';
import { MoneyInput } from '../../shared/forms/money-input';
import { piggyFormViewModel } from '@spacefly/client/features/editor/piggy-form.vm';
import { EntityForm } from './entity-form';

/**
 * Create or edit a goal (piggy bank): name, currency, target, dates and the accounts it saves from,
 * each with its amount. "Add / remove" moves the saved amount of one account up or down; saving always
 * sends the complete list, because Firefly replaces the goal's accounts with it.
 */
@Component({
  selector: 'sf-piggy-form',
  imports: [Field, NgIcon, HlmButton, HlmInput, HlmSkeleton, HlmTextarea, Select, DateInput, FormField, FormFooter, MoneyInput],
  providers: [provideIcons({ lucideMinus, lucidePlus, lucideX })],
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

        <div class="grid gap-3 sm:grid-cols-2">
          <sf-form-field [label]="vm.i18n.t('editor.fields.currency')" [field]="vm.f.currency">
            <sf-select [formField]="vm.f.currency" [options]="vm.currencyOptions()" [searchable]="false" [label]="vm.i18n.t('editor.fields.currency')" class="w-full" />
          </sf-form-field>
          <sf-form-field [label]="vm.i18n.t('editor.entity.piggy.target')" [field]="vm.f.targetAmount">
            <sf-money-input [formField]="vm.f.targetAmount" [currency]="vm.model().currency" />
          </sf-form-field>
          <sf-form-field [label]="vm.i18n.t('editor.entity.piggy.startDate')" [field]="vm.f.startDate">
            <div class="flex items-center gap-2">
              <sf-date-input [formField]="vm.f.startDate" />
              @if (vm.model().startDate) {
                <button hlmBtn type="button" variant="ghost" size="sm" (click)="vm.f.startDate().value.set('')">{{ vm.i18n.t('editor.clear') }}</button>
              }
            </div>
          </sf-form-field>
          <sf-form-field [label]="vm.i18n.t('editor.entity.piggy.targetDate')" [field]="vm.f.targetDate">
            <div class="flex items-center gap-2">
              <sf-date-input [formField]="vm.f.targetDate" />
              @if (vm.model().targetDate) {
                <button hlmBtn type="button" variant="ghost" size="sm" (click)="vm.f.targetDate().value.set('')">{{ vm.i18n.t('editor.clear') }}</button>
              }
            </div>
          </sf-form-field>
        </div>

        <fieldset class="flex flex-col gap-3 rounded-lg border border-border/70 p-3">
          <legend class="px-1 text-xs text-muted-foreground">{{ vm.i18n.t('editor.entity.piggy.accounts') }}</legend>
          <p class="text-xs text-muted-foreground">{{ vm.i18n.t('editor.entity.piggy.adjustHint') }}</p>
          @for (row of vm.f.accounts; track row().keyInParent(); let i = $index) {
            <div class="flex flex-col gap-2 rounded-md border border-border/60 p-2" role="group" [attr.aria-label]="vm.accountName(vm.model().accounts[i]?.accountId)">
              <div class="flex items-center gap-2">
                <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ vm.accountName(vm.model().accounts[i]?.accountId) }}</span>
                <button hlmBtn type="button" variant="ghost" size="icon-sm" [attr.aria-label]="vm.i18n.t('editor.entity.piggy.remove', { name: vm.accountName(vm.model().accounts[i]?.accountId) })" (click)="vm.removeAccount(i)">
                  <ng-icon name="lucideX" aria-hidden="true" />
                </button>
              </div>
              <sf-form-field [label]="vm.i18n.t('editor.entity.piggy.saved')" [field]="row.currentAmount">
                <sf-money-input [formField]="row.currentAmount" [currency]="vm.model().currency" />
              </sf-form-field>
              <div class="flex items-end gap-2">
                <sf-form-field class="flex-1" [label]="vm.i18n.t('editor.entity.piggy.adjustLabel')">
                  <sf-money-input [formField]="row.adjust" [currency]="vm.model().currency" />
                </sf-form-field>
                <button hlmBtn type="button" variant="outline" size="sm" [disabled]="!vm.canAdjust(i)" (click)="vm.adjust(i, 1)">
                  <ng-icon name="lucidePlus" aria-hidden="true" />{{ vm.i18n.t('editor.entity.piggy.add') }}
                </button>
                <button hlmBtn type="button" variant="outline" size="sm" [disabled]="!vm.canAdjust(i)" (click)="vm.adjust(i, -1)">
                  <ng-icon name="lucideMinus" aria-hidden="true" />{{ vm.i18n.t('editor.entity.piggy.subtract') }}
                </button>
              </div>
            </div>
          }
          <sf-form-field [field]="vm.f.accounts">
            <sf-select
              [value]="''"
              (valueChange)="vm.addAccount($event)"
              [options]="vm.accountOptions()"
              [placeholder]="vm.i18n.t('editor.entity.piggy.addAccount')"
              [label]="vm.i18n.t('editor.entity.piggy.addAccount')"
              class="w-full"
            />
          </sf-form-field>
        </fieldset>

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
export class PiggyForm extends EntityForm {
  protected readonly vm = piggyFormViewModel({ id: this.id, done: () => this.done.emit() });
}
