import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FormField as Field } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRightLeft, lucideExternalLink, lucideInfo } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { HlmSwitch } from '@spartan-ng/helm/switch';
import { HlmTextarea } from '@spartan-ng/helm/textarea';
import { transactionFormViewModel } from '@spacefly/client/features/editor/transaction-form.vm';
import { BreadcrumbLeaf } from '../../layout/breadcrumb-leaf';
import { PageHeader } from '../../shared/components/page-header';
import { Section } from '../../shared/components/section';
import { Select } from '../../shared/components/select';
import { AccountPicker } from '../../shared/forms/account-picker';
import { Combobox } from '../../shared/forms/combobox';
import { DateInput } from '../../shared/forms/date-input';
import { FormField } from '../../shared/forms/form-field';
import { FormFooter } from '../../shared/forms/form-footer';
import { MoneyInput } from '../../shared/forms/money-input';
import { TagInput } from '../../shared/forms/tag-input';
import { TimeInput } from '../../shared/forms/time-input';
import { TxTypeBadge } from '../../shared/forms/tx-type-badge';

/**
 * Create or edit one transaction. The user never picks a type: it follows from the two accounts and is
 * shown live. Firefly's rules and webhooks always run on save. Routes: `/transactions/new` (optionally
 * pre-filled from the query string) and `/transactions/:id/edit`.
 */
