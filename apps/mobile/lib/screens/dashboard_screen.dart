import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/resources.dart';
import '../features/accounts/accounts_vm.dart' show BalanceLine;
import '../features/dashboard/dashboard_vm.dart';
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../state/tx_detail.dart';
import '../theme/app_theme.dart';
import '../ui/charts.dart';
import '../ui/common.dart';
import '../ui/kpi_card.dart';
import '../ui/period_bar.dart';
import '../ui/tx_tile.dart';
import '../ui_logic/budget_status.dart';

/// KPIs, income vs expenses, top categories, net worth, budgets, upcoming subscriptions and the largest expenses.
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final vm = ref.watch(dashboardViewModelProvider);
    final f = ref.watch(formatterProvider);
    final data = vm.data;
    final tokens = context.tokens;
    final loading = vm.initialLoading;

    void drill() => context.push('/drill');

    return Scaffold(
      appBar: AppBar(title: Text(t.nav.dashboard), actions: const [PrivacyButton()], bottom: const PeriodBar()),
      body: RefreshIndicator(
        onRefresh: () => refreshAll(ref),
        child: ListView(
          key: const Key('dashboard'),
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
          children: [
            if (vm.report.hasError && data == null) EmptyState(icon: Icons.cloud_off_outlined, title: t.errors.load, onRetry: () => ref.invalidate(dashboardReportProvider)),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
              childAspectRatio: 1.55,
              children: [
                KpiCard(label: t.common.income, f: f, accent: tokens.moneyIncome, value: data?.kpis.income.value, previous: data?.kpis.income.previous, spark: data?.kpis.income.spark, loading: loading),
                KpiCard(label: t.common.expenses, f: f, accent: tokens.moneyExpense, value: data?.kpis.expense.value, previous: data?.kpis.expense.previous, spark: data?.kpis.expense.spark, upIsGood: false, loading: loading),
                KpiCard(label: t.common.net, f: f, accent: tokens.moneyNet, value: data?.kpis.net.value, previous: data?.kpis.net.previous, spark: data?.kpis.net.spark, loading: loading),
                KpiCard(label: t.common.savingsRate, f: f, accent: tokens.moneySavings, value: data?.kpis.savingsRate.value, previous: data?.kpis.savingsRate.previous, spark: data?.kpis.savingsRate.spark, format: KpiFormat.pct, loading: loading),
              ],
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: 112,
              child: KpiCard(label: t.common.netWorth, f: f, accent: tokens.moneyRevenue, value: data?.kpis.netWorth.value, previous: data?.kpis.netWorth.previous, spark: data?.kpis.netWorth.spark, loading: loading),
            ),
            const SizedBox(height: 12),
            SectionCard(
              title: t.dashboard.incomeVsExpense,
              subtitle: t.dashboard.last12,
              child: data == null
                  ? const SizedBox(height: 220)
                  : IncomeExpenseChart(
                      months: [for (final m in data.months) (month: m.month, income: m.income, expense: m.expense, net: m.net)],
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
              title: t.dashboard.topCategories,
              child: vm.slices.isEmpty
                  ? (loading ? const SizedBox(height: 120) : EmptyState(title: t.common.noData))
                  : Column(
                      children: [
                        DonutChart(
                          slices: vm.slices,
                          centerLabel: f.compact(vm.slicesTotal),
                          centerCaption: t.common.expenses,
                          onSlice: (i) {
                            if (vm.openCategory(i)) drill();
                          },
                        ),
                        const SizedBox(height: 8),
                        for (final (i, s) in vm.slices.indexed)
                          InkWell(
                            key: Key('slice-$i'),
                            onTap: () {
                              if (vm.openCategory(i)) drill();
                            },
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              child: Row(
                                children: [
                                  Container(width: 10, height: 10, decoration: BoxDecoration(color: s.color, borderRadius: BorderRadius.circular(3))),
                                  const SizedBox(width: 10),
                                  Expanded(child: Text(s.name, maxLines: 1, overflow: TextOverflow.ellipsis)),
                                  Text(f.money(s.value), style: numStyle(context, size: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
            ),
            const SizedBox(height: 12),
            SectionCard(
              title: t.common.netWorth,
              subtitle: t.dashboard.last12,
              child: vm.netWorth.isEmpty
                  ? SizedBox(height: loading ? 160 : 60, child: loading ? null : EmptyState(title: t.common.noData))
                  : LinesChart(
                      months: [for (final n in vm.netWorth) n.month],
                      lines: [BalanceLine(id: 'nw', name: t.common.netWorth, values: [for (final n in vm.netWorth) n.value], color: tokens.moneyRevenue)],
                      f: f,
                      area: true,
                    ),
            ),
            const SizedBox(height: 12),
            SectionCard(
              title: t.nav.budgets,
              child: (data?.budgets ?? const []).isEmpty
                  ? Padding(padding: const EdgeInsets.symmetric(vertical: 16), child: Center(child: Text(t.budget.none, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant))))
                  : Column(
                      children: [
                        for (final b in data!.budgets)
                          InkWell(
                            onTap: () {
                              ref.read(txDetailProvider.notifier).open(b.name, {'type': 'withdrawal', 'budget': b.id});
                              drill();
                            },
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(child: Text(b.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w500))),
                                      Text('${f.compact(b.spent.value)} / ${f.compact(b.limit.value)}', style: numStyle(context, size: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Meter(model: meterModel(b.pct, hidden: f.hidden)),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
            ),
            const SizedBox(height: 12),
            SectionCard(
              title: t.dashboard.upcomingBills,
              child: (data?.upcomingBills ?? const []).isEmpty
                  ? Padding(padding: const EdgeInsets.symmetric(vertical: 16), child: Center(child: Text(t.dashboard.noUpcoming, textAlign: TextAlign.center, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant))))
                  : Column(
                      children: [
                        for (final b in data!.upcomingBills)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Row(
                              children: [
                                SizedBox(width: 56, child: Text(f.date(b.date), style: numStyle(context, size: 12, color: Theme.of(context).colorScheme.onSurfaceVariant))),
                                Expanded(child: Text(b.name, maxLines: 1, overflow: TextOverflow.ellipsis)),
                                Text(f.money(b.amount), style: numStyle(context, size: 12)),
                              ],
                            ),
                          ),
                      ],
                    ),
            ),
            const SizedBox(height: 12),
            SectionCard(
              title: t.dashboard.largest,
              padding: const EdgeInsets.fromLTRB(12, 16, 12, 8),
              child: (data?.largest ?? const []).isEmpty
                  ? EmptyState(title: loading ? '' : t.common.noData)
                  : Column(
                      children: [
                        for (final tx in data!.largest) TxTile(tx: tx, f: f, onTap: () => context.push('/transactions/${tx.groupId}', extra: tx)),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
