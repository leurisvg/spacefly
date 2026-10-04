import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import type { SavingsSeries } from '@spacefly/shared';
import { HlmButton } from '@spartan-ng/helm/button';
import { reportResource } from '../../core/api/report-resource';
import { I18n } from '../../core/i18n/i18n';
import { FiltersStore } from '../../core/state/filters.store';
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
    <sf-page-header [title]="i18n.t('nav.savings')" [description]="i18n.t('savings.description')">
      <sf-months-picker [value]="months()" (changed)="filters.setParams({ months: $event })" />
    </sf-page-header>
    <section class="grid grid-cols-2 gap-3">
      <sf-kpi [label]="i18n.t('savings.total')" [value]="total()" [previous]="first()" [spark]="totals()" accent="var(--money-savings)" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('savings.accounts')" format="compact" [value]="res.data()?.accounts?.length ?? null" accent="var(--money-savings)" [loading]="res.initialLoading()" />
    </section>
    <sf-section [title]="i18n.t('savings.perAccount')" [loading]="res.initialLoading()">
      <a section-actions hlmBtn variant="link" size="xs" routerLink="/settings">{{ 'savings.manageExcluded' | transloco }}</a>
      @if (res.data(); as s) {
        @if (s.accounts.length) {
          <sf-savings-multiples [series]="s" />
        } @else {
          <sf-empty [title]="i18n.t('common.noData')" />
        }
      }
    </sf-section>
  `,
})
export class Savings {
  protected readonly i18n = inject(I18n);
  protected readonly filters = inject(FiltersStore);
  private readonly monthsParam = this.filters.param('months');
  protected readonly months = computed(() => this.monthsParam() ?? '12');
  protected readonly res = reportResource<SavingsSeries>('reports/savings', () => ({ months: this.months() }));
  protected readonly totals = computed(() => {
    const s = this.res.data();
    return s ? s.months.map((_, i) => s.accounts.reduce((sum, a) => sum + a.balances[i], 0)) : null;
  });
  protected readonly total = computed(() => this.totals()?.at(-1) ?? null);
  protected readonly first = computed(() => this.totals()?.[0] ?? null);
}
