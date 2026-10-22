import { computed, inject, type Signal } from '@angular/core';
import type { BudgetsReport, GroupBy, RankingReport } from '@spacefly/shared';
import { reportResource } from '../../api/report-resource';
import { linesOption, rankingBarsOption, sunburstOption, treemapOption, type Slice } from '../../charts/builders';
import type { ChartTable } from '../../charts/chart-table';
import { money, SeriesColors } from '../../charts/series-colors';
import { FormatService } from '../../format/format.service';
import { I18n } from '../../i18n/i18n';
import { EntityEditor } from '../../state/entity-editor.service';
import { FiltersStore } from '../../state/filters.store';
import { MetaStore } from '../../state/meta.store';
import { TxDetailService } from '../../state/tx-detail.service';

export type RankingView = 'bars' | 'treemap' | 'sunburst';
export type RankingKind = 'expense' | 'income';
type Item = RankingReport['items'][number];

/** What the screen is told by its route: what to group by, which side, and whether the side can be switched. */
export interface RankingOptions {
  by: Signal<GroupBy>;
  kind: Signal<RankingKind>;
  fixedKind: Signal<boolean>;
}

/** The kind the user chose (`?kind=`) unless the route pins it. */
export function resolveKind(fixed: boolean, route: RankingKind, param: string | null): RankingKind {
  if (fixed) return route;
  return param === 'income' || param === 'expense' ? param : route;
}

/** The view asked for (`?view=`); the budget sunburst only exists for expense categories. */
export function resolveView(param: string | null, by: GroupBy, kind: RankingKind): RankingView {
  if (param === 'sunburst' && by === 'category' && kind === 'expense') return 'sunburst';
  return param === 'treemap' ? 'treemap' : 'bars';
}

/** The drill filter key of each grouping. */
const FILTER_KEY: Record<GroupBy, string> = { category: 'category', tag: 'tag', budget: 'budget', account: 'account', counterparty: 'counterparty' };

