import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { isIsoDate, previousPeriod, samePeriodLastYear, type CompareReport, type CompareRow, type GroupBy, type Period } from '@spacefly/shared';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { reportResource } from '../../core/api/report-resource';
import { FormatService } from '../../core/format/format.service';
import { FORMAT_PIPES } from '../../core/format/pipes';
import { I18n } from '../../core/i18n/i18n';
import { FiltersStore } from '../../core/state/filters.store';
import { divergingOption, incomeExpenseOption } from '../../shared/charts/builders';
import { Chart } from '../../shared/charts/chart';
import { ChartCard, type ChartTable } from '../../shared/charts/chart-card';
import { EmptyState } from '../../shared/components/empty-state';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';
import { Select } from '../../shared/components/select';
import { TxDetailService } from '../../shared/components/tx-detail.service';

type Mode = 'previous' | 'yoy' | 'custom';

@Component({
  selector: 'sf-compare',
  imports: [FormsModule, TranslocoPipe, HlmInput, HlmToggleGroupImports, Chart, ChartCard, EmptyState, Money, PageHeader, Select, ...FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="i18n.t('nav.compare')" [description]="i18n.t('compare.description')" />

    <div class="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <hlm-toggle-group type="single" variant="outline" size="sm" [value]="mode()" [nullable]="false" (valueChange)="$event && filters.setParams({ cmp: $any($event) })">
        <button hlmToggleGroupItem value="previous">{{ 'compare.previous' | transloco }}</button>
        <button hlmToggleGroupItem value="yoy">{{ 'compare.yoy' | transloco }}</button>
        <button hlmToggleGroupItem value="custom">{{ 'compare.custom' | transloco }}</button>
      </hlm-toggle-group>
      @if (mode() === 'custom') {
        <span class="text-xs text-muted-foreground">B:</span>
        <input hlmInput type="date" class="h-8 w-36 text-xs" [ngModel]="b().start" (ngModelChange)="setB('bStart', $event)" [attr.aria-label]="i18n.t('period.from')" />
        <input hlmInput type="date" class="h-8 w-36 text-xs" [ngModel]="b().end" (ngModelChange)="setB('bEnd', $event)" [attr.aria-label]="i18n.t('period.to')" />
      }
      <sf-select class="w-40" [searchable]="false" [options]="groupOptions()" [label]="i18n.t('compare.groupBy')" [value]="groupBy()" (valueChange)="filters.setParams({ groupBy: $event })" />
      <hlm-toggle-group type="single" variant="outline" size="sm" [value]="kind()" [nullable]="false" (valueChange)="$event && filters.setParams({ kind: $any($event) })">
        <button hlmToggleGroupItem value="expense">{{ 'common.expenses' | transloco }}</button>
        <button hlmToggleGroupItem value="income">{{ 'common.income' | transloco }}</button>
      </hlm-toggle-group>
    </div>

    @if (r(); as data) {
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
      <sf-chart-card [title]="i18n.t('compare.deltaTitle')" [subtitle]="i18n.t(kind() === 'expense' ? 'compare.deltaHintExpense' : 'compare.deltaHintIncome')" [table]="table()" [loading]="res.loading()" [initialLoading]="res.initialLoading()" fileName="compare-delta">
        @if (rows().length) {
          <sf-chart [options]="divergingOpts()!" [height]="chartHeight()" (chartClick)="openRow($event.dataIndex)" />
        } @else if (!res.initialLoading()) {
          <sf-empty [title]="i18n.t('common.noData')" />
        }
      </sf-chart-card>
      <sf-chart-card [title]="i18n.t('compare.trend')" [subtitle]="i18n.t('dashboard.last12')" [loading]="res.loading()" [initialLoading]="res.initialLoading()" fileName="compare-trend">
        @if (trendOpts(); as o) {
          <sf-chart [options]="o" height="22rem" />
        }
      </sf-chart-card>
    </section>

    <section class="overflow-x-auto rounded-xl border border-border bg-card p-4">
      <table class="w-full min-w-[36rem] text-sm">
        <thead>
          <tr class="border-b border-border">
            <th class="eyebrow py-2 text-left">{{ 'compare.groups.' + groupBy() | transloco }}</th>
            <th class="eyebrow py-2 text-right">A</th>
            <th class="eyebrow py-2 text-right">B</th>
            <th class="eyebrow py-2 text-right">Δ</th>
            <th class="eyebrow py-2 text-right">Δ%</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.id; let i = $index) {
            <tr class="cursor-pointer border-b border-border/60 hover:bg-muted/40" (click)="openRow(i, true)">
              <td class="py-2">{{ name(row) }}</td>
              <td class="py-2 text-right"><sf-money [value]="row.a" /></td>
              <td class="py-2 text-right text-muted-foreground"><sf-money [value]="row.b" /></td>
              <td class="py-2 text-right" [class.text-negative]="(row.delta > 0) === (kind() === 'expense')" [class.text-positive]="row.delta !== 0 && (row.delta > 0) !== (kind() === 'expense')">
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
  protected readonly i18n = inject(I18n);
  protected readonly filters = inject(FiltersStore);
  private readonly f = inject(FormatService);
  private readonly detail = inject(TxDetailService);

  private readonly cmp = this.filters.param('cmp');
  private readonly groupParam = this.filters.param('groupBy');
  private readonly kindParam = this.filters.param('kind');
  private readonly bStartParam = this.filters.param('bStart');
  private readonly bEndParam = this.filters.param('bEnd');

  protected readonly mode = computed<Mode>(() => (['previous', 'yoy', 'custom'].includes(this.cmp() ?? '') ? (this.cmp() as Mode) : 'previous'));
  protected readonly groupBy = computed<GroupBy>(() => (this.groupParam() as GroupBy) || 'category');
  protected readonly kind = computed(() => (this.kindParam() === 'income' ? 'income' : 'expense'));
  protected readonly a = computed(() => this.filters.period());
  protected readonly b = computed<Period>(() => {
    const a = this.a();
    if (this.mode() === 'yoy') return samePeriodLastYear(a);
    if (this.mode() === 'custom' && isIsoDate(this.bStartParam()) && isIsoDate(this.bEndParam())) return { start: this.bStartParam()!, end: this.bEndParam()! };
    return previousPeriod(a);
  });

  protected readonly res = reportResource<CompareReport>(
    'reports/compare',
    () => ({ aStart: this.a().start, aEnd: this.a().end, bStart: this.b().start, bEnd: this.b().end, groupBy: this.groupBy(), kind: this.kind() }),
    { global: false },
  );
  protected readonly r = this.res.data;
  protected readonly rows = computed(() => (this.r()?.rows ?? []).filter((x) => x.a !== 0 || x.b !== 0));

  protected readonly groupOptions = computed(() =>
    (['category', 'tag', 'budget', 'account', 'counterparty'] as const).map((g) => ({ value: g, label: this.i18n.t(`compare.groups.${g}`) })),
  );

  protected name(row: CompareRow): string {
    return this.i18n.name(row.name, row.id, this.groupBy() === 'tag' ? 'common.untagged' : this.groupBy() === 'budget' ? 'common.noBudget' : 'common.uncategorized');
  }

  protected readonly divergingOpts = computed(() =>
    divergingOption(this.f, this.rows().map((r) => ({ name: this.name(r), delta: r.delta })), this.kind() === 'expense'),
  );
  protected readonly chartHeight = computed(() => `${Math.max(12, Math.min(this.rows().length, 15) * 1.9 + 2)}rem`);

  protected readonly trendOpts = computed(() => {
    const t = this.r()?.trend;
    return t ? incomeExpenseOption(this.f, this.i18n.t, t.map((m) => ({ ...m, net: m.income - m.expense }))) : null;
  });

  protected readonly table = computed<ChartTable | null>(() =>
    this.rows().length
      ? {
          columns: [this.i18n.t(`compare.groups.${this.groupBy()}`), 'A', 'B', 'Δ', 'Δ%'],
          rows: this.rows().map((r) => [this.name(r), this.f.money(r.a), this.f.money(r.b), this.f.money(r.delta, undefined, { signed: true }), this.f.pct(r.pct, 1, true)]),
          numeric: [1, 2, 3, 4],
        }
      : null,
  );

  protected setB(key: 'bStart' | 'bEnd', value: string): void {
    if (isIsoDate(value)) this.filters.setParams({ [key]: value, ...(key === 'bStart' && !this.bEndParam() ? { bEnd: this.b().end } : {}), ...(key === 'bEnd' && !this.bStartParam() ? { bStart: this.b().start } : {}) });
  }

  /** Chart index is reversed (top item drawn last); table index is direct. */
  protected openRow(index: number, fromTable = false): void {
    const list = fromTable ? this.rows() : this.rows().slice(0, 15).reverse();
    const row = list[index];
    if (!row) return;
    const key = { category: 'category', tag: 'tag', budget: 'budget', account: 'account', counterparty: 'counterparty' }[this.groupBy()];
    this.detail.open(this.name(row), { type: this.kind() === 'expense' ? 'withdrawal' : 'deposit', [key]: row.id ?? 'none' });
  }
}
