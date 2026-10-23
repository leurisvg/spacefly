import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/api_client.dart';
import '../../api/models.g.dart';
import '../../api/resources.dart';
import '../../format/formatter.dart';
import '../../format/formatter_provider.dart';
import '../../i18n/strings.g.dart';
import '../../state/filters_store.dart';
import '../../state/preferences.dart';
import '../../state/tx_detail.dart';
import '../../ui_logic/pagination.dart';
import '../dashboard/dashboard_vm.dart' show TextTable;
import 'counterparties_vm.dart' show kindName;

/// Which account, and whether it is an expense or a revenue one.
typedef CounterpartyDetailArgs = ({CounterpartyKind kind, String id});

/// Totals of the last 12 months, the monthly average and the biggest record of the period.
/// Port of `counterpartyStats` in libs/client/src/features/accounts/counterparty-detail.vm.ts.
({double total12, double monthlyAverage, TxRow? biggest}) counterpartyStats(List<CounterpartyDetailReportMonth> months, List<TxRow> rows) {
  final total12 = months.fold<double>(0, (sum, m) => sum + m.value);
  TxRow? biggest;
  for (final x in rows) {
    if (biggest == null || x.amount > biggest.amount) biggest = x;
  }
  return (total12: total12, monthlyAverage: total12 / (months.isEmpty ? 1 : months.length), biggest: biggest);
}

/// One calendar per month of the period: what was paid (or received) on each day, as the expense (or income) of the day.
List<({String month, List<CalendarDay> days})> counterpartyCalendarMonths(List<CounterpartyDetailReportDay> days, CounterpartyKind kind) {
  final income = kind == CounterpartyKind.INCOME;
  final byMonth = <String, List<CalendarDay>>{};
  for (final d in days) {
    byMonth.putIfAbsent(d.date.substring(0, 7), () => []).add(CalendarDay(balance: null, count: d.count, date: d.date, expense: income ? 0 : d.value, income: income ? d.value : 0));
  }
  return [for (final e in byMonth.entries) (month: e.key, days: e.value)];
}

/// The asset account on the other side: where an expense was paid from, or an income received.
String assetOf(TxRow tx, CounterpartyKind kind) => (kind == CounterpartyKind.INCOME ? tx.destination : tx.source).name;

/// Only single-part expenses and income are edited in SpaceFly.
bool isEditableTx(TxRow tx) => tx.splitCount == 1 && (tx.type == 'withdrawal' || tx.type == 'deposit');

final counterpartyDetailReportProvider = FutureProvider.autoDispose.family<CounterpartyDetailReport, CounterpartyDetailArgs>((ref, args) async {
  final params = {...ref.watch(filterQueryProvider), 'kind': kindName(args.kind)};
  final response = await ref.watch(dioProvider).get<Object?>('/api/reports/counterparties/${Uri.encodeComponent(args.id)}', queryParameters: params);
  return unwrapReport(response.data, CounterpartyDetailReport.fromJson);
});

/// The page of records being shown.
final counterpartyPageProvider = StateProvider.autoDispose.family<int, CounterpartyDetailArgs>((ref, args) => 1);

/// One expense or revenue account over the selected period: totals, daily calendar, trend, breakdowns and every record.
/// Port of libs/client/src/features/accounts/counterparty-detail.vm.ts.
class CounterpartyDetailViewModel {
  CounterpartyDetailViewModel({required this.args, required this.res, required this.pageNumber, required this.f, required this.t, required this.detail, required this.setPage});

  final CounterpartyDetailArgs args;
  final AsyncValue<CounterpartyDetailReport> res;
  final int pageNumber;
  final Formatter f;
  final Translations t;
  final TxDetailNotifier detail;
  final void Function(int page) setPage;

  CounterpartyKind get kind => args.kind;

  bool get income => kind == CounterpartyKind.INCOME;

  CounterpartyDetailReport? get r => res.valueOrNull;

  bool get initialLoading => res.isLoading && r == null;

