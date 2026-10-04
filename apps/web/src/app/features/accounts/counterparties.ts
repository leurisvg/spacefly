import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucidePlus } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import type { CounterpartiesReport, CounterpartyItem, CounterpartyKind } from '@spacefly/shared';
import { HlmButton } from '@spartan-ng/helm/button';
import { reportResource } from '@spacefly/client/api/report-resource';
import { FormatService } from '@spacefly/client/format/format.service';
import { FORMAT_PIPES } from '@spacefly/client/format/pipes';
import { I18n } from '@spacefly/client/i18n/i18n';
import { categoryBarsOption, rankingBarsOption } from '@spacefly/client/charts/builders';
import { Chart } from '../../shared/charts/chart';
import { ChartCard } from '../../shared/charts/chart-card';
import type { ChartTable } from '@spacefly/client/charts/chart-table';
import { money } from '@spacefly/client/charts/series-colors';
import { Delta } from '../../shared/components/delta';
import { EmptyState } from '../../shared/components/empty-state';
import { KpiCard } from '../../shared/components/kpi-card';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';
import { EntityEditor } from '@spacefly/client/state/entity-editor.service';

/** Expense accounts (where money goes) or revenue accounts (where it comes from), picked by the route's `kind`. */
@Component({
  selector: 'sf-counterparties',
  imports: [NgIcon, RouterLink, TranslocoPipe, HlmButton, Chart, ChartCard, Delta, EmptyState, KpiCard, Money, PageHeader, ...FORMAT_PIPES],
  providers: [provideIcons({ lucidePencil, lucidePlus })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="i18n.t(kind() === 'income' ? 'nav.revenueAccounts' : 'nav.expenseAccounts')" [description]="i18n.t('accounts.counterparty.descriptions.' + kind())">
      <label class="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" class="accent-[var(--primary)]" [checked]="showEmpty()" (change)="showEmpty.set($any($event.target).checked)" />
        {{ 'accounts.counterparty.showEmpty' | transloco }}
      </label>
      <button hlmBtn size="sm" variant="outline" type="button" (click)="create()">
        <ng-icon name="lucidePlus" aria-hidden="true" />{{ 'editor.entity.account.new' | transloco }}
      </button>
    </sf-page-header>

    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <sf-kpi [label]="i18n.t('common.total')" [value]="r()?.total ?? null" [previous]="r()?.previousTotal ?? null" [upIsGood]="kind() === 'income'" [accent]="accent()" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('accounts.counterparty.activeAccounts')" format="compact" [value]="active()" [accent]="accent()" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('ranking.transactions')" format="compact" [value]="r()?.count ?? null" [accent]="accent()" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('ranking.avgTicket')" [value]="avgTicket()" [accent]="accent()" [loading]="res.initialLoading()" />
    </section>

    <section class="grid gap-4 xl:grid-cols-2">
      <sf-chart-card [title]="i18n.t('accounts.counterparty.topAccounts')" [table]="rankTable()" [loading]="res.loading()" [initialLoading]="res.initialLoading()" [fileName]="'accounts-' + kind()">
        @if (rankOptions(); as o) {
          <sf-chart [options]="o" [height]="rankHeight()" (chartClick)="openIndex($event.dataIndex)" />
        } @else if (!res.initialLoading()) {
          <sf-empty [title]="i18n.t('common.noData')" />
        }
      </sf-chart-card>
      <sf-chart-card [title]="i18n.t('accounts.counterparty.monthly')" [table]="monthlyTable()" [loading]="res.loading()" [initialLoading]="res.initialLoading()" [fileName]="'accounts-' + kind() + '-monthly'">
        @if (monthlyOptions(); as o) {
          <sf-chart [options]="o" height="18rem" />
        }
      </sf-chart-card>
    </section>

    <section class="overflow-x-auto rounded-xl border border-border bg-card p-4">
      <table class="w-full min-w-[46rem] text-sm">
        <thead>
          <tr class="border-b border-border">
            <th class="eyebrow py-2 text-left">{{ 'ranking.name' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'common.total' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'ranking.share' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'ranking.count' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'ranking.avgTicket' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'ranking.previous' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'accounts.counterparty.lastActivity' | transloco }}</th>
            <th class="w-8"><span class="sr-only">{{ 'editor.tx.edit' | transloco }}</span></th>
          </tr>
        </thead>
        <tbody>
          @for (it of shown(); track it.id) {
            <tr class="cursor-pointer border-b border-border/60 hover:bg-muted/40" [class.opacity-60]="!it.count" (click)="open(it.id)">
              <td class="py-2">
                <a class="font-medium hover:underline" [routerLink]="path(it.id)" queryParamsHandling="preserve" (click)="$event.stopPropagation()">{{ it.name }}</a>
              </td>
              <td class="py-2 text-right"><sf-money [value]="it.value" /></td>
              <td class="num py-2 text-right text-xs">{{ it.share | pct: 1 }}</td>
              <td class="num py-2 text-right text-xs">{{ it.count }}</td>
              <td class="py-2 text-right"><sf-money class="text-xs" [value]="it.avg" /></td>
              <td class="py-2 text-right">
                <span class="inline-flex items-center gap-2">
                  <sf-money class="text-xs text-muted-foreground" [value]="it.previous" />
                  @if (it.value && it.previous) {
                    <sf-delta [value]="it.value" [previous]="it.previous" [upIsGood]="kind() === 'income'" />
                  }
                </span>
              </td>
              <td class="py-2 text-right text-xs text-muted-foreground">{{ it.lastDate ? (it.lastDate | fdate: 'short') + ' ' + it.lastDate.slice(0, 4) : '—' }}</td>
              <td class="py-2 text-right">
                <button hlmBtn variant="ghost" size="icon-sm" type="button" [attr.aria-label]="('editor.tx.edit' | transloco) + ': ' + it.name" (click)="edit($event, it.id)">
                  <ng-icon name="lucidePencil" aria-hidden="true" />
                </button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="8" class="py-8 text-center text-sm text-muted-foreground">{{ 'common.noData' | transloco }}</td></tr>
          }
        </tbody>
      </table>
    </section>
  `,
})
export class Counterparties {
  protected readonly i18n = inject(I18n);
  private readonly f = inject(FormatService);
  private readonly router = inject(Router);
  protected readonly editor = inject(EntityEditor);

  /** Route data (withComponentInputBinding). */
  readonly kind = input<CounterpartyKind>('expense');

  protected readonly showEmpty = signal(false);
  protected readonly res = reportResource<CounterpartiesReport>('reports/counterparties', () => ({ kind: this.kind() }));
  protected readonly r = this.res.data;
  protected readonly accent = computed(() => (this.kind() === 'income' ? 'var(--money-income)' : 'var(--money-expense)'));
  private readonly color = computed(() => (this.kind() === 'income' ? money.income() : money.expense()));

  private readonly items = computed(() => this.r()?.items ?? []);
  protected readonly active = computed(() => (this.r() ? this.items().filter((i) => i.count > 0).length : null));
  protected readonly avgTicket = computed(() => (this.r()?.count ? this.r()!.total / this.r()!.count : null));
  /** Accounts that moved money in this or the previous period, or all of them on request. */
  protected readonly shown = computed(() => (this.showEmpty() ? this.items() : this.items().filter((i) => i.value > 0 || i.previous > 0)));
  private readonly top = computed(() => this.items().filter((i) => i.value > 0).slice(0, 12));

  protected readonly rankOptions = computed(() => (this.top().length ? rankingBarsOption(this.f, this.top(), this.color()) : null));
  protected readonly rankHeight = computed(() => `${Math.max(10, this.top().length * 2 + 2)}rem`);
  protected readonly rankTable = computed<ChartTable | null>(() =>
    this.top().length
      ? {
          columns: [this.i18n.t('ranking.name'), this.i18n.t('common.total'), this.i18n.t('ranking.share'), this.i18n.t('ranking.count')],
          rows: this.top().map((i) => [i.name, this.f.money(i.value), this.f.pct(i.share), String(i.count)]),
          numeric: [1, 2, 3],
        }
      : null,
  );

  protected readonly monthlyOptions = computed(() => {
    const r = this.r();
    return r ? categoryBarsOption(this.f, r.months.map((m) => this.f.monthLabel(m)), r.monthly, this.color(), this.i18n.t(this.kind() === 'income' ? 'common.income' : 'common.expenses')) : null;
  });
  protected readonly monthlyTable = computed<ChartTable | null>(() => {
    const r = this.r();
    return r ? { columns: [this.i18n.t('common.month'), this.i18n.t('common.total')], rows: r.months.map((m, i) => [this.f.date(m, 'month'), this.f.money(r.monthly[i])]), numeric: [1] } : null;
  });

  protected path(id: string): string[] {
    return ['/accounts', this.kind() === 'income' ? 'revenue' : 'expense', id];
  }

  protected open(id: string): void {
    void this.router.navigate(this.path(id), { queryParamsHandling: 'preserve' });
  }

  protected openIndex(index: number): void {
    // The bars are drawn bottom-up, so the clicked index counts from the end of the top list.
    const item: CounterpartyItem | undefined = this.top().slice(0, 12).reverse()[index];
    if (item) this.open(item.id);
  }

  protected create(): void {
    this.editor.open('account', null, { accountType: this.kind() === 'income' ? 'revenue' : 'expense' });
  }

  protected edit(event: Event, id: string): void {
    event.stopPropagation();
    this.editor.open('account', id);
  }
}
