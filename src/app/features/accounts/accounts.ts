import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucidePlus } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import type { AccountsReport } from '@shared';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { reportResource } from '../../core/api/report-resource';
import { FormatService } from '../../core/format/format.service';
import { FORMAT_PIPES } from '../../core/format/pipes';
import { I18n } from '../../core/i18n/i18n';
import { FiltersStore } from '../../core/state/filters.store';
import { linesOption } from '../../shared/charts/builders';
import { Chart } from '../../shared/charts/chart';
import { ChartCard, type ChartTable } from '../../shared/charts/chart-card';
import { SeriesColors } from '../../shared/charts/series-colors';
import { KpiCard } from '../../shared/components/kpi-card';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';
import { TxDetailService } from '../../shared/components/tx-detail.service';
import { EntityEditor } from '../editor/entity-editor.service';
import { MonthsPicker } from './months-picker';

@Component({
  selector: 'sf-accounts',
  imports: [NgIcon, TranslocoPipe, HlmBadge, HlmButton, Chart, ChartCard, KpiCard, Money, PageHeader, MonthsPicker, ...FORMAT_PIPES],
  providers: [provideIcons({ lucidePencil, lucidePlus })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="i18n.t('nav.assetAccounts')" [description]="i18n.t('accounts.description')">
      <button hlmBtn size="sm" variant="outline" type="button" (click)="editor.open('account')">
        <ng-icon name="lucidePlus" aria-hidden="true" />{{ 'editor.entity.account.new' | transloco }}
      </button>
      <sf-months-picker [value]="months()" (changed)="filters.setParams({ months: $event })" />
    </sf-page-header>

    <section class="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <sf-kpi [label]="i18n.t('accounts.total')" [value]="r()?.total ?? null" accent="var(--money-net)" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('common.income')" [value]="income()" accent="var(--money-income)" [loading]="res.initialLoading()" />
      <sf-kpi class="col-span-2 lg:col-span-1" [label]="i18n.t('common.expenses')" [value]="expense()" accent="var(--money-expense)" [loading]="res.initialLoading()" />
    </section>

    <section class="overflow-x-auto rounded-xl border border-border bg-card p-4">
      <table class="w-full min-w-[40rem] text-sm">
        <thead>
          <tr class="border-b border-border">
            <th class="eyebrow py-2 text-left">{{ 'common.account' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'accounts.balanceOriginal' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'accounts.balance' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'common.income' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'common.expenses' | transloco }}</th>
            <th class="w-8"><span class="sr-only">{{ 'editor.tx.edit' | transloco }}</span></th>
          </tr>
        </thead>
        <tbody>
          @for (a of r()?.accounts ?? []; track a.id) {
            <tr class="cursor-pointer border-b border-border/60 hover:bg-muted/40" [class.opacity-60]="a.excluded" (click)="detail.open(a.name, { account: a.id })">
              <td class="py-2">
                <span class="inline-flex flex-wrap items-center gap-2">
                  <span class="size-2.5 rounded-sm" [style.background]="colors.color('account', a.id)"></span>
                  <span class="font-medium">{{ a.name }}</span>
                  @if (a.role) {
                    <span hlmBadge variant="outline" class="text-[10px]">{{ 'accounts.roles.' + a.role | transloco }}</span>
                  }
                  @if (a.excluded) {
                    <span hlmBadge variant="secondary" class="text-[10px]">{{ 'accounts.excluded' | transloco }}</span>
                  }
                </span>
              </td>
              <td class="py-2 text-right"><sf-money [value]="a.balanceOriginal" [currency]="a.currency" tone="auto" /></td>
              <td class="py-2 text-right"><sf-money [value]="a.balance" tone="auto" /></td>
              <td class="py-2 text-right"><sf-money [value]="a.income" class="text-xs" /></td>
              <td class="py-2 text-right"><sf-money [value]="a.expense" class="text-xs" /></td>
              <td class="py-2 text-right">
                <button hlmBtn variant="ghost" size="icon-sm" type="button" [attr.aria-label]="('editor.tx.edit' | transloco) + ': ' + a.name" (click)="edit($event, a.id)">
                  <ng-icon name="lucidePencil" aria-hidden="true" />
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </section>

    <sf-chart-card [title]="i18n.t('accounts.balanceHistory')" [table]="table()" [loading]="res.loading()" [initialLoading]="res.initialLoading()" fileName="account-balances">
      @if (options(); as o) {
        <sf-chart [options]="o" height="22rem" />
      }
    </sf-chart-card>
  `,
})
export class Accounts {
  protected readonly i18n = inject(I18n);
  protected readonly filters = inject(FiltersStore);
  protected readonly detail = inject(TxDetailService);
  protected readonly colors = inject(SeriesColors);
  protected readonly editor = inject(EntityEditor);
  private readonly f = inject(FormatService);
  private readonly monthsParam = this.filters.param('months');
  protected readonly months = computed(() => this.monthsParam() ?? '12');
  protected readonly res = reportResource<AccountsReport>('reports/accounts', () => ({ months: this.months() }));
  protected readonly r = this.res.data;
  protected readonly income = computed(() => this.r()?.accounts.reduce((s, a) => s + a.income, 0) ?? null);
  protected readonly expense = computed(() => this.r()?.accounts.reduce((s, a) => s + a.expense, 0) ?? null);

  protected edit(event: Event, id: string): void {
    event.stopPropagation();
    this.editor.open('account', id);
  }

  protected readonly options = computed(() => {
    const r = this.r();
    if (!r?.history.length) return null;
    return linesOption(this.f, r.months, r.history.map((h) => ({ id: h.id, name: h.name, values: h.balances, color: this.colors.color('account', h.id) })));
  });

  protected readonly table = computed<ChartTable | null>(() => {
    const r = this.r();
    if (!r) return null;
    return {
      columns: [this.i18n.t('common.account'), ...r.months.map((m) => this.f.monthLabel(m))],
      rows: r.history.map((h) => [h.name, ...h.balances.map((b) => this.f.compact(b))]),
      numeric: r.months.map((_, i) => i + 1),
    };
  });
}
