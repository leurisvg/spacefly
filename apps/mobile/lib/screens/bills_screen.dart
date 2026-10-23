import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/planning/bills_vm.dart';
import '../format/formatter.dart' show DateStyle;
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../theme/app_theme.dart';
import '../ui/charts/ranking_bars.dart';
import '../ui/chart_card.dart';
import '../ui/common.dart';
import '../ui/drill_sheet.dart';
import '../ui/kpi_card.dart';
import '../ui/report_page.dart';

/// Subscriptions: cost, next dates and payments of each, and what they cost a year.
class BillsScreen extends ConsumerWidget {
  const BillsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final vm = ref.watch(billsViewModelProvider);
    final f = ref.watch(formatterProvider);
    final tokens = context.tokens;
    final scheme = Theme.of(context).colorScheme;
    final r = vm.r;

    Color toneColor(BillTone tone) => switch (tone) {
          BillTone.good => tokens.moneyIncome,
          BillTone.warning => tokens.moneyDeficit,
          BillTone.muted => scheme.onSurfaceVariant,
        };
    IconData toneIcon(BillTone tone) => switch (tone) {
          BillTone.good => Icons.check_circle_outline,
          BillTone.warning => Icons.schedule,
          BillTone.muted => Icons.remove,
        };

    return ReportPage(
      title: t.nav.bills,
      listKey: const Key('bills'),
      actions: [IconButton(key: const Key('bill-new'), tooltip: t.editor.entity.bill.kNew, icon: const Icon(Icons.add), onPressed: () => context.push(vm.createRoute)), const PrivacyButton()],
      failed: vm.res.hasError && r == null,
      onRetry: () => ref.invalidate(billsReportProvider),
      children: [
        Text(t.bills.description, style: TextStyle(color: scheme.onSurfaceVariant)),
        const SizedBox(height: 12),
        KpiGrid(
          children: [
            KpiCard(label: t.bills.monthly, f: f, accent: tokens.moneyExpense, value: r?.monthlyTotal, loading: vm.initialLoading),
            KpiCard(label: t.bills.yearly, f: f, accent: tokens.moneyExpense, value: r?.yearlyTotal, loading: vm.initialLoading),
            StatTile(label: t.bills.paid, value: r == null ? '—' : f.compact(r.paidCount, currency: false), accent: tokens.moneyIncome),
            KpiCard(label: t.bills.pendingAmount(n: r?.pendingCount.toInt() ?? 0), f: f, accent: tokens.moneyDeficit, value: r?.pendingAmount, loading: vm.initialLoading),
          ],
        ),
        const SizedBox(height: 12),
        if (r != null && r.bills.isEmpty) EmptyState(title: t.bills.none),
        if (r != null)
          for (final b in r.bills) ...[
            Opacity(
              opacity: b.active ? 1 : 0.5,
              child: Card(
                key: Key('bill-${b.id}'),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: () {
                    vm.open(b);
                    showDrillSheet(context);
                  },
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 4, 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(b.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
                                  Text('${vm.frequency(b)}${b.skip > 0 ? ' · ${t.bills.skip(n: b.skip.toInt())}' : ''}', style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
                                ],
                              ),
                            ),
                            IconButton(key: Key('bill-edit-${b.id}'), tooltip: '${t.editor.tx.edit}: ${b.name}', icon: const Icon(Icons.edit_outlined, size: 20), onPressed: () => context.push(vm.editRoute(b))),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Padding(
                          padding: const EdgeInsets.only(right: 12),
                          child: Wrap(
                            spacing: 12,
                            runSpacing: 4,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              Row(mainAxisSize: MainAxisSize.min, children: [
                                Icon(toneIcon(billStatusTone(b.status)), size: 16, color: toneColor(billStatusTone(b.status))),
                                const SizedBox(width: 4),
                                Text(vm.statusLabel(b), style: TextStyle(fontSize: 12, color: toneColor(billStatusTone(b.status)))),
                              ]),
                              if (b.outOfRange)
                                Row(mainAxisSize: MainAxisSize.min, children: [
                                  Icon(Icons.warning_amber_rounded, size: 16, color: tokens.moneyDeficit),
                                  const SizedBox(width: 4),
                                  Text(t.bills.outOfRange, style: TextStyle(fontSize: 12, color: tokens.moneyDeficit)),
                                ]),
                              Text('${t.bills.next}: ${b.nextDate == null ? '—' : f.date(b.nextDate!, DateStyle.day)}', style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Padding(
                          padding: const EdgeInsets.only(right: 12),
                          child: Row(
                            children: [
                              Expanded(child: _Stat(t.bills.range, '${f.money(b.amountMin)} – ${f.money(b.amountMax)}')),
                              Expanded(child: _Stat(t.bills.monthlyEq, f.money(b.monthlyEquivalent))),
                            ],
                          ),
                        ),
                        if (b.paidInPeriod.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 8, right: 12),
                            child: Text('${t.bills.paidThisPeriod}: ${b.paidInPeriod.map((p) => '${f.date(p.date)} · ${f.money(p.amount)}').join('  ·  ')}', style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
          ],
        if (r != null && r.bills.isNotEmpty) ...[
          const SizedBox(height: 4),
          ChartCard(
            title: t.bills.costRanking,
            fileName: 'subscriptions',
            table: vm.table,
            subtitle: t.bills.costRankingHint,
            child: vm.ranked.isEmpty
                ? EmptyState(title: t.common.noData)
                : RankingBars(
                    rows: [for (final b in vm.ranked) RankBar(name: b.name, value: b.yearlyEquivalent, label: f.compact(b.yearlyEquivalent))],
                    color: tokens.moneyExpense,
                    onRow: (i) {
                      if (vm.openBar(i)) showDrillSheet(context);
                    },
                  ),
          ),
        ],
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
        FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: Text(value, style: numStyle(context, size: 13))),
      ],
    );
  }
}