@Component({
  selector: 'sf-transaction-form',
  imports: [
    Field,
    NgIcon,
    HlmButton,
    HlmSkeleton,
    HlmSwitch,
    HlmTextarea,
    PageHeader,
    Section,
    Select,
    AccountPicker,
    Combobox,
    DateInput,
    FormField,
    FormFooter,
    MoneyInput,
    TagInput,
    TimeInput,
    TxTypeBadge,
  ],
  providers: [provideIcons({ lucideArrowRightLeft, lucideExternalLink, lucideInfo })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mx-auto flex w-full max-w-3xl flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="vm.i18n.t(vm.isEdit() ? 'nav.editTransaction' : 'nav.newTransaction')" [description]="vm.i18n.t('editor.tx.description')" />

    @if (vm.state() === 'loading') {
      <div class="flex flex-col gap-3">
        @for (i of [1, 2, 3, 4]; track i) {
          <div hlmSkeleton class="h-14 w-full"></div>
        }
      </div>
    } @else if (vm.state() === 'notEditable') {
      <section class="flex flex-col gap-3 rounded-xl border border-status-warning/40 bg-status-warning/10 p-4 sm:p-5" role="alert">
        <h2 class="flex items-center gap-2 font-semibold"><ng-icon name="lucideInfo" aria-hidden="true" />{{ vm.i18n.t('editor.tx.notEditable.title') }}</h2>
        <p class="text-sm">{{ vm.i18n.t('editor.tx.notEditable.' + (vm.blockedReason() === 'type' ? 'type' : 'splits')) }}</p>
        <div class="flex flex-wrap gap-2">
          @if (vm.fireflyUrl(); as url) {
            <a hlmBtn size="sm" [href]="url" target="_blank" rel="noopener"><ng-icon name="lucideExternalLink" aria-hidden="true" />{{ vm.i18n.t('editor.tx.editInFirefly') }}</a>
          }
          <button hlmBtn size="sm" variant="outline" type="button" (click)="vm.cancel()">{{ vm.i18n.t('editor.back') }}</button>
          <button hlmBtn size="sm" variant="destructive" type="button" (click)="vm.remove()">{{ vm.i18n.t('forms.delete') }}</button>
        </div>
      </section>
    } @else if (vm.state() === 'missing' || vm.state() === 'error') {
      <section class="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:p-5" role="alert">
        <p class="text-sm">{{ vm.i18n.t(vm.state() === 'missing' ? 'editor.tx.missing' : 'editor.tx.loadError') }}</p>
        <div class="flex gap-2">
          <button hlmBtn size="sm" variant="outline" type="button" (click)="vm.cancel()">{{ vm.i18n.t('editor.back') }}</button>
          @if (vm.state() === 'error') {
            <button hlmBtn size="sm" type="button" (click)="vm.reload()">{{ vm.i18n.t('editor.retry') }}</button>
          }
        </div>
      </section>
    } @else {
      <form class="flex flex-col gap-4" novalidate (submit)="$event.preventDefault(); vm.save()">
        <sf-section [title]="vm.i18n.t('editor.tx.what')" [loading]="vm.lookups.loading()">
          <div class="flex flex-col gap-4">
            <sf-form-field [label]="vm.i18n.t('editor.tx.descriptionLabel')" [required]="true" [field]="vm.f.description">
              <sf-combobox
                [formField]="vm.f.description"
                [options]="vm.descriptionOptions()"
                [freeText]="true"
                [maxVisible]="8"
                [ariaLabel]="vm.i18n.t('editor.tx.descriptionLabel')"
                (typed)="vm.onDescriptionTyped($event)"
              />
            </sf-form-field>

            <div class="grid items-start gap-3 md:grid-cols-[1fr_auto_1fr]">
              <sf-form-field [label]="vm.i18n.t('editor.tx.from')" [required]="true" [field]="vm.f.source">
                <sf-account-picker
                  [formField]="vm.f.source"
                  [accounts]="vm.lookups.accounts()"
                  side="source"
                  [other]="vm.destinationSlot()"
                  [placeholder]="vm.i18n.t('editor.tx.accountPlaceholder')"
                />
              </sf-form-field>
              <button
                hlmBtn
                type="button"
                variant="ghost"
                size="icon-sm"
                class="mt-6 hidden md:inline-flex"
                [attr.aria-label]="vm.i18n.t('editor.tx.swap')"
                (click)="vm.swap()"
              >
                <ng-icon name="lucideArrowRightLeft" aria-hidden="true" />
              </button>
              <sf-form-field [label]="vm.i18n.t('editor.tx.to')" [required]="true" [field]="vm.f.destination">
                <sf-account-picker
                  [formField]="vm.f.destination"
                  [accounts]="vm.lookups.accounts()"
                  side="destination"
                  [other]="vm.sourceSlot()"
                  [placeholder]="vm.i18n.t('editor.tx.accountPlaceholder')"
                />
              </sf-form-field>
            </div>
            <div class="-mt-2 flex items-center gap-3">
              <sf-tx-type-badge [source]="vm.sourceSlot()" [destination]="vm.destinationSlot()" />
              <button hlmBtn type="button" variant="ghost" size="sm" class="md:hidden" (click)="vm.swap()">
                <ng-icon name="lucideArrowRightLeft" aria-hidden="true" />{{ vm.i18n.t('editor.tx.swap') }}
              </button>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <sf-form-field [label]="vm.i18n.t('editor.tx.amount')" [required]="true" [field]="vm.f.amount">
                <sf-money-input [formField]="vm.f.amount" [currency]="vm.amountCurrency()" />
              </sf-form-field>
              @if (vm.crossCurrency()) {
                <sf-form-field [label]="vm.i18n.t('editor.tx.received', { currency: vm.receivedCurrency() })" [required]="true" [field]="vm.f.foreignAmount">
                  <sf-money-input [formField]="vm.f.foreignAmount" [currency]="vm.receivedCurrency()" />
                </sf-form-field>
              }
              <div class="flex flex-wrap items-start gap-3 sm:col-span-2">
                <sf-form-field class="min-w-0 flex-1" [label]="vm.i18n.t('editor.tx.date')" [required]="true" [field]="vm.f.date">
                  <sf-date-input [formField]="vm.f.date" [ariaLabel]="vm.i18n.t('editor.tx.date')" />
                </sf-form-field>
                <sf-form-field [label]="vm.i18n.t('editor.tx.time')" [field]="vm.f.time">
                  <sf-time-input [formField]="vm.f.time" [ariaLabel]="vm.i18n.t('editor.tx.time')" />
                </sf-form-field>
              </div>
            </div>

            @if (vm.showOtherCurrency()) {
              <div class="flex flex-col gap-3 rounded-lg border border-border/70 p-3">
                <label class="flex items-center gap-2 text-sm">
                  <hlm-switch [formField]="vm.f.otherCurrency" [aria-label]="vm.i18n.t('editor.tx.otherCurrency')" />
                  <span>{{ vm.i18n.t('editor.tx.otherCurrency') }}</span>
                </label>
                @if (vm.model().otherCurrency) {
                  <div class="grid gap-3 sm:grid-cols-2">
                    <sf-form-field [label]="vm.i18n.t('editor.tx.foreignCurrency')" [required]="true" [field]="vm.f.foreignCurrency">
                      <sf-select [formField]="vm.f.foreignCurrency" [options]="vm.otherCurrencyOptions()" [searchable]="false" [label]="vm.i18n.t('editor.tx.foreignCurrency')" class="w-full" />
                    </sf-form-field>
                    <sf-form-field [label]="vm.i18n.t('editor.tx.foreignAmount')" [required]="true" [field]="vm.f.foreignAmount">
                      <sf-money-input [formField]="vm.f.foreignAmount" [currency]="vm.model().foreignCurrency" />
                    </sf-form-field>
                  </div>
                }
              </div>
            }
          </div>
        </sf-section>

        <sf-section [title]="vm.i18n.t('editor.tx.details')" [loading]="vm.lookups.loading()">
          <div class="grid gap-4 sm:grid-cols-2">
            <sf-form-field [label]="vm.i18n.t('common.category')" [field]="vm.f.category">
              <sf-combobox
                [formField]="vm.f.category"
                [options]="vm.categoryOptions()"
                [allowCreate]="true"
                [placeholder]="vm.i18n.t('editor.tx.categoryPlaceholder')"
                [ariaLabel]="vm.i18n.t('common.category')"
              />
            </sf-form-field>
            @if (vm.showBudgetBill()) {
              <sf-form-field [label]="vm.i18n.t('common.budget')" [field]="vm.f.budgetId">
                <sf-select [formField]="vm.f.budgetId" [options]="vm.budgetOptions()" [placeholder]="vm.i18n.t('common.noBudget')" [label]="vm.i18n.t('common.budget')" class="w-full" />
              </sf-form-field>
              <sf-form-field [label]="vm.i18n.t('editor.tx.bill')" [field]="vm.f.billId">
                <sf-select [formField]="vm.f.billId" [options]="vm.billOptions()" [placeholder]="vm.i18n.t('editor.tx.noBill')" [label]="vm.i18n.t('editor.tx.bill')" class="w-full" />
              </sf-form-field>
            }
            <sf-form-field class="sm:col-span-2" [label]="vm.i18n.t('common.tag')" [field]="vm.f.tags">
              <sf-tag-input [formField]="vm.f.tags" [suggestions]="vm.tagNames()" [ariaLabel]="vm.i18n.t('common.tag')" />
            </sf-form-field>
            <sf-form-field class="sm:col-span-2" [label]="vm.i18n.t('editor.tx.notes')" [field]="vm.f.notes">
              <textarea hlmTextarea rows="3" [formField]="vm.f.notes"></textarea>
            </sf-form-field>
          </div>
        </sf-section>

        @if (vm.formErrors().length) {
          <p class="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm" role="alert">{{ vm.formErrors().join(' ') }}</p>
        }

        <p class="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <ng-icon name="lucideInfo" aria-hidden="true" />{{ vm.i18n.t('editor.tx.rules') }}
        </p>

        <div class="flex flex-wrap items-center gap-x-6 gap-y-2 px-1 text-sm">
          <label class="flex items-center gap-2">
            <hlm-switch [checked]="vm.after().stay" (checkedChange)="vm.setAfter({ stay: $event })" [aria-label]="vm.i18n.t(vm.isEdit() ? 'editor.tx.stayEdit' : 'editor.tx.stay')" />
            <span>{{ vm.i18n.t(vm.isEdit() ? 'editor.tx.stayEdit' : 'editor.tx.stay') }}</span>
          </label>
          @if (!vm.isEdit()) {
            <label class="flex items-center gap-2" [class.opacity-50]="!vm.after().stay">
              <hlm-switch [checked]="vm.after().reset" [disabled]="!vm.after().stay" (checkedChange)="vm.setAfter({ reset: $event })" [aria-label]="vm.i18n.t('editor.tx.reset')" />
              <span>{{ vm.i18n.t('editor.tx.reset') }}</span>
            </label>
          }
        </div>

        <sf-form-footer
          [saving]="vm.saving()"
          [canDelete]="vm.isEdit()"
          (save)="vm.save()"
          (dismissed)="vm.cancel()"
          (remove)="vm.remove()"
        />
      </form>
    }
  `,
})
export class TransactionForm {
  /** Route param of `/transactions/:id/edit`. */
  readonly id = input<string | undefined>(undefined);
  /** Pre-fill from `/transactions/new?source=…&destination=…&date=…` (account ids or names). */
  readonly source = input<string | undefined>(undefined);
  readonly destination = input<string | undefined>(undefined);
  readonly date = input<string | undefined>(undefined);
  readonly description = input<string | undefined>(undefined);
  readonly amount = input<string | undefined>(undefined);
  readonly category = input<string | undefined>(undefined);
  readonly budget = input<string | undefined>(undefined);
  readonly bill = input<string | undefined>(undefined);

  protected readonly vm = transactionFormViewModel({
    id: this.id,
    query: computed(() => ({
      source: this.source(),
      destination: this.destination(),
      date: this.date(),
      description: this.description(),
      amount: this.amount(),
      category: this.category(),
      budget: this.budget(),
      bill: this.bill(),
    })),
  });

  constructor() {
    inject(BreadcrumbLeaf).track(() => this.vm.recordTitle());
  }
}
