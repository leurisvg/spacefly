import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmButton } from '@spartan-ng/helm/button';
import { savingsViewModel } from '@spacefly/client/features/accounts/savings.vm';
import { SavingsMultiples } from '../../shared/charts/savings-multiples';
import { EmptyState } from '../../shared/components/empty-state';
import { KpiCard } from '../../shared/components/kpi-card';
import { PageHeader } from '../../shared/components/page-header';
import { Section } from '../../shared/components/section';
import { MonthsPicker } from './months-picker';

@Component({
  selector: 'sf-savings',
  imports: [RouterLink, TranslocoPipe, HlmButton, SavingsMultiples, EmptyState, KpiCard, PageHeader, Section, MonthsPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="vm.i18n.t('nav.savings')" [description]="vm.i18n.t('savings.description')">
      <sf-months-picker [value]="vm.months()" (changed)="vm.setMonths($event)" />
    </sf-page-header>
    <section class="grid grid-cols-2 gap-3">
      <sf-kpi [label]="vm.i18n.t('savings.total')" [value]="vm.total()" [previous]="vm.first()" [spark]="vm.totals()" accent="var(--money-savings)" [loading]="vm.res.initialLoading()" />
      <sf-kpi [label]="vm.i18n.t('savings.accounts')" format="compact" [value]="vm.res.data()?.accounts?.length ?? null" accent="var(--money-savings)" [loading]="vm.res.initialLoading()" />
    </section>
    <sf-section [title]="vm.i18n.t('savings.perAccount')" [loading]="vm.res.initialLoading()">
      <a section-actions hlmBtn variant="link" size="xs" routerLink="/settings">{{ 'savings.manageExcluded' | transloco }}</a>
      @if (vm.res.data(); as s) {
        @if (s.accounts.length) {
          <sf-savings-multiples [series]="s" />
        } @else {
          <sf-empty [title]="vm.i18n.t('common.noData')" />
        }
      }
    </sf-section>
  `,
})
export class Savings {
  protected readonly vm = savingsViewModel();
}
