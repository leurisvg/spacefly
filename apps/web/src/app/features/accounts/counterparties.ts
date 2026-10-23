import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucidePlus } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import type { CounterpartyKind } from '@spacefly/shared';
import { HlmButton } from '@spartan-ng/helm/button';
import { counterpartiesViewModel } from '@spacefly/client/features/accounts/counterparties.vm';
import { FORMAT_PIPES } from '@spacefly/client/format/pipes';
import { Chart } from '../../shared/charts/chart';
import { ChartCard } from '../../shared/charts/chart-card';
import { Delta } from '../../shared/components/delta';
import { EmptyState } from '../../shared/components/empty-state';
import { KpiCard } from '../../shared/components/kpi-card';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';

/** Expense accounts (where money goes) or revenue accounts (where it comes from), picked by the route's `kind`. */
@Component({
  selector: 'sf-counterparties',
  imports: [NgIcon, RouterLink, TranslocoPipe, HlmButton, Chart, ChartCard, Delta, EmptyState, KpiCard, Money, PageHeader, ...FORMAT_PIPES],
  providers: [provideIcons({ lucidePencil, lucidePlus })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="vm.i18n.t(vm.kind() === 'income' ? 'nav.revenueAccounts' : 'nav.expenseAccounts')" [description]="vm.i18n.t('accounts.counterparty.descriptions.' + vm.kind())">
      <label class="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" class="accent-[var(--primary)]" [checked]="vm.showEmpty()" (change)="vm.showEmpty.set($any($event.target).checked)" />
        {{ 'accounts.counterparty.showEmpty' | transloco }}
      </label>
      <button hlmBtn size="sm" variant="outline" type="button" (click)="vm.create()">
        <ng-icon name="lucidePlus" aria-hidden="true" />{{ 'editor.entity.account.new' | transloco }}
      </button>
    </sf-page-header>

    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <sf-kpi [label]="vm.i18n.t('common.total')" [value]="vm.r()?.total ?? null" [previous]="vm.r()?.previousTotal ?? null" [upIsGood]="vm.kind() === 'income'" [accent]="vm.accent()" [loading]="vm.res.initialLoading()" />
      <sf-kpi [label]="vm.i18n.t('accounts.counterparty.activeAccounts')" format="compact" [value]="vm.active()" [accent]="vm.accent()" [loading]="vm.res.initialLoading()" />
      <sf-kpi [label]="vm.i18n.t('ranking.transactions')" format="compact" [value]="vm.r()?.count ?? null" [accent]="vm.accent()" [loading]="vm.res.initialLoading()" />
      <sf-kpi [label]="vm.i18n.t('ranking.avgTicket')" [value]="vm.avgTicket()" [accent]="vm.accent()" [loading]="vm.res.initialLoading()" />
    </section>

    <section class="grid gap-4 xl:grid-cols-2">
      <sf-chart-card [title]="vm.i18n.t('accounts.counterparty.topAccounts')" [table]="vm.rankTable()" [loading]="vm.res.loading()" [initialLoading]="vm.res.initialLoading()" [fileName]="'accounts-' + vm.kind()">
        @if (vm.rankOptions(); as o) {
          <sf-chart [options]="o" [height]="vm.rankHeight()" (chartClick)="openIndex($event.dataIndex)" />
        } @else if (!vm.res.initialLoading()) {
          <sf-empty [title]="vm.i18n.t('common.noData')" />
        }
      </sf-chart-card>
      <sf-chart-card [title]="vm.i18n.t('accounts.counterparty.monthly')" [table]="vm.monthlyTable()" [loading]="vm.res.loading()" [initialLoading]="vm.res.initialLoading()" [fileName]="'accounts-' + vm.kind() + '-monthly'">
        @if (vm.monthlyOptions(); as o) {
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
          @for (it of vm.shown(); track it.id) {
            <tr class="cursor-pointer border-b border-border/60 hover:bg-muted/40" [class.opacity-60]="!it.count" (click)="open(it.id)">
              <td class="py-2">
                <a class="font-medium hover:underline" [routerLink]="vm.path(it.id)" queryParamsHandling="preserve" (click)="$event.stopPropagation()">{{ it.name }}</a>
              </td>
              <td class="py-2 text-right"><sf-money [value]="it.value" /></td>
              <td class="num py-2 text-right text-xs">{{ it.share | pct: 1 }}</td>
              <td class="num py-2 text-right text-xs">{{ it.count }}</td>
              <td class="py-2 text-right"><sf-money class="text-xs" [value]="it.avg" /></td>
              <td class="py-2 text-right">
                <span class="inline-flex items-center gap-2">
                  <sf-money class="text-xs text-muted-foreground" [value]="it.previous" />
                  @if (it.value && it.previous) {
                    <sf-delta [value]="it.value" [previous]="it.previous" [upIsGood]="vm.kind() === 'income'" />
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
  private readonly router = inject(Router);

  /** Route data (withComponentInputBinding). */
  readonly kind = input<CounterpartyKind>('expense');

  protected readonly vm = counterpartiesViewModel({ kind: this.kind });

  protected open(id: string): void {
    void this.router.navigate(this.vm.path(id), { queryParamsHandling: 'preserve' });
  }

  protected openIndex(index: number): void {
    const item = this.vm.itemAtBar(index);
    if (item) this.open(item.id);
  }

  protected edit(event: Event, id: string): void {
    event.stopPropagation();
    this.vm.edit(id);
  }
}
