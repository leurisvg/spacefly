import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideClock, lucideMinus, lucidePencil, lucidePlus, lucideTriangleAlert } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import type { BillRow, BillsReport } from '@shared';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { reportResource } from '../../core/api/report-resource';
import { FormatService } from '../../core/format/format.service';
import { FORMAT_PIPES } from '../../core/format/pipes';
import { I18n } from '../../core/i18n/i18n';
import { rankingBarsOption } from '../../shared/charts/builders';
import { Chart } from '../../shared/charts/chart';
import { ChartCard, type ChartTable } from '../../shared/charts/chart-card';
import { money } from '../../shared/charts/series-colors';
import { EmptyState } from '../../shared/components/empty-state';
import { KpiCard } from '../../shared/components/kpi-card';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';
import { TxDetailService } from '../../shared/components/tx-detail.service';
import { EntityEditor } from '../editor/entity-editor.service';

@Component({
  selector: 'sf-bills',
  imports: [NgIcon, TranslocoPipe, HlmBadge, HlmButton, Chart, ChartCard, EmptyState, KpiCard, Money, PageHeader, ...FORMAT_PIPES],
  providers: [provideIcons({ lucideCircleCheck, lucideClock, lucideMinus, lucidePencil, lucidePlus, lucideTriangleAlert })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="i18n.t('nav.bills')" [description]="i18n.t('bills.description')">
      <button hlmBtn size="sm" variant="outline" type="button" (click)="editor.open('bill')">
        <ng-icon name="lucidePlus" aria-hidden="true" />{{ 'editor.entity.bill.new' | transloco }}
      </button>
    </sf-page-header>
    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <sf-kpi [label]="i18n.t('bills.monthly')" [value]="r()?.monthlyTotal ?? null" accent="var(--money-expense)" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('bills.yearly')" [value]="r()?.yearlyTotal ?? null" accent="var(--money-expense)" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('bills.paid')" format="compact" [value]="r()?.paidCount ?? null" accent="var(--status-good)" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('bills.pendingAmount', { n: r()?.pendingCount ?? 0 })" [value]="r()?.pendingAmount ?? null" accent="var(--status-warning)" [loading]="res.initialLoading()" />
    </section>

    @if (r(); as data) {
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
                <tr class="cursor-pointer border-b border-border/60 hover:bg-muted/40" [class.opacity-50]="!b.active" (click)="detail.open(b.name, { bill: b.id })">
                  <td class="py-2">
                    <div class="font-medium">{{ b.name }}</div>
                    <div class="text-xs text-muted-foreground">{{ 'bills.freq.' + b.repeatFreq | transloco }}{{ b.skip ? ' · ' + i18n.t('bills.skip', { n: b.skip }) : '' }}</div>
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
        <sf-chart-card [title]="i18n.t('bills.costRanking')" [subtitle]="i18n.t('bills.costRankingHint')" [table]="table()" fileName="subscriptions">
          <sf-chart [options]="rankingOpts()" [height]="rankingHeight()" />
        </sf-chart-card>
      } @else {
        <sf-empty [title]="i18n.t('bills.none')" />
      }
    }
  `,
})
export class Bills {
  protected readonly i18n = inject(I18n);
  protected readonly detail = inject(TxDetailService);
  protected readonly editor = inject(EntityEditor);
  private readonly f = inject(FormatService);
  protected readonly res = reportResource<BillsReport>('reports/bills');
  protected readonly r = this.res.data;

  private readonly active = computed(() => (this.r()?.bills ?? []).filter((b) => b.active && b.yearlyEquivalent > 0).sort((a, b) => b.yearlyEquivalent - a.yearlyEquivalent));
  protected readonly rankingOpts = computed(() => rankingBarsOption(this.f, this.active().map((b) => ({ name: b.name, value: b.yearlyEquivalent })), money.expense()));
  protected readonly rankingHeight = computed(() => `${Math.max(8, Math.min(this.active().length, 12) * 2 + 2)}rem`);
  protected readonly table = computed<ChartTable>(() => ({
    columns: [this.i18n.t('bills.name'), this.i18n.t('bills.monthlyEq'), this.i18n.t('bills.yearly')],
    rows: this.active().map((b) => [b.name, this.f.money(b.monthlyEquivalent), this.f.money(b.yearlyEquivalent)]),
    numeric: [1, 2],
  }));

  protected edit(event: Event, id: string): void {
    event.stopPropagation();
    this.editor.open('bill', id);
  }

  protected statusIcon(b: BillRow): string {
    return b.status === 'paid' ? 'lucideCircleCheck' : b.status === 'pending' ? 'lucideClock' : 'lucideMinus';
  }

  protected statusColor(b: BillRow): string {
    return b.status === 'paid' ? 'var(--status-good)' : b.status === 'pending' ? 'var(--status-warning)' : 'var(--muted-foreground)';
  }
}
