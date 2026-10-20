import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucideTrash2 } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { exchangeRatesViewModel } from '@spacefly/client/features/settings/exchange-rates.vm';
import { FORMAT_PIPES } from '@spacefly/client/format/pipes';
import { Select } from '../../shared/components/select';
import { Section } from '../../shared/components/section';
import { DateInput } from '../../shared/forms/date-input';

/** Enter, replace and delete the exchange rates stored in Firefly. */
@Component({
  selector: 'sf-exchange-rates',
  imports: [FormsModule, NgIcon, TranslocoPipe, HlmButton, HlmInput, HlmLabel, DateInput, Section, Select, ...FORMAT_PIPES],
  providers: [provideIcons({ lucidePencil, lucideTrash2 })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <sf-section [title]="vm.i18n.t('settings.exchange.title')" [loading]="vm.res.isLoading() && !vm.res.hasValue()">
      <p class="mb-3 text-xs text-muted-foreground">{{ 'settings.exchange.hint' | transloco }}</p>

      @if (vm.currencies().length) {
        <form class="mb-4 flex flex-wrap items-end gap-3" (ngSubmit)="vm.save()">
          <div class="flex w-40 flex-col items-start gap-1.5">
            <span hlmLabel>{{ 'settings.exchange.currency' | transloco }}</span>
            <sf-select class="w-full" [options]="options()" [value]="vm.currency()" (valueChange)="vm.pick($event)" [searchable]="false" [label]="vm.i18n.t('settings.exchange.currency')" />
          </div>
          <div class="flex flex-col items-start gap-1.5">
            <span hlmLabel>{{ 'settings.exchange.date' | transloco }}</span>
            <sf-date-input [(value)]="vm.date" [ariaLabel]="vm.i18n.t('settings.exchange.date')" />
          </div>
          <label hlmLabel class="flex flex-col items-start gap-1.5">
            {{ 'settings.exchange.rate' | transloco }}
            <input
              hlmInput
              name="rate"
              inputmode="decimal"
              autocomplete="off"
              class="num h-8 w-32"
              [placeholder]="vm.i18n.t('settings.exchange.rateHint', { currency: vm.currency(), primary: vm.primary() })"
              [attr.aria-label]="vm.i18n.t('settings.exchange.rateHint', { currency: vm.currency(), primary: vm.primary() })"
              [ngModel]="vm.rate()"
              (ngModelChange)="vm.rate.set($event)"
            />
          </label>
          <button hlmBtn size="sm" type="submit" [disabled]="!vm.canSave()">
            {{ (vm.replaces() ? 'settings.exchange.replace' : 'settings.exchange.add') | transloco }}
          </button>
        </form>
        <p class="-mt-2 mb-3 text-xs text-muted-foreground">
          {{ vm.i18n.t('settings.exchange.rateHint', { currency: vm.currency(), primary: vm.primary() }) }}
          @if (vm.replaces()) {
            · {{ 'settings.exchange.replacing' | transloco }}
          }
        </p>
        @if (vm.error(); as message) {
          <p class="mb-3 text-xs text-destructive" role="alert">{{ message }}</p>
        }
      }

      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border">
            <th class="eyebrow py-2 text-left">{{ 'settings.exchange.date' | transloco }}</th>
            <th class="eyebrow py-2 text-left">{{ 'settings.pair' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'settings.exchange.rate' | transloco }}</th>
            <th class="w-20"><span class="sr-only">{{ 'settings.exchange.edit' | transloco }}</span></th>
          </tr>
        </thead>
        <tbody>
          @for (r of vm.rows(); track r.from + r.to + r.date) {
            <tr class="border-b border-border/60">
              <td class="py-1.5">{{ r.date | fdate: 'long' }}</td>
              <td class="py-1.5 text-xs text-muted-foreground">1 {{ r.currency }} → {{ vm.primary() }}</td>
              <td class="num py-1.5 text-right">{{ r.rate.toFixed(4) }}</td>
              <td class="py-1.5 text-right">
                <button hlmBtn variant="ghost" size="icon-sm" type="button" [attr.aria-label]="('settings.exchange.edit' | transloco) + ': ' + r.currency + ' ' + r.date" (click)="vm.edit(r)">
                  <ng-icon name="lucidePencil" aria-hidden="true" />
                </button>
                <button hlmBtn variant="ghost" size="icon-sm" type="button" [attr.aria-label]="('forms.delete' | transloco) + ': ' + r.currency + ' ' + r.date" (click)="vm.remove(r)">
                  <ng-icon name="lucideTrash2" aria-hidden="true" />
                </button>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="4" class="py-6 text-center text-sm text-muted-foreground">{{ 'settings.exchange.none' | transloco }}</td>
            </tr>
          }
        </tbody>
      </table>
    </sf-section>
  `,
})
export class ExchangeRates {
  protected readonly vm = exchangeRatesViewModel();
  protected readonly options = computed(() => this.vm.currencies().map((code) => ({ value: code, label: code })));
}