  /// Expenses read as negative amounts, income as positive.
  int get sign => income ? 1 : -1;

  /// The account's share of the period total, on the 0–100 scale.
  double? get share => r == null ? null : r!.totals.share * 100;

  String? get subtitle {
    final a = r?.account;
    if (a == null) return null;
    final parts = [if (a.iban != null && a.iban!.isNotEmpty) a.iban!, if (!a.active) t.accounts.excluded];
    return parts.isEmpty ? null : parts.join(' · ');
  }

  ({double total12, double monthlyAverage, TxRow? biggest})? get stats => r == null ? null : counterpartyStats(r!.months, r!.rows);

  List<({String month, List<CalendarDay> days})> get calendarMonths => counterpartyCalendarMonths(r?.days ?? const [], kind);

  /// The value that fills a calendar cell, so every month is on the same scale.
  double get calendarScale => (r?.days ?? const <CounterpartyDetailReportDay>[]).fold<double>(1, (m, d) => d.value > m ? d.value : m);

  /// Weekday names, Monday first.
  List<String> get weekdayLabels => f.weekdayNames();

  String get seriesName => income ? t.common.income : t.common.expenses;

  /// A ranked item with the name the screen writes: "Uncategorized" for the unnamed one.
  String rankName(RankedItem x) => x.name.isEmpty ? t.common.uncategorized : x.name;

  TextTable? get dayTable => r == null
      ? null
      : TextTable(columns: [
          t.common.date,
          t.ranking.count,
          t.common.total
        ], rows: [
          for (final x in r!.days)
            if (x.count > 0) [f.date(x.date, DateStyle.day), x.count.toInt().toString(), f.money(x.value)]
        ]);

  TextTable? get monthlyTable => r == null
      ? null
      : TextTable(columns: [
          t.common.month,
          t.ranking.count,
          t.common.total
        ], rows: [
          for (final m in r!.months) [f.date(m.month, DateStyle.month), m.count.toInt().toString(), f.money(m.value)]
        ]);

  TextTable? get weekdayTable => r == null
      ? null
      : TextTable(columns: [
          t.common.date,
          t.common.total
        ], rows: [
          for (final (i, v) in r!.byWeekday.indexed) [weekdayLabels[i], f.money(v)]
        ]);

  TextTable rankTable(List<RankedItem> items) => TextTable(columns: [
        t.ranking.name,
        t.ranking.count,
        t.common.total
      ], rows: [
        for (final x in items) [rankName(x), x.count.toInt().toString(), f.money(x.value)]
      ]);

  int get pages => totalPages(r?.rows.length ?? 0);

  /// The page being shown, kept inside the pages there are.
  int get page => pageNumber.clamp(1, pages);

  List<TxRow> get pageRows => pageSlice(r?.rows ?? const [], page);

  String assetName(TxRow tx) => assetOf(tx, kind);

  bool editable(TxRow tx) => isEditableTx(tx);

  void openDay(String date) => detail.open(f.date(date, DateStyle.full), {'start': date, 'end': date, 'counterparty': args.id});

  /// The route the back button falls back to when there is nothing to pop.
  String get backRoute => income ? '/accounts/revenue' : '/accounts/expense';
}

final counterpartyDetailViewModelProvider = Provider.autoDispose.family<CounterpartyDetailViewModel, CounterpartyDetailArgs>((ref, args) {
  ref.watch(preferencesProvider.select((p) => p.lang));
  final page = ref.read(counterpartyPageProvider(args).notifier);
  // Back to the first page when the account or the period changes.
  ref.listen(counterpartyDetailReportProvider(args), (_, __) => page.state = 1);
  return CounterpartyDetailViewModel(
    args: args,
    res: ref.watch(counterpartyDetailReportProvider(args)),
    pageNumber: ref.watch(counterpartyPageProvider(args)),
    f: ref.watch(formatterProvider),
    t: t,
    detail: ref.read(txDetailProvider.notifier),
    setPage: (p) => page.state = p,
  );
});