/** Categories · Tags · Merchants (expense accounts) · Income sources (revenue accounts): ranking, distribution and trend. */
export function rankingViewModel(opts: RankingOptions) {
  const i18n = inject(I18n);
  const filters = inject(FiltersStore);
  const f = inject(FormatService);
  const colors = inject(SeriesColors);
  const detail = inject(TxDetailService);
  const meta = inject(MetaStore);
  const editor = inject(EntityEditor);
  const { by, kind, fixedKind } = opts;

  const kindParam = filters.param('kind');
  const viewParam = filters.param('view');
  const kindNow = computed(() => resolveKind(fixedKind(), kind(), kindParam()));
  const view = computed(() => resolveView(viewParam(), by(), kindNow()));
  const canSunburst = computed(() => by() === 'category' && kindNow() === 'expense');

  const res = reportResource<RankingReport>('reports/ranking', () => ({ by: by(), kind: kindNow() }));
  const budgets = reportResource<BudgetsReport>('reports/budgets', () => (view() === 'sunburst' ? {} : null));
  const r = res.data;
  const items = computed(() => r()?.items ?? []);
  const count = computed(() => items().reduce((s, i) => s + i.count, 0) || null);
  const avgTicket = computed(() => (count() ? (r()?.total ?? 0) / count()! : null));
  /** A resolved palette color (not `var(--…)`: it is also used where CSS variables do not resolve). */
  const accent = computed(() => (kindNow() === 'income' ? money.income() : money.expense()));

  const colorKind = computed(() => `${by()}:${kindNow()}`);
  const fallbackKey = computed(() => (by() === 'tag' ? 'common.untagged' : by() === 'budget' ? 'common.noBudget' : 'common.uncategorized'));

  const nameOf = (it: { id: string | null; name: string }): string => i18n.name(it.name, it.id, fallbackKey());

  /** Top 7 keep their own slot (stable per entity); the rest share the "other" gray. */
  const colorOf = (it: Item): string => {
    const rank = items().indexOf(it);
    return rank >= 0 && rank < 7 ? colors.color(colorKind(), it.id) : money.other();
  };

  const slices = computed<Slice[]>(() => items().map((it) => ({ id: it.id, name: nameOf(it), value: it.value, color: colorOf(it) })));

  const barsOpts = computed(() => rankingBarsOption(f, slices(), kindNow() === 'income' ? money.income() : money.expense()));
  /** How many bars the chart draws (it caps at 12). */
  const barsCount = computed(() => Math.min(items().length, 12));
  const treemapOpts = computed(() => treemapOption(f, slices().slice(0, 30)));

  const sunburstOpts = computed(() => {
    const b = budgets.data();
    if (!b) return null;
    const budgeted = new Map<string | null, number>();
    const groups: Parameters<typeof sunburstOption>[1] = b.budgets
      .filter((x) => x.spent > 0)
      .map((x) => {
        for (const c of x.categories) budgeted.set(c.id, (budgeted.get(c.id) ?? 0) + c.value);
        return {
          id: x.id,
          name: x.name,
          color: colors.color('budget', x.id),
          children: x.categories.map((c) => ({ id: c.id, name: i18n.name(c.name, c.id), value: c.value })),
        };
      });
    const rest = items()
      .map((it) => ({ id: it.id, name: nameOf(it), value: Math.max(0, it.value - (budgeted.get(it.id) ?? 0)) }))
      .filter((c) => c.value > 0.005);
    if (rest.length) groups.push({ id: null, name: i18n.t('common.noBudget'), color: money.other(), children: rest });
    return sunburstOption(f, groups);
  });

  const trendOpts = computed(() => {
    const report = r();
    if (!report?.trend.length) return null;
    return linesOption(
      f,
      report.months,
      report.trend.slice(0, 6).map((t) => ({ id: t.id, name: nameOf(t), values: t.points.map((p) => p.value), color: colors.color(colorKind(), t.id) })),
      { zeroBased: true },
    );
  });

  const table = computed<ChartTable | null>(() =>
    items().length
      ? {
          columns: [i18n.t('ranking.name'), i18n.t('common.total'), i18n.t('ranking.share'), i18n.t('ranking.count'), i18n.t('ranking.avgTicket')],
          rows: items().map((it) => [nameOf(it), f.money(it.value), f.pct(it.share), String(it.count), f.money(it.avg)]),
          numeric: [1, 2, 3, 4],
        }
      : null,
  );

  /** Categories, tags and merchants / income sources (expense and revenue accounts) can be created and edited from here. */
  const entityKind = computed<'category' | 'tag' | 'account' | null>(() =>
    by() === 'category' ? 'category' : by() === 'tag' ? 'tag' : by() === 'counterparty' ? 'account' : null,
  );

  function open(it: { id: string | null; name: string }): void {
    detail.open(nameOf(it), { type: kindNow() === 'income' ? 'deposit' : 'withdrawal', [FILTER_KEY[by()]]: it.id ?? 'none' });
  }

  return {
    i18n,
    filters,
    detail,
    res,
    r,
    items,
    count,
    avgTicket,
    accent,
    kindNow,
    view,
    canSunburst,
    slices,
    barsOpts,
    barsCount,
    treemapOpts,
    sunburstOpts,
    trendOpts,
    table,
    entityKind,
    nameOf,
    colorOf,

    setKind(next: RankingKind): void {
      filters.setParams({ kind: next });
    },

    setView(next: RankingView): void {
      filters.setParams({ view: next });
    },

    /** Tag rows are identified by their name, so the editor needs the id from the lookups. */
    entityId(it: { id: string | null; name: string }): string | null {
      if (!it.id) return null;
      if (by() === 'tag') return meta.lookups()?.tags.find((t) => t.name === it.id)?.id ?? null;
      return by() === 'category' || by() === 'counterparty' ? it.id : null;
    },

    create(entity: 'category' | 'tag' | 'account'): void {
      editor.open(entity, null, entity === 'account' ? { accountType: kindNow() === 'income' ? 'revenue' : 'expense' } : {});
    },

    edit(id: string): void {
      const entity = entityKind();
      if (entity) editor.open(entity, id);
    },

    open,

    openBar(index: number): void {
      const s = slices().slice(0, 12).reverse()[index];
      if (s) open(s);
    },

    /** Charts that report the clicked element by its name (treemap) rather than by position. */
    openName(name: string): void {
      const it = items().find((i) => nameOf(i) === name);
      if (it) open(it);
    },

    openId(id: string | null): void {
      const it = items().find((i) => i.id === id);
      if (it) open(it);
    },
  };
}
