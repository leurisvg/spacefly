import { Component, computed, inject, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ActionBarComponent } from '@nativescript/angular';
import { ActivatedRoute } from '@angular/router';
import { accountPickerViewModel } from '@spacefly/client/features/editor/account-picker.vm';
import { transactionFormViewModel, type TxQueryValues } from '@spacefly/client/features/editor/transaction-form.vm';
import type { AccountInput, AccountSlot } from '@spacefly/shared';
import { DateField } from '../ui/date-field';
import { FieldBox } from '../ui/field-box';
import { ICON } from '../ui/icons';
import { NsField } from '../ui/ns-field';
import { pickOne, type PickerOption } from '../ui/picker';
import { SuggestField } from '../ui/suggest-field';
import { TapField } from '../ui/tap-field';
import { NsTextField } from '../ui/text-field';
import { TimeField } from '../ui/time-field';

/**
 * Create (`/transactions/new`) or edit (`/transactions/:id/edit`) a transaction. All rules (type from the two accounts, other
 * currency, validation, saving, "stay after saving") come from the shared view-model; this screen only draws native controls
 * and binds them to its signal form with `nsField`.
 */
@Component({
  selector: 'ns-transaction-form',
  imports: [ActionBarComponent, DateField, FieldBox, NsField, NsTextField, SuggestField, TapField, TimeField],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar [title]="vm.i18n.t(vm.isEdit() ? 'nav.editTransaction' : 'nav.newTransaction')">
      @if (vm.state() === 'ready') {
        <ActionItem>
          <StackLayout paddingRight="12">
            <Label [text]="vm.i18n.t('forms.save')" class="save-pill" [class.save-pill-off]="vm.saving()" [isEnabled]="!vm.saving()" (tap)="vm.save()"></Label>
          </StackLayout>
        </ActionItem>
      }
    </ActionBar>
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
              [icon]="icons.receipt"
              [label]="vm.i18n.t('editor.tx.descriptionLabel')"
              [required]="true"
              [field]="vm.f.description"
              [options]="vm.descriptionOptions()"
              (typed)="vm.onDescriptionTyped($event)"
            />

            <GridLayout columns="40, 1.5*, 1.7*, 1.1*">
              <Label col="0" [text]="vm.amountCurrency()" class="currency-code"></Label>
              <ns-text-field col="1" marginRight="6" [compact]="true" keyboardType="number" [label]="vm.i18n.t('editor.tx.amount')" [required]="true" [field]="vm.f.amount" />
              <ns-date-field col="2" marginRight="6" [compact]="true" [label]="vm.i18n.t('editor.tx.date')" [required]="true" [field]="vm.f.date" />
              <ns-time-field col="3" [compact]="true" [label]="vm.i18n.t('forms.hour')" [field]="vm.f.time" />
            </GridLayout>

            @if (vm.crossCurrency()) {
              <GridLayout columns="40, *">
                <Label col="0" [text]="vm.receivedCurrency()" class="currency-code"></Label>
                <ns-text-field col="1" keyboardType="number" [label]="vm.i18n.t('editor.tx.received', { currency: vm.receivedCurrency() })" [required]="true" [field]="vm.f.foreignAmount" />
              </GridLayout>
            }

            <GridLayout>
              <StackLayout>
                <ns-tap-field
                  [icon]="icons.out"
                  [label]="vm.i18n.t('editor.tx.from')"
                  [required]="true"
                  [field]="vm.f.source"
                  [value]="accountLabel(vm.model().source)"
                  [placeholder]="!vm.model().source"
                  (pressed)="chooseAccount('source')"
                />
                <ns-tap-field
                  [icon]="icons.in"
                  [label]="vm.i18n.t('editor.tx.to')"
                  [required]="true"
                  [field]="vm.f.destination"
                  [value]="accountLabel(vm.model().destination)"
                  [placeholder]="!vm.model().destination"
                  (pressed)="chooseAccount('destination')"
                />
              </StackLayout>
              <Label [text]="icons.swap" class="icon-btn" horizontalAlignment="right" verticalAlignment="middle" marginRight="12" [accessibilityLabel]="vm.i18n.t('editor.tx.swap')" (tap)="vm.swap()"></Label>
            </GridLayout>

            <StackLayout class="form-card">
              <ns-suggest-field
                surface="card"
                [icon]="icons.list"
                [label]="vm.i18n.t('common.category')"
                [hint]="vm.i18n.t('editor.tx.categoryPlaceholder')"
                [field]="vm.f.category"
                [options]="vm.categoryOptions()"
              />

              @if (vm.showBudgetBill()) {
                <ns-tap-field
                  surface="card"
                  [icon]="icons.budget"
                  [label]="vm.i18n.t('common.budget')"
                  [value]="optionLabel(vm.budgetOptions(), vm.model().budgetId) || vm.i18n.t('common.noBudget')"
                  (pressed)="choose('budgetId', vm.budgetOptions())"
                />
                <ns-tap-field
                  surface="card"
                  [icon]="icons.repeat"
                  [label]="vm.i18n.t('editor.tx.bill')"
                  [value]="optionLabel(vm.billOptions(), vm.model().billId) || vm.i18n.t('editor.tx.noBill')"
                  (pressed)="choose('billId', vm.billOptions())"
                />
              }

              @if (vm.showOtherCurrency()) {
                <GridLayout columns="36, *, auto" marginBottom="8">
                  <Label col="0" [text]="icons.currency" class="row-icon" marginTop="0" paddingTop="0" verticalAlignment="center"></Label>
                  <Label col="1" [text]="vm.i18n.t('editor.tx.otherCurrency')" verticalAlignment="center" textWrap="true"></Label>
                  <Switch col="2" [nsField]="vm.f.otherCurrency"></Switch>
                </GridLayout>
                @if (vm.model().otherCurrency) {
                  <ns-tap-field
                    surface="card"
                    [icon]="icons.currency"
                    [label]="vm.i18n.t('editor.tx.foreignCurrency')"
                    [value]="vm.model().foreignCurrency"
                    [chevron]="true"
                    (pressed)="choose('foreignCurrency', vm.otherCurrencyOptions())"
                  />
                  <ns-text-field surface="card" [icon]="icons.currency" keyboardType="number" [label]="vm.i18n.t('editor.tx.foreignAmount')" [required]="true" [field]="vm.f.foreignAmount" />
                }
              }

              <ns-field-box surface="card" [icon]="icons.tag" [label]="vm.i18n.t('common.tag')" [field]="vm.f.tags" [alwaysFloat]="false" [focused]="tagsFocused()" [filled]="vm.model().tags.length > 0">
                <TextField
                  class="field"
                  autocapitalizationType="none"
                  [hint]="tagsFocused() || vm.model().tags.length ? 'a, b' : ''"
                  [text]="vm.model().tags.join(', ')"
                  (focus)="tagsFocused.set(true)"
                  (blur)="tagsFocused.set(false)"
                  (textChange)="setTags($any($event).value)"
                ></TextField>
              </ns-field-box>

              <ns-text-field surface="card" [icon]="icons.notes" [multiline]="true" [height]="120" [label]="vm.i18n.t('editor.tx.notes')" [field]="vm.f.notes" />
            </StackLayout>

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
  protected readonly icons = ICON;
  protected readonly tagsFocused = signal(false);
  private readonly accountNames = computed(() => new Map(this.vm.lookups.accounts().map((a) => [a.id, a.name])));

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
