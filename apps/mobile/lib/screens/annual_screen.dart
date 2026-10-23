import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/reports/annual_vm.dart';
import '../format/formatter.dart' show DateStyle;
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../theme/app_theme.dart';
import '../ui/charts.dart';
import '../ui/charts/heatmap.dart';
import '../ui/chart_card.dart';
import '../ui/common.dart';
import '../ui/drill_sheet.dart';
import '../ui/kpi_card.dart';
import '../ui/report_page.dart';

/// The year month by month: totals, best and worst month, savings rate and the category matrix.
class AnnualScreen extends ConsumerWidget {
  const AnnualScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final vm = ref.watch(annualViewModelProvider);
    final f = ref.watch(formatterProvider);
    final tokens = context.tokens;
    final scheme = Theme.of(context).colorScheme;
    final r = vm.r;
    final loading = vm.initialLoading;

    void drill() => showDrillSheet(context);

    Widget monthTile(String label, ({String month, double net})? m) => StatTile(
          label: label,
          value: m == null ? '—' : f.date(m.month, DateStyle.month),
          caption: m == null ? null : f.money(m.net, signed: true),
        );

    final categories = vm.shownCategories;
    final months = r?.months ?? const <String>[];

    return ReportPage(
      title: t.nav.annual,
      listKey: const Key('annual'),
      failed: vm.res.hasError && r == null,
      onRetry: () => ref.invalidate(annualReportProvider),
      children: [
        Text(t.annual.title(year: vm.year), style: Theme.of(context).textTheme.titleMedium),
        Text(t.annual.description, style: TextStyle(color: scheme.onSurfaceVariant)),
        const SizedBox(height: 8),
        KpiGrid(
          children: [
            KpiCard(label: t.annual.avgIncome, f: f, accent: tokens.moneyIncome, value: r?.averages.income, loading: loading),
            KpiCard(label: t.annual.avgExpense, f: f, accent: tokens.moneyExpense, value: r?.averages.expense, loading: loading),
            monthTile(t.annual.best, r?.best == null ? null : (month: r!.best!.month, net: r.best!.net)),
            monthTile(t.annual.worst, r?.worst == null ? null : (month: r!.worst!.month, net: r.worst!.net)),
          ],
        ),
        const SizedBox(height: 12),
        ChartCard(
          title: t.annual.byMonth,
          fileName: 'annual-by-month',
          table: vm.monthTable,
          child: vm.rows.isEmpty
              ? SizedBox(height: loading ? 220 : 60, child: loading ? null : EmptyState(title: t.common.noData))
              : IncomeExpenseChart(
                  months: [for (final m in vm.rows) (month: m.month, income: m.income, expense: m.expense, net: m.net)],
                  f: f,
                  incomeLabel: t.common.income,
                  expenseLabel: t.common.expenses,
                  netLabel: t.common.net,
                  onMonth: (i) {
                    if (vm.openMonth(i)) drill();
                  },
                ),
        ),
        const SizedBox(height: 12),
        SectionCard(
          title: t.annual.savingsRate,
          child: r == null || r.savingsRate.every((v) => v == null)
              ? SizedBox(height: loading ? 200 : 60, child: loading ? null : EmptyState(title: t.common.noData))
              : SavingsRateChart(months: r.months, rates: r.savingsRate, f: f, label: t.common.savingsRate),
        ),
        const SizedBox(height: 12),
        ChartCard(
          title: t.annual.matrix,
          fileName: 'annual-categories',
          table: vm.matrixTable,
          subtitle: t.annual.matrixHint,
          child: categories.isEmpty
              ? SizedBox(height: loading ? 240 : 60, child: loading ? null : EmptyState(title: t.common.noData))
              : Column(
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // The names stay in place while the months scroll.
                        SizedBox(
                          width: 96,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 18),
                              for (final c in categories) SizedBox(height: 28, child: Align(alignment: Alignment.centerLeft, child: Text(vm.categoryName(c), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11)))),
                            ],
                          ),
                        ),
                        Expanded(
                          child: SingleChildScrollView(
                            key: const Key('matrix-scroll'),
                            scrollDirection: Axis.horizontal,
                            child: HeatmapGrid(
                              key: const Key('matrix'),
                              rows: categories.length,
                              cols: months.length,
                              cells: vm.matrixCells,
                              max: vm.matrixMax,
                              cellWidth: 44,
                              cellHeight: 28,
                              colLabels: [for (final m in months) f.monthLabel(m, withYear: false)],
                              semanticsLabel: t.annual.matrix,
                              cellTip: vm.matrixTip,
                              onCell: (i) {
                                if (vm.openCellAt(i)) drill();
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    HeatLegend(zeroLabel: f.compact(0), maxLabel: f.compact(vm.matrixMax)),
                  ],
                ),
        ),
      ],
    );
  }
}
