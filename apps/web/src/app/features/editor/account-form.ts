import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormField as Field } from '@angular/forms/signals';
import type { AccountWriteType } from '@spacefly/shared';
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
import { accountFormViewModel } from '@spacefly/client/features/editor/account-form.vm';
import { EntityForm } from './entity-form';

/**
 * Create or edit an account of any kind. The kind is chosen when creating and then fixed; the fields
 * shown follow it (role and opening balance for assets, interest and debt for liabilities…).
 * Deleting asks to type the account's name and says how many transactions go with it.
 */
@Component({
  selector: 'sf-account-form',
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
        <sf-form-field [label]="vm.i18n.t('editor.entity.account.type')" [hint]="vm.isEdit() ? vm.i18n.t('editor.entity.account.typeLocked') : ''" [field]="vm.f.type">
          <sf-select [formField]="vm.f.type" [options]="vm.typeOptions()" [searchable]="false" [label]="vm.i18n.t('editor.entity.account.type')" class="w-full" />
        </sf-form-field>
        <sf-form-field [label]="vm.i18n.t('editor.fields.name')" [required]="true" [field]="vm.f.name">
          <input hlmInput type="text" class="h-9" autocomplete="off" [formField]="vm.f.name" />
        </sf-form-field>

        @if (vm.isAsset()) {
          <sf-form-field [label]="vm.i18n.t('editor.entity.account.role')" [required]="true" [field]="vm.f.role">
            <sf-select [formField]="vm.f.role" [options]="vm.roleOptions()" [searchable]="false" [label]="vm.i18n.t('editor.entity.account.role')" class="w-full" />
          </sf-form-field>
          @if (vm.model().role === 'ccAsset') {
            <div class="grid gap-3 sm:grid-cols-2">
              <sf-form-field [label]="vm.i18n.t('editor.entity.account.cardType')" [field]="vm.f.cardType">
                <sf-select [formField]="vm.f.cardType" [options]="vm.cardOptions()" [searchable]="false" [label]="vm.i18n.t('editor.entity.account.cardType')" class="w-full" />
              </sf-form-field>
              <sf-form-field [label]="vm.i18n.t('editor.entity.account.paymentDay')" [required]="true" [field]="vm.f.paymentDay">
                <input hlmInput type="number" class="h-9" inputmode="numeric" [formField]="vm.f.paymentDay" />
              </sf-form-field>
            </div>
          }
        }

        @if (vm.isLiability()) {
          <div class="grid gap-3 sm:grid-cols-2">
            <sf-form-field [label]="vm.i18n.t('editor.entity.account.liabilityType')" [field]="vm.f.liabilityType">
              <sf-select [formField]="vm.f.liabilityType" [options]="vm.liabilityOptions()" [searchable]="false" [label]="vm.i18n.t('editor.entity.account.liabilityType')" class="w-full" />
            </sf-form-field>
            <sf-form-field [label]="vm.i18n.t('editor.entity.account.direction')" [field]="vm.f.liabilityDirection">
              <sf-select [formField]="vm.f.liabilityDirection" [options]="vm.directionOptions()" [searchable]="false" [label]="vm.i18n.t('editor.entity.account.direction')" class="w-full" />
            </sf-form-field>
            <sf-form-field [label]="vm.i18n.t('editor.entity.account.interest')" [required]="true" [field]="vm.f.interest">
              <input hlmInput type="text" class="h-9" inputmode="decimal" autocomplete="off" [formField]="vm.f.interest" />
            </sf-form-field>
            <sf-form-field [label]="vm.i18n.t('editor.entity.account.interestPeriod')" [field]="vm.f.interestPeriod">
              <sf-select [formField]="vm.f.interestPeriod" [options]="vm.interestPeriodOptions()" [searchable]="false" [label]="vm.i18n.t('editor.entity.account.interestPeriod')" class="w-full" />
            </sf-form-field>
          </div>
        }

        @if (vm.isOwned()) {
          <sf-form-field [label]="vm.i18n.t('editor.fields.currency')" [field]="vm.f.currency">
            <sf-select [formField]="vm.f.currency" [options]="vm.currencyOptions()" [searchable]="false" [label]="vm.i18n.t('editor.fields.currency')" class="w-full" />
          </sf-form-field>
          <div class="grid gap-3 sm:grid-cols-2">
            <sf-form-field [label]="vm.i18n.t(vm.isLiability() ? 'editor.entity.account.owed' : 'editor.entity.account.openingBalance')" [field]="vm.f.openingBalance">
              <sf-money-input [formField]="vm.f.openingBalance" [currency]="vm.model().currency" />
            </sf-form-field>
            <sf-form-field [label]="vm.i18n.t(vm.isLiability() ? 'editor.entity.account.startDate' : 'editor.entity.account.openingBalanceDate')" [field]="vm.f.openingBalanceDate">
              <sf-date-input [formField]="vm.f.openingBalanceDate" />
            </sf-form-field>
          </div>
          <label class="flex items-center gap-2 text-sm">
            <hlm-switch [formField]="vm.f.includeNetWorth" [aria-label]="vm.i18n.t('editor.entity.account.includeNetWorth')" />
            <span>{{ vm.i18n.t('editor.entity.account.includeNetWorth') }}</span>
          </label>
        }

        <sf-form-field [label]="vm.i18n.t('editor.entity.account.iban')" [field]="vm.f.iban">
          <input hlmInput type="text" class="h-9" autocomplete="off" [formField]="vm.f.iban" />
        </sf-form-field>
        <label class="flex items-center gap-2 text-sm">
          <hlm-switch [formField]="vm.f.active" [aria-label]="vm.i18n.t('editor.fields.active')" />
          <span>{{ vm.i18n.t('editor.fields.active') }}</span>
        </label>
        <sf-form-field [label]="vm.i18n.t('editor.fields.notes')" [field]="vm.f.notes">
          <textarea hlmTextarea rows="3" [formField]="vm.f.notes"></textarea>
        </sf-form-field>

        <sf-form-footer inset="sheet" [saving]="vm.saving()" [canDelete]="vm.isEdit()" (save)="vm.save()" (dismissed)="vm.cancel()" (remove)="vm.remove()" />
      </form>
    }
  `,
})
export class AccountForm extends EntityForm {
  /** The kind a new account starts as. */
  readonly accountType = input<AccountWriteType>('asset');

  protected readonly vm = accountFormViewModel({ id: this.id, done: () => this.done.emit(), accountType: this.accountType });
}
