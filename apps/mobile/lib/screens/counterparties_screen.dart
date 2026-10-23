import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/models.g.dart' show CounterpartyKind;
import '../features/accounts/counterparties_vm.dart';
import '../format/formatter.dart' show DateStyle, Formatter;
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../theme/app_theme.dart';
import '../ui/charts.dart';
import '../ui/charts/ranking_bars.dart';
import '../ui/chart_card.dart';
import '../ui/common.dart';
import '../ui/kpi_card.dart';
import '../ui/report_page.dart';
import '../ui_logic/delta.dart';

/// Expense accounts (where money goes) or revenue accounts (where it comes from): ranking, monthly trend and the list of them.
class CounterpartiesScreen extends ConsumerWidget {
  const CounterpartiesScreen({super.key, required this.kind});

  final CounterpartyKind kind;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final vm = ref.watch(counterpartiesViewModelProvider(kind));
    final f = ref.watch(formatterProvider);
    final tokens = context.tokens;
    final scheme = Theme.of(context).colorScheme;
    final r = vm.r;
    final accent = vm.income ? tokens.moneyIncome : tokens.moneyExpense;
    final top = vm.top;

    return ReportPage(
      title: vm.income ? t.nav.revenueAccounts : t.nav.expenseAccounts,
      listKey: Key('counterparties-${vm.income ? 'income' : 'expense'}'),
      actions: [
        IconButton(key: const Key('counterparty-new'), tooltip: t.editor.entity.account.kNew, icon: const Icon(Icons.add), onPressed: () => context.push(vm.createRoute)),
        const PrivacyButton()
      ],
      failed: vm.res.hasError && r == null,
      onRetry: () => ref.invalidate(counterpartiesReportProvider(kind)),
      children: [
        Text(vm.income ? t.accounts.counterparty.descriptions.income : t.accounts.counterparty.descriptions.expense, style: TextStyle(color: scheme.onSurfaceVariant)),
        SwitchListTile(key: const Key('show-empty'), contentPadding: EdgeInsets.zero, title: Text(t.accounts.counterparty.showEmpty), value: vm.showEmpty, onChanged: vm.setShowEmpty),
        KpiGrid(
          children: [
            KpiCard(label: t.common.total, f: f, accent: accent, value: r?.total, previous: r?.previousTotal, upIsGood: vm.income, loading: vm.initialLoading),
            StatTile(label: t.accounts.counterparty.activeAccounts, value: vm.active == null ? '—' : '${vm.active}', accent: accent),
            StatTile(label: t.ranking.transactions, value: r == null ? '—' : f.compact(r.count, currency: false), accent: accent),
            StatTile(label: t.ranking.avgTicket, value: vm.avgTicket == null ? '—' : f.money(vm.avgTicket), accent: accent),
          ],
        ),
        const SizedBox(height: 12),
        ChartCard(
          title: t.accounts.counterparty.topAccounts,
          fileName: 'accounts-${vm.income ? 'income' : 'expense'}',
          table: vm.rankTable,
          child: top.isEmpty
              ? (vm.initialLoading ? const SizedBox(height: 200) : EmptyState(title: t.common.noData))
              : RankingBars(
                  rows: [for (final i in top) RankBar(name: i.name, value: i.value, label: f.compact(i.value))],
                  color: accent,
                  onRow: (i) => context.push(vm.path(top[i].id)),
                ),
        ),
        const SizedBox(height: 12),
        ChartCard(
          title: t.accounts.counterparty.monthly,
          fileName: 'accounts-${vm.income ? 'income' : 'expense'}-monthly',
          table: vm.monthlyTable,
          child: r == null
              ? const SizedBox(height: 200)
              : CategoryBarsChart(
                  labels: [for (final m in r.months) f.monthLabel(m, withYear: false)], values: r.monthly, color: accent, f: f, seriesName: vm.income ? t.common.income : t.common.expenses),
        ),
        const SizedBox(height: 12),
        SectionCard(
          title: vm.income ? t.nav.revenueAccounts : t.nav.expenseAccounts,
          child: vm.shown.isEmpty
              ? EmptyState(title: vm.initialLoading ? '' : t.common.noData)
              : Column(
                  children: [
                    for (final (n, it) in vm.shown.indexed)
                      Opacity(
                        opacity: it.count > 0 ? 1 : 0.6,
                        child: InkWell(
                          key: Key('counterparty-row-$n'),
                          onTap: () => context.push(vm.path(it.id)),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(child: Text(it.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w500))),
                                    Text(f.money(it.value), style: numStyle(context, weight: FontWeight.w600)),
                                    IconButton(
                                        key: Key('counterparty-edit-$n'),
                                        visualDensity: VisualDensity.compact,
                                        tooltip: '${t.editor.tx.edit}: ${it.name}',
                                        icon: const Icon(Icons.edit_outlined, size: 18),
                                        onPressed: () => context.push(vm.editRoute(it.id))),
                                  ],
                                ),
                                Wrap(
                                  spacing: 12,
                                  runSpacing: 2,
                                  children: [
                                    Text('${f.pct(it.share, decimals: 1)} · ${it.count.toInt()} ${t.ranking.transactions.toLowerCase()}',
                                        style: numStyle(context, size: 11, color: scheme.onSurfaceVariant)),
                                    Text('${t.ranking.avgTicket} ${f.money(it.avg)}', style: numStyle(context, size: 11, color: scheme.onSurfaceVariant)),
                                    if (it.value > 0 && it.previous > 0)
                                      _Change(value: it.value, previous: it.previous, upIsGood: vm.income, label: '${t.ranking.previous} ${f.compact(it.previous)}', f: f),
                                    Text(it.lastDate == null ? t.accounts.counterparty.never : '${t.accounts.counterparty.lastActivity} ${f.date(it.lastDate!, DateStyle.short)}',
                                        style: numStyle(context, size: 11, color: scheme.onSurfaceVariant)),
                                  ],
                                ),
                              ],
                            ),
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

class _Change extends StatelessWidget {
  const _Change({required this.value, required this.previous, required this.upIsGood, required this.label, required this.f});

  final double value;
  final double previous;
  final bool upIsGood;
  final String label;
  final Formatter f;

  @override
  Widget build(BuildContext context) {
    final delta = deltaModel(value, previous, upIsGood: upIsGood, hidden: f.hidden);
    return Text('$label · ${f.pct(delta.ratio)}', style: numStyle(context, size: 11, color: toneColor(context, delta.tone)));
  }
}
