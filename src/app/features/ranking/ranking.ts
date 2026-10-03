import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { BudgetsReport, GroupBy, RankingReport } from '@shared';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { reportResource } from '../../core/api/report-resource';
import { FormatService } from '../../core/format/format.service';
import { FORMAT_PIPES } from '../../core/format/pipes';
import { I18n } from '../../core/i18n/i18n';
import { FiltersStore } from '../../core/state/filters.store';
import { linesOption, rankingBarsOption, sunburstOption, treemapOption, type Slice } from '../../shared/charts/builders';
import { Chart } from '../../shared/charts/chart';
import { ChartCard, type ChartTable } from '../../shared/charts/chart-card';
import { money, SeriesColors } from '../../shared/charts/series-colors';
import { Delta } from '../../shared/components/delta';
import { EmptyState } from '../../shared/components/empty-state';
import { KpiCard } from '../../shared/components/kpi-card';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';
import { TxDetailService } from '../../shared/components/tx-detail.service';

type View = 'bars' | 'treemap' | 'sunburst';
type Item = RankingReport['items'][number];

/** Categories · Tags · Merchants (expense accounts) · Income sources (revenue accounts). */
@Component({
  selector: 'sf-ranking',
  imports: [TranslocoPipe, HlmToggleGroupImports, Chart, ChartCard, Delta, EmptyState, KpiCard, Money, PageHeader, ...FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="i18n.t('nav.' + key())" [description]="i18n.t('ranking.descriptions.' + key())">
      @if (!fixedKind()) {
        <hlm-toggle-group type="single" variant="outline" size="sm" [value]="kindNow()" [nullable]="false" (valueChange)="$event && filters.setParams({ kind: $any($event) })">
          <button hlmToggleGroupItem value="expense">{{ 'common.expenses' | transloco }}</button>
          <button hlmToggleGroupItem value="income">{{ 'common.income' | transloco }}</button>
        </hlm-toggle-group>
      }
    </sf-page-header>

    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <sf-kpi [label]="i18n.t('common.total')" [value]="r()?.total ?? null" [accent]="accent()" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('ranking.items')" format="compact" [value]="r()?.items?.length ?? null" [accent]="accent()" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('ranking.transactions')" format="compact" [value]="count()" [accent]="accent()" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('ranking.avgTicket')" [value]="avgTicket()" [accent]="accent()" [loading]="res.initialLoading()" />
    </section>

    <section class="grid gap-4 xl:grid-cols-2">
      <sf-chart-card [title]="i18n.t('ranking.distribution')" [table]="table()" [loading]="res.loading()" [initialLoading]="res.initialLoading()" [fileName]="key() + '-distribution'">
        <hlm-toggle-group card-actions type="single" variant="outline" size="sm" [value]="view()" [nullable]="false" (valueChange)="$event && filters.setParams({ view: $any($event) })">
          <button hlmToggleGroupItem value="bars" class="text-xs">{{ 'ranking.views.bars' | transloco }}</button>
          <button hlmToggleGroupItem value="treemap" class="text-xs">{{ 'ranking.views.treemap' | transloco }}</button>
          @if (by() === 'category' && kindNow() === 'expense') {
            <button hlmToggleGroupItem value="sunburst" class="text-xs">{{ 'ranking.views.sunburst' | transloco }}</button>
          }
        </hlm-toggle-group>
        @if (items().length) {
          @switch (view()) {
            @case ('treemap') {
              <sf-chart [options]="treemapOpts()" height="24rem" (chartClick)="openId($any($event.data).id)" />
            }
            @case ('sunburst') {
              @if (sunburstOpts(); as o) {
                <sf-chart [options]="o" height="24rem" />
              }
            }
            @default {
              <sf-chart [options]="barsOpts()" [height]="barsHeight()" (chartClick)="openBar($event.dataIndex)" />
            }
          }
        } @else if (!res.initialLoading()) {
          <sf-empty [title]="i18n.t('common.noData')" />
        }
      </sf-chart-card>
      <sf-chart-card [title]="i18n.t('ranking.trend')" [subtitle]="i18n.t('ranking.trendHint')" [loading]="res.loading()" [initialLoading]="res.initialLoading()" [fileName]="key() + '-trend'">
        @if (trendOpts(); as o) {
          <sf-chart [options]="o" height="24rem" />
        }
      </sf-chart-card>
    </section>

    <section class="overflow-x-auto rounded-xl border border-border bg-card p-4">
      <table class="w-full min-w-[42rem] text-sm">
        <thead>
          <tr class="border-b border-border">
            <th class="eyebrow py-2 text-left">{{ 'ranking.name' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'common.total' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'ranking.share' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'ranking.count' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'ranking.avgTicket' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'ranking.previous' | transloco }}</th>
          </tr>
        </thead>
        <tbody>
          @for (it of items(); track it.id) {
            <tr class="cursor-pointer border-b border-border/60 hover:bg-muted/40" (click)="open(it)">
              <td class="py-2">
                <span class="inline-flex items-center gap-2">
                  <span class="size-2.5 shrink-0 rounded-sm" [style.background]="colorOf(it)"></span>
                  {{ nameOf(it) }}
                </span>
              </td>
              <td class="py-2 text-right"><sf-money [value]="it.value" /></td>
              <td class="py-2 text-right num text-xs">{{ it.share | pct: 1 }}</td>
              <td class="py-2 text-right num text-xs">{{ it.count }}</td>
              <td class="py-2 text-right"><sf-money class="text-xs" [value]="it.avg" /></td>
              <td class="py-2 text-right">
                <span class="inline-flex items-center gap-2">
                  <sf-money class="text-xs text-muted-foreground" [value]="it.previous" />
                  <sf-delta [value]="it.value" [previous]="it.previous || null" [upIsGood]="kindNow() === 'income'" />
                </span>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </section>
  `,
})
export class Ranking {
  protected readonly i18n = inject(I18n);
  protected readonly filters = inject(FiltersStore);
  private readonly f = inject(FormatService);
  private readonly colors = inject(SeriesColors);
  private readonly detail = inject(TxDetailService);

  // Route data (withComponentInputBinding)
  readonly by = input<GroupBy>('category');
  readonly kind = input<'expense' | 'income'>('expense');
  readonly key = input('categories');
  readonly fixedKind = input(false);

  private readonly kindParam = this.filters.param('kind');
  private readonly viewParam = this.filters.param('view');
  protected readonly kindNow = computed(() => (this.fixedKind() ? this.kind() : this.kindParam() === 'income' ? 'income' : this.kindParam() === 'expense' ? 'expense' : this.kind()));
  protected readonly view = computed<View>(() => {
    const v = this.viewParam() as View;
    if (v === 'sunburst' && !(this.by() === 'category' && this.kindNow() === 'expense')) return 'bars';
    return v === 'treemap' || v === 'sunburst' ? v : 'bars';
  });

  protected readonly res = reportResource<RankingReport>('reports/ranking', () => ({ by: this.by(), kind: this.kindNow() }));
  protected readonly budgets = reportResource<BudgetsReport>('reports/budgets', () => (this.view() === 'sunburst' ? {} : null));
  protected readonly r = this.res.data;
  protected readonly items = computed(() => this.r()?.items ?? []);
  protected readonly count = computed(() => this.items().reduce((s, i) => s + i.count, 0) || null);
  protected readonly avgTicket = computed(() => (this.count() ? (this.r()?.total ?? 0) / this.count()! : null));
  protected readonly accent = computed(() => (this.kindNow() === 'income' ? 'var(--money-income)' : 'var(--money-expense)'));

  private readonly colorKind = computed(() => `${this.by()}:${this.kindNow()}`);
  private readonly fallbackKey = computed(() => (this.by() === 'tag' ? 'common.untagged' : this.by() === 'budget' ? 'common.noBudget' : 'common.uncategorized'));

  protected nameOf(it: { id: string | null; name: string }): string {
    return this.i18n.name(it.name, it.id, this.fallbackKey());
  }

  /** Top 7 keep their own slot (stable per entity); the rest share the "other" gray. */
  protected colorOf(it: Item): string {
    const rank = this.items().indexOf(it);
    return rank >= 0 && rank < 7 ? this.colors.color(this.colorKind(), it.id) : money.other();
  }

  private readonly slices = computed<Slice[]>(() => this.items().map((it) => ({ id: it.id, name: this.nameOf(it), value: it.value, color: this.colorOf(it) })));

  protected readonly barsOpts = computed(() => rankingBarsOption(this.f, this.slices(), this.kindNow() === 'income' ? money.income() : money.expense()));
  protected readonly barsHeight = computed(() => `${Math.max(10, Math.min(this.items().length, 12) * 2 + 2)}rem`);
  protected readonly treemapOpts = computed(() => treemapOption(this.f, this.slices().slice(0, 30)));

  protected readonly sunburstOpts = computed(() => {
    const b = this.budgets.data();
    if (!b) return null;
    const budgeted = new Map<string | null, number>();
    const groups: Parameters<typeof sunburstOption>[1] = b.budgets
      .filter((x) => x.spent > 0)
      .map((x) => {
        for (const c of x.categories) budgeted.set(c.id, (budgeted.get(c.id) ?? 0) + c.value);
        return {
          id: x.id,
          name: x.name,
          color: this.colors.color('budget', x.id),
          children: x.categories.map((c) => ({ id: c.id, name: this.i18n.name(c.name, c.id), value: c.value })),
        };
      });
    const rest = this.items()
      .map((it) => ({ id: it.id, name: this.nameOf(it), value: Math.max(0, it.value - (budgeted.get(it.id) ?? 0)) }))
      .filter((c) => c.value > 0.005);
    if (rest.length) groups.push({ id: null, name: this.i18n.t('common.noBudget'), color: money.other(), children: rest });
    return sunburstOption(this.f, groups);
  });

  protected readonly trendOpts = computed(() => {
    const r = this.r();
    if (!r?.trend.length) return null;
    return linesOption(
      this.f,
      r.months,
      r.trend.slice(0, 6).map((t) => ({ id: t.id, name: this.nameOf(t), values: t.points.map((p) => p.value), color: this.colors.color(this.colorKind(), t.id) })),
      { zeroBased: true },
    );
  });

  protected readonly table = computed<ChartTable | null>(() =>
    this.items().length
      ? {
          columns: [this.i18n.t('ranking.name'), this.i18n.t('common.total'), this.i18n.t('ranking.share'), this.i18n.t('ranking.count'), this.i18n.t('ranking.avgTicket')],
          rows: this.items().map((it) => [this.nameOf(it), this.f.money(it.value), this.f.pct(it.share), String(it.count), this.f.money(it.avg)]),
          numeric: [1, 2, 3, 4],
        }
      : null,
  );

  protected open(it: { id: string | null; name: string }): void {
    const key = { category: 'category', tag: 'tag', budget: 'budget', account: 'account', counterparty: 'counterparty' }[this.by()];
    this.detail.open(this.nameOf(it), { type: this.kindNow() === 'income' ? 'deposit' : 'withdrawal', [key]: it.id ?? 'none' });
  }

  protected openBar(index: number): void {
    const shown = this.slices().slice(0, 12).reverse();
    const s = shown[index];
    if (s) this.open(s);
  }

  protected openId(id: string | null): void {
    const it = this.items().find((i) => i.id === id);
    if (it) this.open(it);
  }
}
