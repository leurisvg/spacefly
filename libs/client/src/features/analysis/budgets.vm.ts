import { computed, inject } from '@angular/core';
import type { BudgetDetail, BudgetsReport } from '@spacefly/shared';
import { reportResource } from '../../api/report-resource';
import { budgetHistoryOption, rankingBarsOption } from '../../charts/builders';
import type { ChartTable } from '../../charts/chart-table';
import { money } from '../../charts/series-colors';
import { FormatService } from '../../format/format.service';
import { I18n } from '../../i18n/i18n';
import { EntityEditor } from '../../state/entity-editor.service';
import { FiltersStore } from '../../state/filters.store';
import { TxDetailService } from '../../state/tx-detail.service';

/** The budget the screen shows: the one picked with `?budget=`, else the first. */
export function selectBudget(budgets: readonly BudgetDetail[], id: string | null): BudgetDetail | null {
  return budgets.find((b) => b.id === id) ?? budgets[0] ?? null;
}

/** Budgets: limits and spending of the period, plus history and category breakdown of the selected budget. */
export function budgetsViewModel() {
  const i18n = inject(I18n);
  const filters = inject(FiltersStore);
  const f = inject(FormatService);
  const detail = inject(TxDetailService);
  const editor = inject(EntityEditor);
  const res = reportResource<BudgetsReport>('reports/budgets');
  const r = res.data;
  const budgetParam = filters.param('budget');

  const totals = computed(() => {
    const b = r()?.budgets ?? [];
    return { limit: b.reduce((s, x) => s + x.limit, 0), spent: b.reduce((s, x) => s + x.spent, 0) };
  });

  const selected = computed(() => selectBudget(r()?.budgets ?? [], budgetParam()));

  const historyOpts = computed(() => {
    const b = selected();
    return b ? budgetHistoryOption(f, { spent: i18n.t('budget.spent'), limit: i18n.t('budget.limit') }, b.history) : null;
  });

  const historyTable = computed<ChartTable | null>(() => {
    const b = selected();
    return b
      ? {
          columns: [i18n.t('common.month'), i18n.t('budget.limit'), i18n.t('budget.spent'), '%'],
          rows: b.history.map((x) => [f.date(x.month, 'month'), f.money(x.limit), f.money(x.spent), x.limit ? f.pct(x.spent / x.limit, 0) : '—']),
          numeric: [1, 2, 3],
        }
      : null;
  });

  const categoryRows = computed(() => (selected()?.categories ?? []).map((c) => ({ id: c.id, name: i18n.name(c.name, c.id), value: c.value })));
  const categoryOpts = computed(() => rankingBarsOption(f, categoryRows(), money.expense()));
  /** How many bars the category chart draws (it caps at 12). */
  const categoryCount = computed(() => Math.min(categoryRows().length, 12));
  const categoryTable = computed<ChartTable | null>(() =>
    categoryRows().length ? { columns: [i18n.t('common.category'), i18n.t('common.amount')], rows: categoryRows().map((c) => [c.name, f.money(c.value)]), numeric: [1] } : null,
  );

  return {
    i18n,
    filters,
    detail,
    editor,
    res,
    r,
    totals,
    selected,
    historyOpts,
    historyTable,
    categoryOpts,
    categoryCount,
    categoryTable,

    select(id: string): void {
      filters.setParams({ budget: id });
    },

    openCategory(index: number): void {
      const b = selected();
      const c = categoryRows().slice(0, 12).reverse()[index];
      if (b && c) detail.open(`${b.name} · ${c.name}`, { type: 'withdrawal', budget: b.id, category: c.id ?? 'none' });
    },

    /** The transactions charged to a budget in the period. */
    openBudget(b: Pick<BudgetDetail, 'id' | 'name'>): void {
      detail.open(b.name, { type: 'withdrawal', budget: b.id });
    },
  };
}
