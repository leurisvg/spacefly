import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { compareViewModel } from '@spacefly/client/features/reports/compare.vm';
import { FORMAT_PIPES } from '@spacefly/client/format/pipes';
import { Chart } from '../../shared/charts/chart';
import { ChartCard } from '../../shared/charts/chart-card';
import { EmptyState } from '../../shared/components/empty-state';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';
import { Select } from '../../shared/components/select';

@Component({
  selector: 'sf-compare',
  imports: [FormsModule, TranslocoPipe, HlmInput, HlmToggleGroupImports, Chart, ChartCard, EmptyState, Money, PageHeader, Select, ...FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="vm.i18n.t('nav.compare')" [description]="vm.i18n.t('compare.description')" />

    <div class="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <hlm-toggle-group type="single" variant="outline" size="sm" [value]="vm.mode()" [nullable]="false" (valueChange)="$event && vm.setMode($any($event))">
        <button hlmToggleGroupItem value="previous">{{ 'compare.previous' | transloco }}</button>
        <button hlmToggleGroupItem value="yoy">{{ 'compare.yoy' | transloco }}</button>
        <button hlmToggleGroupItem value="custom">{{ 'compare.custom' | transloco }}</button>
      </hlm-toggle-group>
      @if (vm.mode() === 'custom') {
        <span class="text-xs text-muted-foreground">B:</span>
        <input hlmInput type="date" class="h-8 w-36 text-xs" [ngModel]="vm.b().start" (ngModelChange)="vm.setB('bStart', $event)" [attr.aria-label]="vm.i18n.t('period.from')" />
        <input hlmInput type="date" class="h-8 w-36 text-xs" [ngModel]="vm.b().end" (ngModelChange)="vm.setB('bEnd', $event)" [attr.aria-label]="vm.i18n.t('period.to')" />
      }
      <sf-select class="w-40" [searchable]="false" [options]="vm.groupOptions()" [label]="vm.i18n.t('compare.groupBy')" [value]="vm.groupBy()" (valueChange)="vm.setGroupBy($event)" />
      <hlm-toggle-group type="single" variant="outline" size="sm" [value]="vm.kind()" [nullable]="false" (valueChange)="$event && vm.setKind($any($event))">
        <button hlmToggleGroupItem value="expense">{{ 'common.expenses' | transloco }}</button>
        <button hlmToggleGroupItem value="income">{{ 'common.income' | transloco }}</button>
      </hlm-toggle-group>
    </div>

    @if (vm.r(); as data) {
      <section class="grid gap-3 sm:grid-cols-2">
        @for (side of [{ k: 'A', p: data.a }, { k: 'B', p: data.b }]; track side.k) {
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="flex items-center gap-2">
              <span class="grid size-6 place-items-center rounded-md bg-muted text-xs font-bold">{{ side.k }}</span>
              <span class="text-sm font-medium">{{ side.p.start | fdate: 'short' }} – {{ side.p.end | fdate: 'long' }}</span>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div><div class="eyebrow">{{ 'common.income' | transloco }}</div><sf-money class="text-lg font-semibold" [value]="side.p.income" /></div>
              <div><div class="eyebrow">{{ 'common.expenses' | transloco }}</div><sf-money class="text-lg font-semibold" [value]="side.p.expense" /></div>
            </div>
          </div>
        }
      </section>
    }

    <section class="grid gap-4 xl:grid-cols-2">
      <sf-chart-card [title]="vm.i18n.t('compare.deltaTitle')" [subtitle]="vm.i18n.t(vm.kind() === 'expense' ? 'compare.deltaHintExpense' : 'compare.deltaHintIncome')" [table]="vm.table()" [loading]="vm.res.loading()" [initialLoading]="vm.res.initialLoading()" fileName="compare-delta">
        @if (vm.rows().length) {
          <sf-chart [options]="vm.divergingOpts()!" [height]="chartHeight()" (chartClick)="vm.openRow($event.dataIndex)" />
        } @else if (!vm.res.initialLoading()) {
          <sf-empty [title]="vm.i18n.t('common.noData')" />
        }
      </sf-chart-card>
      <sf-chart-card [title]="vm.i18n.t('compare.trend')" [subtitle]="vm.i18n.t('dashboard.last12')" [loading]="vm.res.loading()" [initialLoading]="vm.res.initialLoading()" fileName="compare-trend">
        @if (vm.trendOpts(); as o) {
          <sf-chart [options]="o" height="22rem" />
        }
      </sf-chart-card>
    </section>

    <section class="overflow-x-auto rounded-xl border border-border bg-card p-4">
      <table class="w-full min-w-[36rem] text-sm">
        <thead>
          <tr class="border-b border-border">
            <th class="eyebrow py-2 text-left">{{ 'compare.groups.' + vm.groupBy() | transloco }}</th>
            <th class="eyebrow py-2 text-right">A</th>
            <th class="eyebrow py-2 text-right">B</th>
            <th class="eyebrow py-2 text-right">Δ</th>
            <th class="eyebrow py-2 text-right">Δ%</th>
          </tr>
        </thead>
        <tbody>
          @for (row of vm.rows(); track row.id; let i = $index) {
            <tr class="cursor-pointer border-b border-border/60 hover:bg-muted/40" (click)="vm.openRow(i, true)">
              <td class="py-2">{{ vm.name(row) }}</td>
              <td class="py-2 text-right"><sf-money [value]="row.a" /></td>
              <td class="py-2 text-right text-muted-foreground"><sf-money [value]="row.b" /></td>
              <td class="py-2 text-right" [class.text-negative]="(row.delta > 0) === (vm.kind() === 'expense')" [class.text-positive]="row.delta !== 0 && (row.delta > 0) !== (vm.kind() === 'expense')">
                <span class="num">{{ row.delta | money: null : true }}</span>
              </td>
              <td class="py-2 text-right num text-xs">{{ row.pct === null ? ('monthly.new' | transloco) : (row.pct | pct: 1 : true) }}</td>
            </tr>
          }
        </tbody>
      </table>
    </section>
  `,
})
export class Compare {
  protected readonly vm = compareViewModel();
  protected readonly chartHeight = computed(() => `${Math.max(12, this.vm.barCount() * 1.9 + 2)}rem`);
}
