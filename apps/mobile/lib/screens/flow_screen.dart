import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/reports/flow_vm.dart';
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../theme/app_theme.dart';
import '../ui/charts/sankey.dart';
import '../ui/chart_card.dart';
import '../ui/common.dart';
import '../ui/drill_sheet.dart';
import '../ui/kpi_card.dart';
import '../ui/report_page.dart';

/// Where the money comes from and where it goes: income → budgets / categories / tags → savings, as a Sankey.
class FlowScreen extends ConsumerWidget {
  const FlowScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final vm = ref.watch(flowViewModelProvider);
    final f = ref.watch(formatterProvider);
    final tokens = context.tokens;
    final scheme = Theme.of(context).colorScheme;
    final r = vm.r;

    final nodes = [for (final n in r?.nodes ?? const []) SankeyChartNode(id: n.id, label: vm.label(n), value: n.value, color: sankeyColor(tokens, n.kind))];
    final names = {for (final n in r?.nodes ?? const []) n.id: vm.label(n)};

    return ReportPage(
      title: t.nav.flow,
      listKey: const Key('flow'),
      failed: vm.res.hasError && r == null,
      onRetry: () => ref.invalidate(flowReportProvider),
      children: [
        Text(t.flow.description, style: TextStyle(color: scheme.onSurfaceVariant)),
        const SizedBox(height: 8),
        SegmentedButton<FlowMode>(
          key: const Key('flow-mode'),
          showSelectedIcon: false,
          segments: [ButtonSegment(value: FlowMode.budget, label: Text(t.flow.byBudget)), ButtonSegment(value: FlowMode.tags, label: Text(t.flow.byTags))],
          selected: {vm.mode},
          onSelectionChanged: (v) => vm.setMode(v.first),
        ),
        if (vm.mode == FlowMode.budget) SwitchListTile(key: const Key('flow-budgets'), contentPadding: EdgeInsets.zero, title: Text(t.flow.showBudgets), value: vm.budgets, onChanged: vm.setBudgets),
        SwitchListTile(key: const Key('flow-income-categories'), contentPadding: EdgeInsets.zero, title: Text(t.flow.showIncomeCategories), value: vm.incomeCategories, onChanged: vm.setIncomeCategories),
        Text(t.flow.groupSmall, style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 13)),
        const SizedBox(height: 6),
        Wrap(
          spacing: 8,
          runSpacing: 4,
          children: [
            for (final th in flowThresholds) ChoiceChip(key: Key('threshold-$th'), label: Text(f.pct(th, decimals: 0)), selected: (vm.threshold - th).abs() < 1e-9, onSelected: (_) => vm.setThreshold(th)),
          ],
        ),
        const SizedBox(height: 12),
        KpiGrid(
          children: [
            KpiCard(label: t.common.income, f: f, accent: tokens.moneyIncome, value: r?.totalIncome, loading: vm.initialLoading),
            KpiCard(label: t.common.expenses, f: f, accent: tokens.moneyExpense, value: r?.totalExpense, loading: vm.initialLoading),
          ],
        ),
        const SizedBox(height: 8),
        KpiCard(label: vm.savingsLabel, f: f, accent: tokens.moneySavings, value: r?.savings, loading: vm.initialLoading),
        const SizedBox(height: 12),
        ChartCard(
          title: t.flow.title,
          fileName: 'money-flow',
          table: vm.table,
          subtitle: t.flow.hintTouch,
          padding: const EdgeInsets.fromLTRB(8, 16, 8, 12),
          child: r == null
              ? const SizedBox(height: 320)
              : r.links.isEmpty
                  ? EmptyState(title: t.common.noData)
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SankeyChart(
                          nodes: nodes,
                          links: [for (final l in r.links) SankeyChartLink(l.source, l.target, l.value)],
                          semanticsLabel: t.flow.title,
                          onNode: (id) {
                            if (vm.openNodeById(id)) showDrillSheet(context);
                          },
                        ),
                        const SizedBox(height: 8),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          child: Wrap(
                            spacing: 14,
                            runSpacing: 4,
                            children: [
                              for (final k in vm.legend)
                                Row(mainAxisSize: MainAxisSize.min, children: [
                                  Container(width: 10, height: 10, decoration: BoxDecoration(color: sankeyColor(tokens, k.kind), borderRadius: BorderRadius.circular(2))),
                                  const SizedBox(width: 5),
                                  Text(k.label, style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
                                ]),
                            ],
                          ),
                        ),
                      ],
                    ),
        ),
        if (r != null && r.links.isNotEmpty) ...[
          const SizedBox(height: 12),
          SectionCard(
            title: '${t.flow.from} → ${t.flow.to}',
            child: Column(
              children: [
                for (final (i, l) in r.links.indexed)
                  InkWell(
                    key: Key('flow-link-$i'),
                    onTap: () {
                      if (vm.openNodeById(l.target)) showDrillSheet(context);
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        children: [
                          Expanded(child: Text('${names[l.source]} → ${names[l.target]}', maxLines: 2, overflow: TextOverflow.ellipsis)),
                          const SizedBox(width: 8),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(f.money(l.value), style: numStyle(context, size: 12)),
                              Text(f.pct(r.totalIncome != 0 ? l.value / r.totalIncome : null), style: numStyle(context, size: 11, color: scheme.onSurfaceVariant)),
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
      ],
    );
  }
}
