import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/reports/compare_vm.dart';
import '../format/formatter.dart' show DateStyle;
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../shared/dates.dart' show parseIso, toIso;
import '../theme/app_theme.dart';
import '../ui/charts.dart';
import '../ui/charts/diverging_bars.dart';
import '../ui/common.dart';
import '../ui/drill_sheet.dart';
import '../ui/form_widgets.dart';
import '../ui/report_page.dart';

/// Period A (the global period) against a period B, by category, tag, budget, account or merchant.
class CompareScreen extends ConsumerWidget {
  const CompareScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final vm = ref.watch(compareViewModelProvider);
    final f = ref.watch(formatterProvider);
    final tokens = context.tokens;
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final r = vm.r;
    final rows = vm.rows;

    void drill() => showDrillSheet(context);

    Future<void> pickB() async {
      final picked = await showDateRangePicker(
        context: context,
        firstDate: DateTime(2000),
        lastDate: DateTime(DateTime.now().year + 2, 12, 31),
        initialDateRange: DateTimeRange(start: parseIso(vm.b.start), end: parseIso(vm.b.end)),
        helpText: 'B',
        saveText: t.period.apply,
      );
      if (picked != null) vm.setBRange(toIso(picked.start), toIso(picked.end));
    }

    Future<void> pickGroup() async {
      final v = await showOptionSheet(context, title: t.compare.groupBy, options: [for (final o in vm.groupOptions) PickerOption(o.value, o.label)], selected: vm.groupBy);
      if (v != null && v.isNotEmpty) vm.setGroupBy(v);
    }

    Widget side(String key, ({String start, String end, double income, double expense})? p) => Expanded(
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 22,
                        height: 22,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(color: scheme.outlineVariant, borderRadius: BorderRadius.circular(6)),
                        child: Text(key, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                      ),
                      const SizedBox(width: 8),
                      Expanded(child: Text(p == null ? '' : '${f.date(p.start)} – ${f.date(p.end, DateStyle.long)}', maxLines: 2, overflow: TextOverflow.ellipsis, style: text.bodySmall)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(t.common.income.toUpperCase(), style: text.labelSmall?.copyWith(color: scheme.onSurfaceVariant, letterSpacing: 0.6)),
                  Text(p == null ? '—' : f.money(p.income), style: numStyle(context, size: 16, weight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Text(t.common.expenses.toUpperCase(), style: text.labelSmall?.copyWith(color: scheme.onSurfaceVariant, letterSpacing: 0.6)),
                  Text(p == null ? '—' : f.money(p.expense), style: numStyle(context, size: 16, weight: FontWeight.w600)),
                ],
              ),
            ),
          ),
        );

    Color deltaColor(double delta) => f.hidden || delta == 0 ? scheme.onSurfaceVariant : (isImprovement(delta, vm.kind) ? tokens.moneyNet : tokens.moneyExpense);

    return ReportPage(
      title: t.nav.compare,
      listKey: const Key('compare'),
      failed: vm.res.hasError && r == null,
      onRetry: () => ref.invalidate(compareReportProvider),
      children: [
        Text(t.compare.description, style: TextStyle(color: scheme.onSurfaceVariant)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [
            for (final (m, label) in [(CompareMode.previous, t.compare.previous), (CompareMode.yoy, t.compare.yoy), (CompareMode.custom, t.compare.custom)])
              ChoiceChip(key: Key('mode-${m.name}'), label: Text(label), selected: vm.mode == m, onSelected: (_) => vm.setMode(m)),
          ],
        ),
        if (vm.mode == CompareMode.custom) ...[
          const SizedBox(height: 8),
          TapField(key: const Key('period-b'), label: 'B', value: '${f.date(vm.b.start)} – ${f.date(vm.b.end, DateStyle.long)}', icon: Icons.date_range_outlined, onTap: pickB, trailing: const SizedBox.shrink()),
        ],
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: TapField(key: const Key('group-by'), label: t.compare.groupBy, value: vm.groupLabel(vm.groupBy), onTap: pickGroup)),
            const SizedBox(width: 8),
            SegmentedButton<String>(
              key: const Key('kind'),
              showSelectedIcon: false,
              segments: [ButtonSegment(value: 'expense', label: Text(t.common.expenses)), ButtonSegment(value: 'income', label: Text(t.common.income))],
              selected: {vm.kind},
              onSelectionChanged: (v) => vm.setKind(v.first),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (r != null)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              side('A', (start: r.a.start, end: r.a.end, income: r.a.income, expense: r.a.expense)),
              const SizedBox(width: 8),
              side('B', (start: r.b.start, end: r.b.end, income: r.b.income, expense: r.b.expense)),
            ],
          ),
        const SizedBox(height: 12),
        SectionCard(
          title: t.compare.deltaTitle,
          subtitle: vm.kind == 'expense' ? t.compare.deltaHintExpense : t.compare.deltaHintIncome,
          child: rows.isEmpty
              ? SizedBox(height: vm.initialLoading ? 200 : 60, child: vm.initialLoading ? null : EmptyState(title: t.common.noData))
              : DivergingBars(
                  rows: [
                    for (final row in vm.barRows) DivergingRow(name: vm.name(row), delta: row.delta, label: f.money(row.delta, signed: true), color: row.delta == 0 || isImprovement(row.delta, vm.kind) ? tokens.moneyNet : tokens.moneyExpense),
                  ],
                  onRow: (i) {
                    if (vm.openRow(i)) drill();
                  },
                ),
        ),
        const SizedBox(height: 12),
        SectionCard(
          title: t.compare.trend,
          subtitle: t.dashboard.last12,
          child: r == null
              ? const SizedBox(height: 220)
              : IncomeExpenseChart(
                  months: [for (final m in r.trend) (month: m.month, income: m.income, expense: m.expense, net: m.income - m.expense)],
                  f: f,
                  incomeLabel: t.common.income,
                  expenseLabel: t.common.expenses,
                  netLabel: t.common.net,
                  onMonth: (_) {},
                ),
        ),
        const SizedBox(height: 12),
        SectionCard(
          title: vm.groupLabel(vm.groupBy),
          child: rows.isEmpty
              ? EmptyState(title: vm.initialLoading ? '' : t.common.noData)
              : Column(
                  children: [
                    for (final (i, row) in rows.indexed)
                      InkWell(
                        key: Key('row-$i'),
                        onTap: () {
                          if (vm.openRow(i)) drill();
                        },
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(child: Text(vm.name(row), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w500))),
                                  Text(f.money(row.delta, signed: true), style: numStyle(context, weight: FontWeight.w600, color: deltaColor(row.delta))),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Row(
                                children: [
                                  Expanded(child: Text('A ${f.money(row.a)}  ·  B ${f.money(row.b)}', style: numStyle(context, size: 12, color: scheme.onSurfaceVariant))),
                                  Text(row.pct == null ? t.monthly.kNew : f.pct(row.pct, decimals: 1, signed: true), style: numStyle(context, size: 12, color: scheme.onSurfaceVariant)),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
        ),
      ],
    );
  }
}
