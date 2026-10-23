import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/models.g.dart' hide Period, PeriodPreset, Ref;
import '../features/reports/monthly_vm.dart';
import '../format/formatter.dart';
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../shared/dates.dart' show todayIso;
import '../state/filters_store.dart';
import '../theme/app_theme.dart';
import '../ui/calendar_grid.dart';
import '../ui/common.dart';
import '../ui/drill_sheet.dart';
import '../ui/kpi_card.dart';
import '../ui/report_page.dart';
import '../ui/savings_multiples.dart';
import '../ui/tx_tile.dart';
import '../ui_logic/budget_status.dart';
import '../ui_logic/names.dart';
import '../ui_logic/series_colors.dart';

/// The color of a signed figure: income green, expense red, plain in privacy mode.
Color? signColor(BuildContext context, Formatter f, double value) {
  if (f.hidden || value == 0) return null;
  final tokens = context.tokens;
  return value > 0 ? tokens.moneyIncome : tokens.moneyExpense;
}

/// The email report, interactive: the same sections in the same order, for any period.
class MonthlyScreen extends ConsumerWidget {
  const MonthlyScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final vm = ref.watch(monthlyViewModelProvider);
    final f = ref.watch(formatterProvider);
    final tokens = context.tokens;
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final d = vm.d;
    final loading = vm.initialLoading;
    final muted = text.bodySmall?.copyWith(color: scheme.onSurfaceVariant);
    final today = todayIso(ref.read(clockProvider)());

    void drill() => showDrillSheet(context);
    Widget empty(String message) => Padding(padding: const EdgeInsets.symmetric(vertical: 16), child: Center(child: Text(message, textAlign: TextAlign.center, style: TextStyle(color: scheme.onSurfaceVariant))));

