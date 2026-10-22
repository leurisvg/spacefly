import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/models.g.dart' show Kind, TxKind;
import '../features/accounts/accounts_vm.dart' show BalanceLine;
import '../features/reports/calendar_vm.dart';
import '../format/formatter.dart' show DateStyle;
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../theme/app_theme.dart';
import '../ui/calendar_grid.dart';
import '../ui/charts.dart';
import '../ui/charts/heatmap.dart';
import '../ui/common.dart';
import '../ui/form_widgets.dart';
import '../ui/kpi_card.dart';
import '../ui/report_page.dart';

/// A month of daily cash flow (with the running balance and what is scheduled), or the year as a spending heatmap.
class CalendarScreen extends ConsumerWidget {
  const CalendarScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final vm = ref.watch(calendarViewModelProvider);
    final f = ref.watch(formatterProvider);
    final tokens = context.tokens;
    final scheme = Theme.of(context).colorScheme;
    final isMonth = vm.view == CalendarView.month;
    final data = vm.data;

    void drill() => context.push('/drill');

    Future<void> pick(CalendarFilter filter, String title, List<FilterOption> options, String selected, String all) async {
      final v = await showOptionSheet(context, title: title, options: [for (final o in options) PickerOption(o.value, o.label)], selected: selected, none: all);
      if (v != null) vm.setFilter(filter, v);
    }

    Widget chip(Key key, String title, List<FilterOption> options, String selected, String all, CalendarFilter filter) {
      final current = options.where((o) => o.value == selected).firstOrNull;
      return InputChip(
        key: key,
        label: Text(current?.label ?? all),
        selected: selected.isNotEmpty,
        showCheckmark: false,
        onPressed: () => pick(filter, title, options, selected, all),
        onDeleted: selected.isEmpty ? null : () => vm.setFilter(filter, ''),
      );
    }

    final days = vm.knownDays;
    final scheduled = data?.scheduled ?? const [];

