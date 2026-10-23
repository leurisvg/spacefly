import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideClock, lucideMinus, lucidePencil, lucidePlus, lucideTriangleAlert } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import type { BillRow } from '@spacefly/shared';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { billsViewModel, billStatusTone } from '@spacefly/client/features/planning/bills.vm';
import { FORMAT_PIPES } from '@spacefly/client/format/pipes';
import { Chart } from '../../shared/charts/chart';
import { ChartCard } from '../../shared/charts/chart-card';
import { EmptyState } from '../../shared/components/empty-state';
import { KpiCard } from '../../shared/components/kpi-card';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';

@Component({
  selector: 'sf-bills',
  imports: [NgIcon, TranslocoPipe, HlmBadge, HlmButton, Chart, ChartCard, EmptyState, KpiCard, Money, PageHeader, ...FORMAT_PIPES],
  providers: [provideIcons({ lucideCircleCheck, lucideClock, lucideMinus, lucidePencil, lucidePlus, lucideTriangleAlert })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="vm.i18n.t('nav.bills')" [description]="vm.i18n.t('bills.description')">
      <button hlmBtn size="sm" variant="outline" type="button" (click)="vm.create()">
        <ng-icon name="lucidePlus" aria-hidden="true" />{{ 'editor.entity.bill.new' | transloco }}
      </button>
    </sf-page-header>
    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <sf-kpi [label]="vm.i18n.t('bills.monthly')" [value]="vm.r()?.monthlyTotal ?? null" accent="var(--money-expense)" [loading]="vm.res.initialLoading()" />
      <sf-kpi [label]="vm.i18n.t('bills.yearly')" [value]="vm.r()?.yearlyTotal ?? null" accent="var(--money-expense)" [loading]="vm.res.initialLoading()" />
      <sf-kpi [label]="vm.i18n.t('bills.paid')" format="compact" [value]="vm.r()?.paidCount ?? null" accent="var(--status-good)" [loading]="vm.res.initialLoading()" />
      <sf-kpi [label]="vm.i18n.t('bills.pendingAmount', { n: vm.r()?.pendingCount ?? 0 })" [value]="vm.r()?.pendingAmount ?? null" accent="var(--status-warning)" [loading]="vm.res.initialLoading()" />
    </section>

    @if (vm.r(); as data) {
      @if (data.bills.length) {
        <section class="overflow-x-auto rounded-xl border border-border bg-card p-4">
          <table class="w-full min-w-[46rem] text-sm">
            <thead>
              <tr class="border-b border-border">
                <th class="eyebrow py-2 text-left">{{ 'bills.name' | transloco }}</th>
                <th class="eyebrow py-2 text-left">{{ 'bills.status' | transloco }}</th>
                <th class="eyebrow py-2 text-left">{{ 'bills.next' | transloco }}</th>
                <th class="eyebrow py-2 text-right">{{ 'bills.range' | transloco }}</th>
                <th class="eyebrow py-2 text-right">{{ 'bills.monthlyEq' | transloco }}</th>
                <th class="eyebrow py-2 text-right">{{ 'bills.paidThisPeriod' | transloco }}</th>
                <th class="w-8"><span class="sr-only">{{ 'editor.tx.edit' | transloco }}</span></th>
              </tr>
            </thead>
            <tbody>
              @for (b of data.bills; track b.id) {
                <tr class="cursor-pointer border-b border-border/60 hover:bg-muted/40" [class.opacity-50]="!b.active" (click)="vm.open(b)">
                  <td class="py-2">
                    <div class="font-medium">{{ b.name }}</div>
                    <div class="text-xs text-muted-foreground">{{ 'bills.freq.' + b.repeatFreq | transloco }}{{ b.skip ? ' · ' + vm.i18n.t('bills.skip', { n: b.skip }) : '' }}</div>
                  </td>
                  <td class="py-2">
                    <span class="inline-flex items-center gap-1 text-xs" [style.color]="statusColor(b)">
                      <ng-icon [name]="statusIcon(b)" />{{ 'bills.statuses.' + b.status | transloco }}
                    </span>
                    @if (b.outOfRange) {
                      <span hlmBadge variant="outline" class="ml-1 gap-1 border-status-warning/50 text-[10px] text-status-warning">
                        <ng-icon name="lucideTriangleAlert" />{{ 'bills.outOfRange' | transloco }}
                      </span>
                    }
                  </td>
                  <td class="py-2 text-xs">{{ b.nextDate ? (b.nextDate | fdate: 'day') : '—' }}</td>
                  <td class="py-2 text-right text-xs"><sf-money [value]="b.amountMin" /> – <sf-money [value]="b.amountMax" /></td>
                  <td class="py-2 text-right"><sf-money [value]="b.monthlyEquivalent" /></td>
                  <td class="py-2 text-right text-xs">
                    @for (p of b.paidInPeriod; track p.journalId) {
                      <div>{{ p.date | fdate: 'short' }} · <sf-money [value]="p.amount" /></div>
                    } @empty {
                      <span class="text-muted-foreground">—</span>
                    }
                  </td>
                  <td class="py-2 text-right">
                    <button hlmBtn variant="ghost" size="icon-sm" type="button" [attr.aria-label]="('editor.tx.edit' | transloco) + ': ' + b.name" (click)="edit($event, b.id)">
                      <ng-icon name="lucidePencil" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </section>
        <sf-chart-card [title]="vm.i18n.t('bills.costRanking')" [subtitle]="vm.i18n.t('bills.costRankingHint')" [table]="vm.table()" fileName="subscriptions">
          <sf-chart [options]="vm.rankingOpts()" [height]="vm.rankingHeight()" (chartClick)="vm.openBar($event.dataIndex)" />
        </sf-chart-card>
      } @else {
        <sf-empty [title]="vm.i18n.t('bills.none')" />
      }
    }
  `,
})
export class Bills {
  protected readonly vm = billsViewModel();

  protected edit(event: Event, id: string): void {
    event.stopPropagation();
    this.vm.edit(id);
  }

  protected statusIcon(b: BillRow): string {
    const tone = billStatusTone(b.status);
    return tone === 'good' ? 'lucideCircleCheck' : tone === 'warning' ? 'lucideClock' : 'lucideMinus';
  }

  protected statusColor(b: BillRow): string {
    const tone = billStatusTone(b.status);
    return tone === 'good' ? 'var(--status-good)' : tone === 'warning' ? 'var(--status-warning)' : 'var(--muted-foreground)';
  }
}
