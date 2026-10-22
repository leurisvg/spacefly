import 'dart:ui' show Color;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/models.g.dart';
import '../../api/resources.dart';
import '../../format/formatter.dart';
import '../../format/formatter_provider.dart';
import '../../i18n/strings.g.dart';
import '../../shared/dates.dart' show todayIso;
import '../../state/filters_store.dart';
import '../../state/preferences.dart';
import '../../state/tx_detail.dart';
import '../../ui_logic/names.dart';
import '../../ui_logic/series_colors.dart';

final dashboardReportProvider = reportProvider<DashboardReport>('reports/dashboard', DashboardReport.fromJson);

/// First and last day (`YYYY-MM-DD`) of a `YYYY-MM` month.
({String start, String end}) monthRange(String month) {
  final end = DateTime.utc(int.parse(month.substring(0, 4)), int.parse(month.substring(5, 7)) + 1, 0);
  return (start: '$month-01', end: end.toIso8601String().substring(0, 10));
}

class Slice {
  const Slice({required this.id, required this.name, required this.value, required this.color});
  final String? id;
  final String name;
  final double value;
  final Color color;
}

/// Donut slices of the top categories: one color per category for the whole session, "others" in gray.
List<Slice> categorySlices(List<TopCategory> top, Translations t, SeriesColors colors) => [
      for (final c in top)
        Slice(id: c.id, name: entityName(t, c.name, c.id), value: c.value, color: c.id == othersId ? colors.other() : colors.color('category', c.id)),
    ];

/// A table of rows of text, for the screen-reader/"show as table" form of a chart.
class TextTable {
  const TextTable({required this.columns, required this.rows});
  final List<String> columns;
  final List<List<String>> rows;
}

/// The dashboard: KPIs, income vs expenses, top categories, net worth, budgets, upcoming and largest.
/// Port of libs/client/src/features/dashboard/dashboard.vm.ts: the shaping is the same, the charts are drawn by fl_chart.
class DashboardViewModel {
  DashboardViewModel({required this.report, required this.f, required this.t, required this.colors, required this.detail, this.calendarMonth = '', this.today = ''});

  final AsyncValue<DashboardReport> report;
  final Formatter f;
  final Translations t;
  final SeriesColors colors;
  final TxDetailNotifier detail;

  /// The month the calendar card shows (`YYYY-MM`): the one the period ends in.
  final String calendarMonth;
  final String today;

  DashboardReport? get data => report.valueOrNull;

  bool get initialLoading => report.isLoading && data == null;

  TextTable? get monthsTable {
    final months = data?.months;
    if (months == null) return null;
    return TextTable(
      columns: [t.common.month, t.common.income, t.common.expenses, t.common.net],
      rows: [for (final m in months) [f.date(m.month, DateStyle.month), f.money(m.income), f.money(m.expense), f.money(m.net)]],
    );
  }

  List<Slice> get slices => categorySlices(data?.topCategories ?? const [], t, colors);

  double get slicesTotal => slices.fold(0, (a, s) => a + s.value);

  TextTable? get categoriesTable => slices.isEmpty
      ? null
      : TextTable(columns: [t.common.category, t.common.amount], rows: [for (final s in slices) [s.name, f.money(s.value)]]);

  List<NetWorth> get netWorth => data?.netWorth ?? const [];

  /// The `open*` actions set the drill-down request and say whether there is one to show.
  bool openMonth(int index) {
    final months = data?.months;
    if (months == null || index < 0 || index >= months.length) return false;
    final m = months[index];
    final range = monthRange(m.month);
    detail.open(f.date(m.month, DateStyle.month), {'start': range.start, 'end': range.end});
    return true;
  }

  bool openCategory(int index) {
    final list = slices;
    if (index < 0 || index >= list.length) return false;
    final s = list[index];
    if (s.id == othersId) {
      final children = data?.topCategories[index].children ?? const [];
      if (children.isEmpty) return false;
      detail.openCategories(s.name, [for (final c in children) BreakdownRow(id: c.id, name: entityName(t, c.name, c.id), value: c.value)], filter: {'type': 'withdrawal'});
      return true;
    }
    detail.open(s.name, {'type': 'withdrawal', 'category': s.id ?? 'none'});
    return true;
  }

  bool openDay(String date) {
    detail.open(f.date(date, DateStyle.full), {'start': date, 'end': date});
    return true;
  }
}

final dashboardViewModelProvider = Provider.autoDispose<DashboardViewModel>((ref) {
  ref.watch(preferencesProvider.select((p) => p.lang)); // `t` is global: rebuild when the language changes
  return DashboardViewModel(
    report: ref.watch(dashboardReportProvider),
    f: ref.watch(formatterProvider),
    t: t,
    colors: ref.watch(seriesColorsProvider),
    detail: ref.read(txDetailProvider.notifier),
    calendarMonth: ref.watch(filtersProvider.select((f) => f.period.end.substring(0, 7))),
    today: todayIso(ref.read(clockProvider)()),
  );
});