    return ReportPage(
      title: t.nav.calendar,
      listKey: const Key('calendar'),
      failed: isMonth ? vm.cal.hasError && data == null : vm.yearRes.hasError && vm.yearData == null,
      onRetry: () => ref.invalidate(isMonth ? calendarReportProvider : yearHeatmapProvider),
      children: [
        Text(t.calendar.description, style: TextStyle(color: scheme.onSurfaceVariant)),
        const SizedBox(height: 8),
        SegmentedButton<CalendarView>(
          key: const Key('calendar-view'),
          showSelectedIcon: false,
          segments: [ButtonSegment(value: CalendarView.month, label: Text(t.calendar.month)), ButtonSegment(value: CalendarView.year, label: Text(t.calendar.year))],
          selected: {vm.view},
          onSelectionChanged: (v) => vm.setView(v.first),
        ),
        const SizedBox(height: 12),
        if (isMonth) ...[
          Text(f.date(vm.month.start, DateStyle.month), style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              chip(const Key('filter-account'), t.common.account, vm.accountOptions, vm.account, t.calendar.allAccounts, CalendarFilter.account),
              chip(const Key('filter-category'), t.common.category, vm.categoryOptions, vm.category, t.calendar.allCategories, CalendarFilter.category),
              chip(const Key('filter-tag'), t.common.tag, vm.tagOptions, vm.tag, t.calendar.allTags, CalendarFilter.tag),
            ],
          ),
          const SizedBox(height: 12),
          KpiGrid(
            aspectRatio: 1.9,
            children: [
              KpiCard(label: t.common.income, f: f, accent: tokens.moneyIncome, value: data?.totals.income, loading: vm.initialLoading),
              KpiCard(label: t.common.expenses, f: f, accent: tokens.moneyExpense, value: data?.totals.expense, loading: vm.initialLoading),
            ],
          ),
          const SizedBox(height: 8),
          SizedBox(height: 84, child: KpiCard(label: t.calendar.endBalance, f: f, accent: tokens.moneyNet, value: vm.endBalance, loading: vm.initialLoading)),
          const SizedBox(height: 12),
          SectionCard(
            title: t.monthly.dailyCashFlow,
            subtitle: t.calendar.clickDay,
            padding: const EdgeInsets.fromLTRB(10, 16, 10, 12),
            child: data == null
                ? const SizedBox(height: 280)
                : CalendarGrid(
                    days: data.days,
                    scheduled: data.scheduled,
                    f: f,
                    today: vm.today,
                    onDay: (date) {
                      vm.openDay(date);
                      drill();
                    },
                  ),
          ),
          const SizedBox(height: 12),
          SectionCard(
            title: t.calendar.runningBalance,
            child: !vm.hasBalance
                ? Padding(padding: const EdgeInsets.symmetric(vertical: 24), child: Center(child: Text(t.calendar.noBalance, textAlign: TextAlign.center, style: TextStyle(color: scheme.onSurfaceVariant))))
                : LinesChart(
                    months: const [],
                    labels: [for (final d in days) d.date.substring(8)],
                    lines: [BalanceLine(id: 'balance', name: t.calendar.balance, values: [for (final d in days) d.balance!], color: tokens.moneyNet)],
                    f: f,
                    area: true,
                    tipTitle: (i) => f.date(days[i].date, DateStyle.full),
                  ),
          ),
          const SizedBox(height: 12),
          SectionCard(
            title: t.calendar.scheduled,
            child: scheduled.isEmpty
                ? Padding(padding: const EdgeInsets.symmetric(vertical: 16), child: Center(child: Text(t.calendar.noScheduled, style: TextStyle(color: scheme.onSurfaceVariant))))
                : Column(
                    children: [
                      for (final s in scheduled)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Row(
                            children: [
                              Container(width: 8, height: 8, decoration: BoxDecoration(shape: BoxShape.circle, color: s.kind == Kind.BILL ? tokens.moneyDeficit : scheme.primary)),
                              const SizedBox(width: 10),
                              SizedBox(width: 56, child: Text(f.date(s.date), style: numStyle(context, size: 12, color: scheme.onSurfaceVariant))),
                              Expanded(child: Text(s.name, maxLines: 1, overflow: TextOverflow.ellipsis)),
                              Text(
                                f.money(s.type == TxKind.DEPOSIT ? s.amount : -s.amount, signed: true),
                                style: numStyle(context, size: 12, color: f.hidden ? null : (s.type == TxKind.DEPOSIT ? tokens.moneyIncome : tokens.moneyExpense)),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
          ),
        ] else ...[
          _YearHeatmap(vm: vm, onDay: (i) {
            if (vm.openHeatmapDay(i)) drill();
          }),
        ],
      ],
    );
  }
}

class _YearHeatmap extends ConsumerWidget {
  const _YearHeatmap({required this.vm, required this.onDay});
  final CalendarViewModel vm;
  final void Function(int index) onDay;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final f = ref.watch(formatterProvider);
    final layout = vm.heatmap;
    final y = vm.yearData;
    return SectionCard(
      title: t.calendar.heatmapTitle(year: vm.year),
      subtitle: t.calendar.heatmapHint,
      child: layout == null || y == null
          ? const SizedBox(height: 320)
          : Column(
              children: [
                HeatmapGrid(
                  key: const Key('year-heatmap'),
                  rows: layout.weeks,
                  cols: 7,
                  cells: layout.cells,
                  max: y.max < 1 ? 1 : y.max,
                  cellHeight: 22,
                  labelWidth: 40,
                  rowLabels: {for (final (m, row) in layout.monthRows.indexed) row: f.monthLabel('${y.year.toInt()}-${(m + 1).toString().padLeft(2, '0')}', withYear: false)},
                  colLabels: f.weekdayNames(),
                  semanticsLabel: t.calendar.heatmapTitle(year: vm.year),
                  onCell: onDay,
                ),
                const SizedBox(height: 12),
                HeatLegend(zeroLabel: f.compact(0), maxLabel: f.compact(y.max)),
              ],
            ),
    );
  }
}
