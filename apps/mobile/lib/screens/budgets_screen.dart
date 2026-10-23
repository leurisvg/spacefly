import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/analysis/budgets_vm.dart';
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../theme/app_theme.dart';
import '../ui/charts.dart';
import '../ui/charts/ranking_bars.dart';
import '../ui/common.dart';
import '../ui/drill_sheet.dart';
import '../ui/kpi_card.dart';
import '../ui/report_page.dart';
import '../ui_logic/budget_status.dart';

/// Budgets: limit and spending of each, spending pace, and the history and categories of the selected one.
class BudgetsScreen extends ConsumerWidget {
  const BudgetsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final vm = ref.watch(budgetsViewModelProvider);
    final f = ref.watch(formatterProvider);
    final tokens = context.tokens;
    final scheme = Theme.of(context).colorScheme;
    final r = vm.r;
    final selected = vm.selected;
    final loading = vm.initialLoading;

    void drill() => showDrillSheet(context);

    Widget stat(String label, String value, {Color? color}) => Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
              FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: Text(value, style: numStyle(context, size: 13, color: color))),
            ],
          ),
        );

    return ReportPage(
      title: t.nav.budgets,
      listKey: const Key('budgets'),
      actions: [IconButton(key: const Key('budget-new'), tooltip: t.editor.entity.budget.kNew, icon: const Icon(Icons.add), onPressed: () => context.push('/edit/budget')), const PrivacyButton()],
      failed: vm.res.hasError && r == null,
      onRetry: () => ref.invalidate(budgetsReportProvider),
      children: [
        Text(t.budget.description, style: TextStyle(color: scheme.onSurfaceVariant)),
        const SizedBox(height: 12),
        KpiGrid(
          children: [
            KpiCard(label: t.budget.totalLimit, f: f, accent: tokens.moneyBudget, value: r == null ? null : vm.totals.limit, loading: loading),
            KpiCard(label: t.budget.spentInBudgets, f: f, accent: tokens.moneyExpense, value: r == null ? null : (r.available?.spentInBudgets ?? vm.totals.spent), loading: loading),
            KpiCard(label: t.budget.unbudgeted, f: f, accent: tokens.moneyOther, value: r?.unbudgeted, loading: loading),
            KpiCard(label: t.budget.available, f: f, accent: tokens.moneyIncome, value: r?.available?.amount, loading: loading),
          ],
        ),
        const SizedBox(height: 12),
        if (r != null && r.budgets.isEmpty) EmptyState(title: t.budget.none),
        if (r != null)
          for (final b in r.budgets) ...[
            Card(
              key: Key('budget-${b.id}'),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: selected?.id == b.id ? scheme.primary : scheme.outlineVariant, width: selected?.id == b.id ? 1.5 : 1)),
              clipBehavior: Clip.antiAlias,
              child: InkWell(
                onTap: () => vm.select(b.id),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 4, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(child: Text(b.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600))),
                          if (b.autoBudget.type != null) Padding(padding: const EdgeInsets.only(right: 4), child: Chip(label: Text(_autoLabel(t, b.autoBudget.type!)), visualDensity: VisualDensity.compact, labelStyle: const TextStyle(fontSize: 10))),
                          IconButton(key: Key('budget-edit-${b.id}'), tooltip: '${t.editor.tx.edit}: ${b.name}', icon: const Icon(Icons.edit_outlined, size: 20), onPressed: () => context.push('/edit/budget/${b.id}')),
                          IconButton(key: Key('budget-open-${b.id}'), tooltip: t.nav.sections.transactions, icon: const Icon(Icons.receipt_long_outlined, size: 20), onPressed: () {
                            vm.openBudget(b);
                            drill();
                          }),
                        ],
                      ),
                      Padding(
                        padding: const EdgeInsets.only(right: 12),
                        child: Meter(model: meterModel(b.pct, hidden: f.hidden), marker: r.elapsedRatio > 0 && r.elapsedRatio < 1 ? r.elapsedRatio : null),
                      ),
                      const SizedBox(height: 10),
                      Padding(
                        padding: const EdgeInsets.only(right: 12),
                        child: Row(children: [
                          stat(t.budget.limit, f.money(b.limit)),
                          stat(t.budget.spent, f.money(b.spent)),
                          stat(t.budget.remaining, f.money(b.remaining), color: f.hidden ? null : (b.remaining < 0 ? tokens.moneyExpense : null)),
                        ]),
                      ),
                      if (b.projected != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 8, right: 12),
                          child: Text(
                            '${t.budget.projection} ${f.money(b.projected!)}${b.limit > 0 && b.projected! > b.limit ? ' · ${t.budget.overBy(amount: f.money(b.projected! - b.limit))}' : ''}',
                            style: TextStyle(fontSize: 12, color: b.limit > 0 && b.projected! > b.limit && !f.hidden ? tokens.moneyExpense : scheme.onSurfaceVariant),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
          ],
        if (selected != null) ...[
          const SizedBox(height: 4),
          SectionCard(
            title: t.budget.history(name: selected.name),
            child: Column(
              children: [
                BudgetHistoryChart(history: vm.history, f: f, spentLabel: t.budget.spent, limitLabel: t.budget.limit),
                const SizedBox(height: 8),
                Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                  Container(width: 10, height: 10, decoration: BoxDecoration(color: tokens.moneyBudget, borderRadius: BorderRadius.circular(2))),
                  const SizedBox(width: 5),
                  Text(t.budget.spent, style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
                  const SizedBox(width: 14),
                  Container(width: 10, height: 10, decoration: BoxDecoration(color: tokens.chartInk2.withValues(alpha: 0.25), borderRadius: BorderRadius.circular(2))),
                  const SizedBox(width: 5),
                  Text(t.budget.limit, style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
                ]),
              ],
            ),
          ),
          const SizedBox(height: 12),
          SectionCard(
            title: t.budget.byCategory(name: selected.name),
            child: vm.categoryBars.isEmpty
                ? EmptyState(title: t.common.noData)
                : RankingBars(
                    rows: [for (final c in vm.categoryBars) RankBar(name: c.name, value: c.value, label: f.compact(c.value))],
                    color: tokens.moneyExpense,
                    onRow: (i) {
                      if (vm.openCategory(i)) drill();
                    },
                  ),
          ),
        ],
      ],
    );
  }
}

String _autoLabel(Translations t, String type) => switch (type) {
      'reset' => t.budget.auto.reset,
      'rollover' => t.budget.auto.rollover,
      _ => t.budget.auto.adjusted,
    };