    Widget categories(MonthlyReport d) => Column(
          children: [
            Row(
              children: [
                Expanded(child: Text(t.common.category.toUpperCase(), style: text.labelSmall?.copyWith(color: scheme.onSurfaceVariant, letterSpacing: 0.6))),
                Text(t.monthly.vsPrevious(month: f.date(d.previousPeriod.start, DateStyle.month)).toUpperCase(), style: text.labelSmall?.copyWith(color: scheme.onSurfaceVariant, letterSpacing: 0.6)),
              ],
            ),
            const Divider(),
            for (final c in d.categories)
              Builder(builder: (context) {
                final ch = vm.change(c);
                return InkWell(
                  key: Key('category-${c.id ?? 'none'}'),
                  onTap: () {
                    vm.openCategory(c);
                    drill();
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          flex: 5,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(entityName(t, c.name, c.id), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w500)),
                              const SizedBox(height: 4),
                              FractionallySizedBox(
                                widthFactor: (vm.relative(c) / 100).clamp(0.0, 1.0),
                                alignment: Alignment.centerLeft,
                                child: Container(height: 3, decoration: BoxDecoration(color: scheme.primary.withValues(alpha: 0.35), borderRadius: BorderRadius.circular(2))),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          flex: 4,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(f.money(c.total.value, signed: true), style: numStyle(context, weight: FontWeight.w600, color: signColor(context, f, c.total.value))),
                              if (ch.isNew)
                                Text(t.monthly.kNew, style: TextStyle(fontSize: 12, color: f.hidden ? scheme.onSurfaceVariant : tokens.moneyIncome))
                              else ...[
                                Text(f.money(c.previous), style: numStyle(context, size: 12, color: scheme.onSurfaceVariant)),
                                Text(
                                  '${f.money(ch.delta, signed: true)} ${f.hidden ? '' : (ch.up ? '↑' : '↓')}${f.pct(ch.ratio)}',
                                  style: numStyle(context, size: 12, color: f.hidden ? scheme.onSurfaceVariant : (ch.up ? tokens.moneyIncome : tokens.moneyExpense)),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            if (d.zeroCategories.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Row(children: [
                  Expanded(child: Text(d.zeroCategories.join(', '), style: muted?.copyWith(fontStyle: FontStyle.italic))),
                  // the categories with nothing in the period add up to zero
                  Text(f.money(0), style: numStyle(context, size: 12, color: scheme.onSurfaceVariant)),
                ]),
              ),
          ],
        );

    Widget budgets(MonthlyReport d) => d.budgets.isEmpty && d.zeroBudgets.names.isEmpty
        ? empty(t.budget.none)
        : Column(
            children: [
              for (final b in d.budgets)
                InkWell(
                  key: Key('budget-${b.id}'),
                  onTap: () {
                    vm.openBudget(b);
                    drill();
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(b.name, style: const TextStyle(fontWeight: FontWeight.w500)),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Expanded(child: Text('${t.budget.limit}  ${f.money(b.limit.value)}', style: muted)),
                            Text('${t.budget.spent}  ${f.money(b.spent.value)}', style: numStyle(context, size: 12, color: f.hidden ? null : tokens.moneyExpense)),
                          ],
                        ),
                        Text('${t.budget.remaining}  ${f.money(b.remaining)}', style: numStyle(context, size: 12, color: signColor(context, f, b.remaining))),
                        if (b.pct != null) ...[const SizedBox(height: 6), Meter(model: meterModel(b.pct, hidden: f.hidden))],
                      ],
                    ),
                  ),
                ),
              if (d.zeroBudgets.names.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Row(
                    children: [
                      Expanded(child: Text(d.zeroBudgets.names.join(', '), style: muted?.copyWith(fontStyle: FontStyle.italic))),
                      Text(f.money(d.zeroBudgets.limit), style: numStyle(context, size: 12, color: scheme.onSurfaceVariant)),
                    ],
                  ),
                ),
            ],
          );

    Widget txList(List<TxRow> rows) => Column(children: [for (final tx in rows) TxTile(tx: tx, f: f, onTap: () => context.push('/transactions/${tx.groupId}', extra: tx))]);

    Widget assets(MonthlyReport d) => d.assets.isEmpty
        ? empty(t.common.noData)
        : Column(
            children: [
              for (final a in d.assets) ...[
                InkWell(
                  key: Key('asset-${a.id}'),
                  onTap: () => vm.toggleAsset(a.id),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    child: Row(
                      children: [
                        Icon(vm.expanded.contains(a.id) ? Icons.expand_more : Icons.chevron_right, size: 20, color: scheme.onSurfaceVariant),
                        const SizedBox(width: 4),
                        Expanded(child: Text(a.name, maxLines: 1, overflow: TextOverflow.ellipsis)),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(f.money(a.net, signed: true), style: numStyle(context, weight: FontWeight.w600, color: signColor(context, f, a.net))),
                            Text('${f.money(a.income, signed: true)}  ${f.money(-a.expense)}', style: numStyle(context, size: 11, color: scheme.onSurfaceVariant)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                if (vm.expanded.contains(a.id)) ...[
                  if (a.topIncome.isNotEmpty) ...[Align(alignment: Alignment.centerLeft, child: Text(t.monthly.topIncome.toUpperCase(), style: text.labelSmall?.copyWith(color: scheme.onSurfaceVariant))), txList(a.topIncome)],
                  if (a.topExpenses.isNotEmpty) ...[Align(alignment: Alignment.centerLeft, child: Text(t.monthly.topExpenses.toUpperCase(), style: text.labelSmall?.copyWith(color: scheme.onSurfaceVariant))), txList(a.topExpenses)],
                ],
                const Divider(height: 1),
              ],
            ],
          );

    Widget savings(SavingsSeries s) => s.accounts.isEmpty ? empty(t.common.noData) : SavingsMultiples(series: s, f: f, colorOf: (id) => ref.watch(seriesColorsProvider).color('account', id));

    Widget block(String title, SummaryBlock b) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title.toUpperCase(), style: text.labelSmall?.copyWith(color: scheme.onSurfaceVariant, letterSpacing: 0.6)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(child: StatTile(label: t.monthly.earned, value: f.money(b.earned.value), accent: tokens.moneyIncome)),
                const SizedBox(width: 8),
                Expanded(child: StatTile(label: t.monthly.spent, value: f.money(b.spent.value), accent: tokens.moneyExpense)),
                const SizedBox(width: 8),
                Expanded(child: StatTile(label: t.common.net, value: f.money(b.net.value), accent: b.net.value >= 0 ? tokens.moneyIncome : tokens.moneyExpense)),
              ],
            ),
          ],
        );

    return ReportPage(
      title: t.nav.monthly,
      listKey: const Key('monthly'),
      failed: vm.res.hasError && d == null,
      onRetry: () => ref.invalidate(monthlyReportProvider),
      children: [
        Text(t.monthly.description, style: TextStyle(color: scheme.onSurfaceVariant)),
        const SizedBox(height: 8),
        KpiGrid(
          children: [
            KpiCard(label: t.monthly.earned, f: f, accent: tokens.moneyIncome, value: d?.kpis.earned, loading: loading),
            KpiCard(label: t.monthly.spent, f: f, accent: tokens.moneyExpense, value: d?.kpis.spent, loading: loading),
            KpiCard(label: t.monthly.netChange, f: f, accent: tokens.moneyNet, value: d?.kpis.net, loading: loading),
            KpiCard(label: t.common.savingsRate, f: f, accent: tokens.moneySavings, value: d?.kpis.savingsRate, format: KpiFormat.pct, loading: loading),
          ],
        ),
        const SizedBox(height: 12),
        SectionCard(title: t.monthly.categories, child: d == null ? const SizedBox(height: 120) : categories(d)),
        const SizedBox(height: 12),
        SectionCard(
          title: t.monthly.moneyFlow,
          trailing: TextButton(key: const Key('open-flow'), onPressed: () => context.push('/reports/flow'), child: Text(t.monthly.openInteractive)),
          child: Text(t.flow.description, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
        ),
        const SizedBox(height: 12),
        SectionCard(
          title: t.monthly.dailyCashFlow,
          padding: const EdgeInsets.fromLTRB(10, 16, 10, 12),
          child: vm.calendar.valueOrNull == null
              ? const SizedBox(height: 200)
              : CalendarGrid(
                  days: vm.calendar.value!.days,
                  scheduled: vm.calendar.value!.scheduled,
                  f: f,
                  today: today,
                  onDay: (date) {
                    vm.openDay(date);
                    drill();
                  },
                ),
        ),
        const SizedBox(height: 12),
        SectionCard(title: t.monthly.budgets, child: d == null ? const SizedBox(height: 80) : budgets(d)),
        const SizedBox(height: 12),
        SectionCard(title: t.monthly.top5, padding: const EdgeInsets.fromLTRB(12, 16, 12, 8), child: d == null ? const SizedBox(height: 80) : (d.topExpenses.isEmpty ? empty(t.common.noData) : txList(d.topExpenses))),
        const SizedBox(height: 12),
        SectionCard(title: t.monthly.assetActivity, child: d == null ? const SizedBox(height: 80) : assets(d)),
        const SizedBox(height: 12),
        SectionCard(title: t.monthly.savings(n: d?.savings.months.length ?? 6), child: d == null ? const SizedBox(height: 80) : savings(d.savings)),
        const SizedBox(height: 12),
        SectionCard(
          title: t.monthly.overview,
          child: d == null
              ? const SizedBox(height: 120)
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    block(t.monthly.thisPeriod, d.overview.month),
                    const SizedBox(height: 16),
                    block(t.monthly.ytd, d.overview.ytd),
                    const SizedBox(height: 16),
                    StatTile(label: t.monthly.currentNetWorth, value: f.money(d.overview.netWorth.value), accent: d.overview.netWorth.value >= 0 ? tokens.moneyIncome : tokens.moneyExpense),
                  ],
                ),
        ),
      ],
    );
  }
}
