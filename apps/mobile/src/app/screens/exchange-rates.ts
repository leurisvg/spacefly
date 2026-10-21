import { Component, inject, NO_ERRORS_SCHEMA } from '@angular/core';
import { exchangeRatesViewModel, rateText } from '@spacefly/client/features/settings/exchange-rates.vm';
import { FormatService } from '@spacefly/client/format/format.service';

/** Enter, replace and delete the exchange rates stored in Firefly. */
@Component({
  selector: 'ns-exchange-rates',
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <StackLayout class="card">
      <Label [text]="vm.i18n.t('settings.exchange.title')" class="card-title"></Label>
      <Label [text]="vm.i18n.t('settings.exchange.hint')" class="muted small" textWrap="true"></Label>

      @if (vm.currencies().length) {
        <Label [text]="vm.i18n.t('settings.exchange.currency')" class="field-label" marginTop="6"></Label>
        <WrapLayout>
          @for (c of vm.currencies(); track c) {
            <Label [text]="c" class="chip" [class.chip-on]="vm.currency() === c" (tap)="vm.pick(c)"></Label>
          }
        </WrapLayout>

        <Label [text]="vm.i18n.t('settings.exchange.date')" class="field-label"></Label>
        <TextField class="field" hint="YYYY-MM-DD" autocapitalizationType="none" autocorrect="false" [text]="vm.date()" (textChange)="vm.date.set($any($event).value)"></TextField>

        <Label [text]="vm.i18n.t('settings.exchange.rateHint', { currency: vm.currency(), primary: vm.primary() })" class="field-label"></Label>
        <TextField class="field" keyboardType="number" [hint]="vm.i18n.t('settings.exchange.rate')" [text]="vm.rate()" (textChange)="vm.rate.set($any($event).value)"></TextField>
        @if (vm.replaces()) {
          <Label [text]="vm.i18n.t('settings.exchange.replacing')" class="muted small" textWrap="true"></Label>
        }
        @if (vm.error(); as message) {
          <Label [text]="message" class="field-error" textWrap="true"></Label>
        }
        <Button [text]="vm.i18n.t(vm.replaces() ? 'settings.exchange.replace' : 'settings.exchange.add')" class="btn" marginTop="6" [isEnabled]="vm.canSave()" (tap)="vm.save()"></Button>
      }

      @for (r of vm.rows(); track r.from + r.to + r.date) {
        <GridLayout columns="*, auto, auto" class="row-divider">
          <StackLayout col="0" (tap)="vm.edit(r)">
            <Label [text]="f.date(r.date, 'long')" textWrap="false"></Label>
            <Label [text]="'1 ' + r.currency + ' → ' + vm.primary() + ' · ' + text(r.rate)" class="muted small" textWrap="false"></Label>
          </StackLayout>
          <Label col="1" [text]="vm.i18n.t('settings.exchange.edit')" class="chip" (tap)="vm.edit(r)"></Label>
          <Label col="2" [text]="vm.i18n.t('forms.delete')" class="chip" (tap)="vm.remove(r)"></Label>
        </GridLayout>
      } @empty {
        <Label [text]="vm.i18n.t('settings.exchange.none')" class="muted" marginTop="6"></Label>
      }
    </StackLayout>
  `,
})
export class ExchangeRates {
  protected readonly vm = exchangeRatesViewModel();
  protected readonly f = inject(FormatService);
  protected readonly text = rateText;
}
