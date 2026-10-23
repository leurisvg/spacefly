import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/models.g.dart' hide Period, PeriodPreset, Ref;
import '../../api/resources.dart';
import '../../format/formatter.dart';
import '../../format/formatter_provider.dart';
import '../../i18n/strings.g.dart';
import '../../shared/dates.dart';
import '../../state/filters_store.dart';
import '../../state/preferences.dart';
import '../../state/tx_detail.dart';
import '../../ui/charts/heatmap.dart';
import '../../ui_logic/names.dart';
import '../../ui_logic/text_table.dart';

/// How many categories the month × category matrix shows.
const annualMatrixLimit = 15;

/// Matrix cell index (the grid walks it category by category) → its month and category positions.
({int month, int category}) matrixCell(int index, int months) => (month: index % months, category: index ~/ months);

final annualYearProvider = Provider<int>((ref) => int.parse(ref.watch(filtersProvider.select((f) => f.period.end)).substring(0, 4)));

final annualReportProvider = reportProvider<AnnualReport>('reports/annual', AnnualReport.fromJson, extra: (ref) => {'year': ref.watch(annualYearProvider)});

class MonthRow {
  const MonthRow({required this.month, required this.income, required this.expense, required this.net});
  final String month;
  final double income;
  final double expense;
  final double net;
}

/// The annual report of the year the period ends in: monthly income and expenses, savings rate, best and worst month, category
/// matrix. Port of libs/client/src/features/reports/annual.vm.ts.
class AnnualViewModel {
  AnnualViewModel({required this.year, required this.res, required this.f, required this.t, required this.detail, this.matrixLimit = annualMatrixLimit});

  final int year;
  final AsyncValue<AnnualReport> res;
  final Formatter f;
  final Translations t;
  final TxDetailNotifier detail;
  final int matrixLimit;

  AnnualReport? get r => res.valueOrNull;

  bool get initialLoading => res.isLoading && r == null;

  List<MonthRow> get rows {
    final report = r;
    if (report == null) return const [];
    return [for (final (i, month) in report.months.indexed) MonthRow(month: month, income: report.income[i], expense: report.expense[i], net: report.income[i] - report.expense[i])];
  }

  List<AnnualReportCategory> get shownCategories => (r?.categories ?? const <AnnualReportCategory>[]).take(matrixLimit).toList();

  String categoryName(AnnualReportCategory c) => entityName(t, c.name, c.id);

  /// The matrix cells, category by category, with the scale that colors them.
  List<HeatCell> get matrixCells => [
        for (final (row, c) in shownCategories.indexed)
          for (final (col, v) in c.values.indexed) HeatCell(row: row, col: col, value: v),
      ];

  double get matrixMax => shownCategories.fold<double>(1, (m, c) => c.values.fold(m, (a, v) => v > a ? v : a));

  TextTable? get monthTable => rows.isEmpty
      ? null
      : TextTable(
          columns: [t.common.month, t.common.income, t.common.expenses, t.common.net, t.common.savingsRate],
          rows: [
            for (final (i, m) in rows.indexed)
              [f.date(m.month, DateStyle.month), f.money(m.income), f.money(m.expense), f.money(m.net), r!.savingsRate[i] == null ? '—' : f.pct(r!.savingsRate[i]! / 100)],
          ],
        );

  TextTable? get matrixTable {
    final report = r;
    if (report == null) return null;
    return TextTable(
      columns: [t.common.category, ...report.months.map((m) => f.monthLabel(m, withYear: false)), t.common.total],
      rows: [
        for (final c in report.categories) [categoryName(c), ...c.values.map((v) => v != 0 ? f.compact(v, currency: false) : '·'), f.money(c.total)],
      ],
    );
  }

  void _openMonthRange(String title, String month, [Map<String, String> extra = const {}]) {
    detail.open(title, {'start': '$month-01', 'end': endOfMonth('$month-01'), ...extra});
  }

  bool openMonth(int index) {
    final months = r?.months;
    if (months == null || index < 0 || index >= months.length) return false;
    _openMonthRange(f.date(months[index], DateStyle.month), months[index]);
    return true;
  }

  bool openCell(int monthIndex, int categoryIndex) {
    final report = r;
    if (report == null || monthIndex < 0 || monthIndex >= report.months.length || categoryIndex < 0 || categoryIndex >= report.categories.length) return false;
    final m = report.months[monthIndex], c = report.categories[categoryIndex];
    _openMonthRange('${categoryName(c)} · ${f.date(m, DateStyle.month)}', m, {'type': 'withdrawal', 'category': c.id ?? 'none'});
    return true;
  }

  /// The tooltip of a matrix cell: "category · month" over its amount. `null` for an index that is not a cell.
  String? matrixTip(int index) {
    final months = r?.months ?? const <String>[];
    if (months.isEmpty || index < 0 || index >= shownCategories.length * months.length) return null;
    final cell = matrixCell(index, months.length);
    final category = shownCategories[cell.category];
    return '${categoryName(category)} · ${f.date(months[cell.month], DateStyle.month)}\n${f.money(category.values[cell.month])}';
  }

  /// A matrix tap that only reports the cell's data index.
  bool openCellAt(int index) {
    final months = r?.months.length ?? 0;
    final cell = matrixCell(index, months == 0 ? 1 : months);
    return openCell(cell.month, cell.category);
  }
}

final annualViewModelProvider = Provider.autoDispose<AnnualViewModel>((ref) {
  ref.watch(preferencesProvider.select((p) => p.lang));
  return AnnualViewModel(
    year: ref.watch(annualYearProvider),
    res: ref.watch(annualReportProvider),
    f: ref.watch(formatterProvider),
    t: t,
    detail: ref.read(txDetailProvider.notifier),
  );
});
