import { Component, computed, inject, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ActionBarComponent } from '@nativescript/angular';
import { ActivatedRoute } from '@angular/router';
import { accountPickerViewModel } from '@spacefly/client/features/editor/account-picker.vm';
import { fieldErrorMessages } from '@spacefly/client/features/editor/field-errors';
import { transactionFormViewModel, type TxQueryValues } from '@spacefly/client/features/editor/transaction-form.vm';
import type { AccountInput, AccountSlot } from '@spacefly/shared';
import { DateField } from '../ui/date-field';
import { NsField } from '../ui/ns-field';
import { pickOne, type PickerOption } from '../ui/picker';
import { SuggestField } from '../ui/suggest-field';
import { TimeField } from '../ui/time-field';

/**
 * Create (`/transactions/new`) or edit (`/transactions/:id/edit`) a transaction. All rules (type from the two accounts, other
 * currency, validation, saving, "stay after saving") come from the shared view-model; this screen only draws native controls
 * and binds them to its signal form with `nsField`.
 */
@Component({
  selector: 'ns-transaction-form',
  imports: [ActionBarComponent, DateField, NsField, SuggestField, TimeField],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar [title]="vm.i18n.t(vm.isEdit() ? 'nav.editTransaction' : 'nav.newTransaction')"></ActionBar>
    <ScrollView class="screen">
      <StackLayout class="screen-pad">
        @switch (vm.state()) {
          @case ('loading') {
            <ActivityIndicator busy="true"></ActivityIndicator>
          }
          @case ('notEditable') {
            <Label [text]="vm.i18n.t('editor.tx.notEditable.' + (vm.blockedReason() === 'type' ? 'type' : 'splits'))" textWrap="true" class="card"></Label>
            <Button [text]="vm.i18n.t('editor.back')" class="btn btn-outline" (tap)="vm.cancel()"></Button>
          }
          @case ('missing') {
            <Label [text]="vm.i18n.t('editor.tx.missing')" textWrap="true" class="card"></Label>
            <Button [text]="vm.i18n.t('editor.back')" class="btn btn-outline" (tap)="vm.cancel()"></Button>
          }
          @case ('error') {
            <Label [text]="vm.i18n.t('editor.tx.loadError')" textWrap="true" class="card"></Label>
            <Button [text]="vm.i18n.t('editor.retry')" class="btn" (tap)="vm.reload()"></Button>
          }
          @default {
            <ns-suggest-field
              [label]="vm.i18n.t('editor.tx.descriptionLabel')"
              [required]="true"
              [field]="vm.f.description"
              [options]="vm.descriptionOptions()"
              (typed)="vm.onDescriptionTyped($event)"
            />

            <Label [text]="vm.i18n.t('editor.tx.from')" class="field-label"></Label>
            <Label [text]="accountLabel(vm.model().source)" class="field" (tap)="chooseAccount('source')"></Label>
            <Label [text]="error('source')" class="field-error" visibility="{{ error('source') ? 'visible' : 'collapse' }}" textWrap="true"></Label>

            <GridLayout columns="*, auto">
              <Label col="0" [text]="vm.i18n.t('editor.tx.to')" class="field-label"></Label>
              <Label col="1" [text]="'⇅ ' + vm.i18n.t('editor.tx.swap')" class="btn-chip" verticalAlignment="center" (tap)="vm.swap()"></Label>
            </GridLayout>
            <Label [text]="accountLabel(vm.model().destination)" class="field" (tap)="chooseAccount('destination')"></Label>
            <Label [text]="error('destination')" class="field-error" visibility="{{ error('destination') ? 'visible' : 'collapse' }}" textWrap="true"></Label>

            <Label [text]="vm.i18n.t('editor.tx.amount') + ' (' + vm.amountCurrency() + ')'" class="field-label"></Label>
            <TextField class="field" keyboardType="number" [nsField]="vm.f.amount"></TextField>
            <Label [text]="error('amount')" class="field-error" visibility="{{ error('amount') ? 'visible' : 'collapse' }}" textWrap="true"></Label>

            @if (vm.crossCurrency()) {
              <Label [text]="vm.i18n.t('editor.tx.received', { currency: vm.receivedCurrency() })" class="field-label"></Label>
              <TextField class="field" keyboardType="number" [nsField]="vm.f.foreignAmount"></TextField>
              <Label [text]="error('foreignAmount')" class="field-error" visibility="{{ error('foreignAmount') ? 'visible' : 'collapse' }}" textWrap="true"></Label>
            }

            <GridLayout columns="2*, *">
              <ns-date-field col="0" marginRight="6" [label]="vm.i18n.t('editor.tx.date')" [required]="true" [field]="vm.f.date" />
              <ns-time-field col="1" marginLeft="6" [label]="vm.i18n.t('editor.tx.time')" [field]="vm.f.time" />
            </GridLayout>

            @if (vm.showOtherCurrency()) {
              <GridLayout columns="*, auto" marginBottom="8">
                <Label col="0" [text]="vm.i18n.t('editor.tx.otherCurrency')" verticalAlignment="center"></Label>
                <Switch col="1" [nsField]="vm.f.otherCurrency"></Switch>
              </GridLayout>
              @if (vm.model().otherCurrency) {
                <Label [text]="vm.i18n.t('editor.tx.foreignCurrency')" class="field-label"></Label>
                <Label [text]="vm.model().foreignCurrency || '—'" class="field" (tap)="choose('foreignCurrency', vm.otherCurrencyOptions())"></Label>
                <Label [text]="vm.i18n.t('editor.tx.foreignAmount')" class="field-label"></Label>
                <TextField class="field" keyboardType="number" [nsField]="vm.f.foreignAmount"></TextField>
                <Label [text]="error('foreignAmount')" class="field-error" visibility="{{ error('foreignAmount') ? 'visible' : 'collapse' }}" textWrap="true"></Label>
              }
            }

            <ns-suggest-field
              [label]="vm.i18n.t('common.category')"
              [hint]="vm.i18n.t('editor.tx.categoryPlaceholder')"
              [field]="vm.f.category"
              [options]="vm.categoryOptions()"
            />

            @if (vm.showBudgetBill()) {
              <Label [text]="vm.i18n.t('common.budget')" class="field-label"></Label>
              <Label [text]="optionLabel(vm.budgetOptions(), vm.model().budgetId) || vm.i18n.t('common.noBudget')" class="field" (tap)="choose('budgetId', vm.budgetOptions())"></Label>
              <Label [text]="vm.i18n.t('editor.tx.bill')" class="field-label"></Label>
              <Label [text]="optionLabel(vm.billOptions(), vm.model().billId) || vm.i18n.t('editor.tx.noBill')" class="field" (tap)="choose('billId', vm.billOptions())"></Label>
            }

            <Label [text]="vm.i18n.t('common.tag')" class="field-label"></Label>
            <TextField class="field" hint="a, b" autocapitalizationType="none" [text]="vm.model().tags.join(', ')" (textChange)="setTags($any($event).value)"></TextField>

            <Label [text]="vm.i18n.t('editor.tx.notes')" class="field-label"></Label>
            <TextView class="field" height="120" [nsField]="vm.f.notes"></TextView>

            @if (vm.formErrors().length) {
              <Label [text]="vm.formErrors().join(' ')" class="field-error" textWrap="true"></Label>
            }

            <GridLayout columns="*, auto" marginBottom="8">
              <Label col="0" [text]="vm.i18n.t(vm.isEdit() ? 'editor.tx.stayEdit' : 'editor.tx.stay')" verticalAlignment="center" textWrap="true"></Label>
              <Switch col="1" [checked]="vm.after().stay" (checkedChange)="vm.setAfter({ stay: $any($event).value })"></Switch>
            </GridLayout>
            @if (!vm.isEdit()) {
              <GridLayout columns="*, auto" marginBottom="8" [opacity]="vm.after().stay ? 1 : 0.5">
                <Label col="0" [text]="vm.i18n.t('editor.tx.reset')" verticalAlignment="center" textWrap="true"></Label>
                <Switch col="1" [isEnabled]="vm.after().stay" [checked]="vm.after().reset" (checkedChange)="vm.setAfter({ reset: $any($event).value })"></Switch>
              </GridLayout>
            }

            <Button [text]="vm.i18n.t('forms.save')" class="btn" [isEnabled]="!vm.saving()" (tap)="vm.save()"></Button>
            <Button [text]="vm.i18n.t('forms.cancel')" class="btn btn-outline" marginTop="8" (tap)="vm.cancel()"></Button>
            @if (vm.isEdit()) {
              <Button [text]="vm.i18n.t('forms.delete')" class="btn btn-danger" marginTop="8" marginBottom="24" [isEnabled]="!vm.saving()" (tap)="vm.remove()"></Button>
            }
          }
        }
      </StackLayout>
    </ScrollView>
  `,
})
export class TransactionFormScreen {
  private readonly route = inject(ActivatedRoute);
  private readonly query = this.route.snapshot.queryParamMap;
  private readonly asString = (key: string) => this.query.get(key) ?? undefined;

  protected readonly vm = transactionFormViewModel({
    id: signal(this.route.snapshot.paramMap.get('id') ?? undefined),
    query: signal<TxQueryValues>({
      source: this.asString('source'),
      destination: this.asString('destination'),
      date: this.asString('date'),
      description: this.asString('description'),
      amount: this.asString('amount'),
      category: this.asString('category'),
      budget: this.asString('budget'),
      bill: this.asString('bill'),
    }),
  });

  private readonly sourcePicker = accountPickerViewModel({
    value: this.vm.f.source().value,
    accounts: this.vm.lookups.accounts,
    side: signal('source'),
    other: this.vm.destinationSlot as () => AccountSlot as never,
  });
  private readonly destinationPicker = accountPickerViewModel({
    value: this.vm.f.destination().value,
    accounts: this.vm.lookups.accounts,
    side: signal('destination'),
    other: this.vm.sourceSlot as never,
  });
  private readonly accountNames = computed(() => new Map(this.vm.lookups.accounts().map((a) => [a.id, a.name])));

  /** The first message of a field's errors (the shared rules translate them). */
  protected error(name: 'description' | 'source' | 'destination' | 'amount' | 'foreignAmount' | 'date' | 'time'): string {
    return fieldErrorMessages(this.vm.i18n, this.vm.f[name]())[0] ?? '';
  }

  protected accountLabel(value: AccountInput | null): string {
    if (!value) return this.vm.i18n.t('editor.tx.accountPlaceholder');
    return 'id' in value ? (this.accountNames().get(value.id) ?? value.id) : value.name;
  }

  protected async chooseAccount(side: 'source' | 'destination'): Promise<void> {
    const picker = side === 'source' ? this.sourcePicker : this.destinationPicker;
    // Combinations that can't make a transaction are left out instead of greyed out (an action sheet can't grey).
    const options: PickerOption[] = picker.options().filter((o) => !o.invalid).map((o) => ({ value: o.value, label: `${o.label}  ·  ${o.hint}` }));
    const picked = await pickOne(this.vm.i18n.t(side === 'source' ? 'editor.tx.from' : 'editor.tx.to'), options, this.vm.i18n.t('forms.cancel'));
    if (picked) picker.select({ value: picked });
  }

  protected async choose(field: 'foreignCurrency' | 'budgetId' | 'billId', options: readonly PickerOption[]): Promise<void> {
    const title = this.vm.i18n.t(field === 'budgetId' ? 'common.budget' : field === 'billId' ? 'editor.tx.bill' : 'editor.tx.foreignCurrency');
    const picked = await pickOne(title, options, this.vm.i18n.t('forms.cancel'), { selected: this.vm.model()[field] });
    if (picked !== null) this.vm.f[field]().value.set(picked);
  }

  protected optionLabel(options: readonly PickerOption[], value: string): string {
    return options.find((o) => o.value === value)?.label ?? '';
  }

  protected setTags(text: string): void {
    this.vm.f.tags().value.set(
      text
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    );
  }
}
