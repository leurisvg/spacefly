import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/models.g.dart' show AccountTxRow;
import '../api/resources.dart' show PausedRequest;
import '../features/accounts/account_detail_vm.dart';
import '../features/accounts/accounts_vm.dart' show BalanceLine;
import '../format/formatter.dart' show DateStyle;
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../shared/dates.dart' show PeriodPreset, todayIso;
import '../state/filters_store.dart';
import '../theme/app_theme.dart';
import '../ui/calendar_grid.dart';
import '../ui/charts.dart';
import '../ui/charts/ranking_bars.dart';
import '../ui/common.dart';
import '../ui/drill_sheet.dart';
import '../ui/kpi_card.dart';
import '../ui/report_page.dart';

/// One asset account: balance and flows per day, monthly trend, rankings and every record with its running balance. It opens on the last
/// 30 days and hands the user's period back when it closes.
class AccountDetailScreen extends ConsumerStatefulWidget {
  const AccountDetailScreen({super.key, required this.id});

  final String id;

  @override
  ConsumerState<AccountDetailScreen> createState() => _AccountDetailScreenState();
}

class _AccountDetailScreenState extends ConsumerState<AccountDetailScreen> {
  late final FiltersNotifier _filters = ref.read(filtersProvider.notifier);

  @override
  void initState() {
    super.initState();
    // Providers cannot be changed while the tree is built: the request waits for this (see `filtersScopedProvider`).
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _filters.scopePreset(PeriodPreset.last30);
    });
  }

  @override
  void dispose() {
    final filters = _filters;
    Future.microtask(filters.release);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final id = widget.id;
    final vm = ref.watch(accountDetailViewModelProvider(id));
    final f = ref.watch(formatterProvider);
    final tokens = context.tokens;
    final scheme = Theme.of(context).colorScheme;
    final r = vm.r;
    final own = vm.own;
    final today = todayIso(ref.read(clockProvider)());
    final stats = vm.stats;
    final muted = TextStyle(fontSize: 11, color: scheme.onSurfaceVariant, letterSpacing: 0.6);
    void drillDay(String date) {
      vm.openDay(date);
      showDrillSheet(context);
    }

    Widget stat(String label, Widget value) =>
        SizedBox(width: 150, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label.toUpperCase(), style: muted), const SizedBox(height: 2), value]));

    Widget pair(double? original, double? converted, {bool signed = false, Color? color}) =>
        Text(vm.moneyPair(original, converted, signed: signed), style: numStyle(context, size: 13, color: f.hidden ? null : color));

    Widget extreme(AccountExtreme x) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [pair(x.balanceOriginal, x.balance), Text(f.date(x.date, DateStyle.short), style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant))]);

    Widget biggest(BiggestRecord b, {required bool expense}) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            pair(expense ? -b.amountOriginal : b.amountOriginal, expense ? -b.tx.amount : b.tx.amount, color: expense ? tokens.moneyExpense : tokens.moneyIncome),
            Text(b.tx.description, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
          ],
        );

    Widget ranks(String title, List items, Color color) => SectionCard(
          title: title,
          child: RankingBars(rows: [for (final x in items) RankBar(name: vm.rankName(x), value: vm.rankValue(x), label: f.compact(vm.rankValue(x), currency: own))], color: color, onRow: (_) {}),
        );

    Widget record(AccountTxRow tx) {
      final tone = switch (vm.tone(tx)) {
        TxTone.expense => tokens.moneyExpense,
        TxTone.income => tokens.moneyIncome,
        TxTone.none => scheme.onSurface,
      };
      final flow = vm.foreign ? tx.flowOriginal : tx.flow;
      final after = tx.balance == null ? null : (vm.foreign ? tx.balanceOriginal : tx.balance);
      return InkWell(
        key: Key('record-${tx.id}'),
        onTap: () => context.push('/transactions/${tx.groupId}'),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(width: 52, child: Text(f.date(tx.date), style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant))),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(tx.description, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w500)),
                    Text('${(tx.category?.name.isNotEmpty ?? false) ? tx.category!.name : t.common.uncategorized} · ${vm.counterparty(tx)}',
                        maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
                    if (tx.budget != null || tx.tags.isNotEmpty)
                      Text([if (tx.budget != null) tx.budget!.name, for (final g in tx.tags) '#$g'].join(' · '),
                          maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(f.money(flow, currency: own, signed: true), style: numStyle(context, size: 14, weight: FontWeight.w600, color: f.hidden ? null : tone)),
                  if (vm.foreign) Text('≈ ${f.money(tx.flow, signed: true)}', style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
                  if (after != null) Text('${t.accounts.detail.balanceAfter}: ${f.money(after, currency: own)}', style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
                ],
              ),
              if (vm.editable(tx))
                IconButton(
                    key: Key('record-edit-${tx.id}'),
                    visualDensity: VisualDensity.compact,
                    tooltip: t.editor.tx.edit,
                    icon: const Icon(Icons.edit_outlined, size: 18),
                    onPressed: () => context.push('/transactions/${tx.groupId}/edit')),
            ],
          ),
        ),
      );
    }

    final tabLabels = {'all': t.accounts.detail.tabs.all, 'withdrawal': t.accounts.detail.tabs.expenses, 'deposit': t.accounts.detail.tabs.income, 'transfer': t.accounts.detail.tabs.transfers};
    final days = vm.balanceDays;

    return ReportPage(
      title: r?.account.name ?? '…',
      listKey: Key('account-detail-$id'),
      actions: [
        if (r != null)
          IconButton(
              key: const Key('account-edit'), tooltip: t.editor.tx.edit, icon: const Icon(Icons.edit_outlined), onPressed: () => context.push('/edit/account/${Uri.encodeComponent(r.account.id)}')),
        const PrivacyButton()
      ],
      children: [
        if (vm.res.hasError && r == null && vm.res.error is! PausedRequest)
          EmptyState(icon: Icons.search_off, title: t.accounts.detail.notFound, subtitle: t.accounts.detail.notFoundHint)
        else ...[
          if (vm.subtitle != null) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(vm.subtitle!, style: TextStyle(color: scheme.onSurfaceVariant))),
          KpiCard(
            label: t.accounts.detail.closing,
            f: f,
            accent: tokens.moneyNet,
            value: r == null ? null : (vm.foreign ? r.balanceOriginal : r.closing),
            previous: r == null ? null : (vm.foreign ? r.openingOriginal : r.opening),
            currency: own,
            note: vm.approx(r?.closing),
            spark: r == null ? null : [for (final m in r.months) vm.balanceOf(m)],
            loading: vm.initialLoading,
          ),
          const SizedBox(height: 8),
          KpiGrid(
            children: [
              KpiCard(
                  label: t.common.income,
                  f: f,
                  accent: tokens.moneyIncome,
                  value: r == null ? null : (vm.foreign ? r.totalsOriginal.income : r.totals.income),
                  currency: own,
                  note: vm.approx(r?.totals.income),
                  loading: vm.initialLoading),
              KpiCard(
                  label: t.common.expenses,
                  f: f,
                  accent: tokens.moneyExpense,
                  value: r == null ? null : (vm.foreign ? r.totalsOriginal.expense : r.totals.expense),
                  currency: own,
                  note: vm.approx(r?.totals.expense),
                  loading: vm.initialLoading),
            ],
          ),
          const SizedBox(height: 8),
          KpiCard(
              label: t.accounts.detail.change,
              f: f,
              accent: tokens.moneyNet,
              value: r == null ? null : (vm.foreign ? r.changeOriginal : r.change.abs),
              currency: own,
              note: vm.approx(r?.change.abs),
              loading: vm.initialLoading),
          if (r != null && stats != null) ...[
            const SizedBox(height: 12),
            SectionCard(
              title: t.accounts.detail.stats,
              child: Wrap(
                spacing: 16,
                runSpacing: 14,
                children: [
                  stat(t.accounts.detail.opening, pair(r.openingOriginal, r.opening)),
                  stat(t.accounts.balanceOriginal, Text(f.money(r.balanceOriginal, currency: r.account.currency), style: numStyle(context, size: 13))),
                  if (stats.lowest != null) stat(t.accounts.detail.lowest, extreme(stats.lowest!)),
                  if (stats.highest != null) stat(t.accounts.detail.highest, extreme(stats.highest!)),
                  stat(t.accounts.detail.avgDailyExpense, pair(stats.avgDailyExpenseOriginal, stats.avgDailyExpense)),
                  stat(t.accounts.detail.netTransfers, pair(r.totalsOriginal.transferIn - r.totalsOriginal.transferOut, r.totals.transferIn - r.totals.transferOut, signed: true)),
                  if (stats.biggestExpense != null) stat(t.accounts.detail.biggestExpense, biggest(stats.biggestExpense!, expense: true)),
                  if (stats.biggestIncome != null) stat(t.accounts.detail.biggestIncome, biggest(stats.biggestIncome!, expense: false)),
                ],
              ),
            ),
          ],
          const SizedBox(height: 12),
          SectionCard(
            title: t.accounts.detail.dailyBalance,
            child: r == null
                ? const SizedBox(height: 220)
                : days.isEmpty
                    ? EmptyState(title: t.common.noData)
                    : LinesChart(
                        months: const [],
                        labels: [for (final d in days) f.date(d.date, DateStyle.day)],
                        lines: [
                          BalanceLine(id: 'balance', name: t.accounts.balance, values: [for (final d in days) d.balance], color: tokens.moneyNet)
                        ],
                        f: f,
                        area: true,
                        yFormat: own == null ? null : (v) => f.compact(v, currency: own),
                        tipTitle: (i) => f.date(days[i].date, DateStyle.full),
                      ),
          ),
          const SizedBox(height: 12),
          SectionCard(
            title: t.accounts.detail.dailyFlow,
            subtitle: t.calendar.clickDay,
            padding: const EdgeInsets.fromLTRB(10, 16, 10, 12),
            child: r == null
                ? const SizedBox(height: 240)
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (final m in vm.calendarMonths) ...[
                        Padding(padding: const EdgeInsets.fromLTRB(4, 0, 0, 6), child: Text(f.date(m.month, DateStyle.month), style: const TextStyle(fontWeight: FontWeight.w600))),
                        CalendarGrid(key: Key('calendar-${m.month}'), days: m.days, f: f, today: today, scale: vm.calendarScale, currency: own, onDay: drillDay),
                        const SizedBox(height: 16),
                      ],
                    ],
                  ),
          ),
          const SizedBox(height: 12),
          SectionCard(
            title: t.accounts.detail.monthly,
            child: r == null
                ? const SizedBox(height: 220)
                : IncomeExpenseChart(months: vm.monthRows, f: f, incomeLabel: t.common.income, expenseLabel: t.common.expenses, netLabel: t.common.net, currency: own, onMonth: (_) {}),
          ),
          const SizedBox(height: 12),
          SectionCard(
            title: t.accounts.detail.byWeekday,
            child: r == null
                ? const SizedBox(height: 200)
                : CategoryBarsChart(labels: vm.weekdayLabels, values: vm.weekdayValues, color: tokens.moneyExpense, f: f, seriesName: t.common.expenses, currency: own),
          ),
          if (r != null && r.topCategories.isNotEmpty) ...[const SizedBox(height: 12), ranks(t.accounts.detail.topCategories, r.topCategories, tokens.moneyExpense)],
          if (r != null && r.topMerchants.isNotEmpty) ...[const SizedBox(height: 12), ranks(t.accounts.detail.topMerchants, r.topMerchants, tokens.moneyExpense)],
          if (r != null && r.topIncomeSources.isNotEmpty) ...[const SizedBox(height: 12), ranks(t.accounts.detail.topIncomeSources, r.topIncomeSources, tokens.moneyIncome)],
          const SizedBox(height: 12),
          SectionCard(
            title: t.accounts.detail.records,
            padding: const EdgeInsets.fromLTRB(12, 16, 12, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      for (final key in accountTabs)
                        Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(key: Key('tab-$key'), label: Text('${tabLabels[key]}  ${vm.counts[key]}'), selected: vm.tab == key, onSelected: (_) => vm.setTab(key)),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                if (vm.pageRows.isEmpty) EmptyState(title: vm.initialLoading ? '' : t.tx.none),
                for (final tx in vm.pageRows) record(tx),
                const Divider(),
                Row(
                  children: [
                    Expanded(
                      child: Text('${t.accounts.detail.periodTotal}: ${f.money(vm.rowsTotal, signed: true)} · ${t.explorer.page(page: vm.page, pages: vm.pages)}',
                          style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
                    ),
                    IconButton(key: const Key('page-previous'), tooltip: t.period.previous, icon: const Icon(Icons.chevron_left), onPressed: vm.page <= 1 ? null : () => vm.setPage(vm.page - 1)),
                    IconButton(key: const Key('page-next'), tooltip: t.period.next, icon: const Icon(Icons.chevron_right), onPressed: vm.page >= vm.pages ? null : () => vm.setPage(vm.page + 1)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}
