import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/models.g.dart' show Kind;
import '../features/accounts/accounts_vm.dart' show BalanceLine;
import '../features/planning/projection_vm.dart';
import '../format/formatter.dart' show DateStyle;
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../theme/app_theme.dart';
import '../ui/charts.dart';
import '../ui/chart_card.dart';
import '../ui/common.dart';
import '../ui/kpi_card.dart';
import '../ui/report_page.dart';

/// Cash-flow projection: today's balance carried forward with the subscriptions and recurring transactions that are due.
class ProjectionScreen extends ConsumerWidget {
  const ProjectionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final vm = ref.watch(projectionViewModelProvider);
    final f = ref.watch(formatterProvider);
    final tokens = context.tokens;
    final scheme = Theme.of(context).colorScheme;
    final r = vm.r;

    return ReportPage(
      title: t.nav.projection,
      listKey: const Key('projection'),
      periodBar: false,
      failed: vm.res.hasError && r == null,
      onRetry: () => ref.invalidate(projectionReportProvider),
      children: [
        Text(t.projection.description, style: TextStyle(color: scheme.onSurfaceVariant)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [for (final d in projectionDays) ChoiceChip(key: Key('days-$d'), label: Text('$d${t.projection.daysShort}'), selected: vm.days == d, onSelected: (_) => vm.setDays(d))],
        ),
        const SizedBox(height: 12),
        KpiGrid(
          children: [
            KpiCard(label: t.projection.today, f: f, accent: tokens.moneyNet, value: r?.startBalance, loading: vm.initialLoading),
            for (final h in r?.horizons ?? const []) KpiCard(label: t.projection.kIn(n: h.days.toInt()), f: f, accent: tokens.moneyNet, value: h.balance, previous: r!.startBalance),
          ],
        ),
        const SizedBox(height: 12),
        ChartCard(
          title: t.projection.chart,
          fileName: 'cash-flow-projection',
          table: vm.table,
          subtitle: vm.lowestLabel.isEmpty ? null : vm.lowestLabel,
          child: r == null
              ? const SizedBox(height: 240)
              : LinesChart(
                  months: const [],
                  labels: [for (final d in r.days) f.date(d.date, DateStyle.short)],
                  lines: [BalanceLine(id: 'projection', name: t.calendar.balance, values: [for (final d in r.days) d.balance], color: tokens.moneyNet)],
                  f: f,
                  area: true,
                  step: true,
                  zeroLine: true,
                  height: 240,
                  tipTitle: (i) => f.date(r.days[i].date, DateStyle.full),
                  tipDetail: vm.eventsTip,
                ),
        ),
        const SizedBox(height: 12),
        SectionCard(
          title: t.projection.events,
          child: r == null
              ? const SizedBox(height: 80)
              : r.events.isEmpty
                  ? Padding(padding: const EdgeInsets.symmetric(vertical: 16), child: Center(child: Text(t.projection.noEvents, style: TextStyle(color: scheme.onSurfaceVariant))))
                  : Column(
                      children: [
                        for (final (i, e) in r.events.indexed)
                          Padding(
                            key: Key('event-$i'),
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Row(
                              children: [
                                Container(width: 8, height: 8, decoration: BoxDecoration(shape: BoxShape.circle, color: e.kind == Kind.BILL ? tokens.moneyDeficit : scheme.primary)),
                                const SizedBox(width: 10),
                                SizedBox(width: 76, child: Text(f.date(e.date, DateStyle.day), style: numStyle(context, size: 12, color: scheme.onSurfaceVariant))),
                                Expanded(child: Text(e.name, maxLines: 1, overflow: TextOverflow.ellipsis)),
                                Text(f.money(e.amount, signed: true), style: numStyle(context, size: 12, color: f.hidden ? null : (e.amount < 0 ? tokens.moneyExpense : tokens.moneyIncome))),
                              ],
                            ),
                          ),
                      ],
                    ),
        ),
      ],
    );
  }
}
