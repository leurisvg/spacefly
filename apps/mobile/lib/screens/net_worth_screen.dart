import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/accounts/accounts_vm.dart' show BalanceLine;
import '../features/accounts/net_worth_vm.dart';
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../theme/app_theme.dart';
import '../ui/charts.dart';
import '../ui/chart_card.dart';
import '../ui/common.dart';
import '../ui/kpi_card.dart';
import '../ui/months_picker.dart';
import '../ui/report_page.dart';

/// Net worth over time: the total, and the positive balances it is made of.
class NetWorthScreen extends ConsumerWidget {
  const NetWorthScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final vm = ref.watch(netWorthViewModelProvider);
    final f = ref.watch(formatterProvider);
    final tokens = context.tokens;
    final scheme = Theme.of(context).colorScheme;
    final r = vm.r;
    final stack = vm.stackLines;

    return ReportPage(
      title: t.nav.netWorth,
      listKey: const Key('net-worth'),
      periodBar: false,
      failed: vm.res.hasError && r == null,
      onRetry: () => ref.invalidate(netWorthReportProvider),
      children: [
        Text(t.netWorth.description, style: TextStyle(color: scheme.onSurfaceVariant)),
        const SizedBox(height: 8),
        Align(alignment: Alignment.centerLeft, child: MonthsPicker(value: vm.months, onChanged: vm.setMonths)),
        const SizedBox(height: 12),
        KpiGrid(
          children: [
            KpiCard(label: t.netWorth.current, f: f, accent: tokens.moneyRevenue, value: r?.current, previous: vm.first, spark: r?.total, loading: vm.initialLoading),
            KpiCard(label: t.netWorth.change(n: r?.months.length ?? int.tryParse(vm.months) ?? 0), f: f, accent: tokens.moneyNet, value: r?.change.abs, loading: vm.initialLoading),
          ],
        ),
        const SizedBox(height: 12),
        ChartCard(
          title: t.netWorth.total,
          fileName: 'net-worth',
          table: vm.table,
          child: r == null
              ? const SizedBox(height: 220)
              : LinesChart(months: r.months, lines: [BalanceLine(id: 'nw', name: t.common.netWorth, values: r.total, color: tokens.moneyRevenue)], f: f, area: true),
        ),
        const SizedBox(height: 12),
        SectionCard(
          title: t.netWorth.byAccount,
          subtitle: t.netWorth.stackedHint,
          child: r == null
              ? const SizedBox(height: 240)
              : stack.isEmpty
                  ? EmptyState(title: t.common.noData)
                  : Column(
                      children: [
                        StackedAreaChart(months: r.months, lines: stack, f: f),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 14,
                          runSpacing: 4,
                          children: [
                            for (final l in stack)
                              Row(mainAxisSize: MainAxisSize.min, children: [
                                Container(width: 10, height: 10, decoration: BoxDecoration(color: l.color, borderRadius: BorderRadius.circular(3))),
                                const SizedBox(width: 6),
                                Text(l.name, style: Theme.of(context).textTheme.bodySmall),
                              ]),
                          ],
                        ),
                      ],
                    ),
        ),
      ],
    );
  }
}
