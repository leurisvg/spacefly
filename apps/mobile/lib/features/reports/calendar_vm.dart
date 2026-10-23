import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/models.g.dart' hide Period, PeriodPreset, Ref;
import '../../api/resources.dart';
import '../../format/formatter.dart';
import '../../format/formatter_provider.dart';
import '../../i18n/strings.g.dart';
import '../../shared/dates.dart';
import '../../state/filters_store.dart';
import '../../state/meta_store.dart';
import '../../state/preferences.dart';
import '../../state/tx_detail.dart';
import '../../ui/charts/heatmap.dart';
import '../../ui_logic/text_table.dart';

enum CalendarView { month, year }

enum CalendarFilter { account, category, tag }

/// The calendar is month-based: a period that isn't a whole month shows the month its end date falls in.
Period calendarMonth(Period period) => isFullMonth(period) ? period : Period(startOfMonth(period.end), endOfMonth(period.end));

final calendarViewProvider = StateProvider<CalendarView>((ref) => CalendarView.month);
final calendarAccountProvider = StateProvider<String>((ref) => '');
final calendarCategoryProvider = StateProvider<String>((ref) => '');
final calendarTagProvider = StateProvider<String>((ref) => '');

final _periodProvider = Provider<Period>((ref) => ref.watch(filtersProvider.select((f) => f.period)));

final calendarReportProvider = reportProvider<CalendarReport>('reports/calendar', CalendarReport.fromJson, extra: (ref) {
  if (ref.watch(calendarViewProvider) != CalendarView.month) return null;
  final month = calendarMonth(ref.watch(_periodProvider));
  final account = ref.watch(calendarAccountProvider), category = ref.watch(calendarCategoryProvider), tag = ref.watch(calendarTagProvider);
  return {
    'start': month.start,
    'end': month.end,
    if (account.isNotEmpty) 'account': account,
    if (category.isNotEmpty) 'category': category,
    if (tag.isNotEmpty) 'tag': tag,
  };
});

final yearHeatmapProvider = reportProvider<YearHeatmapReport>('reports/calendar/year', YearHeatmapReport.fromJson, extra: (ref) {
  if (ref.watch(calendarViewProvider) != CalendarView.year) return null;
  return {'year': int.parse(ref.watch(_periodProvider).end.substring(0, 4))};
});

class FilterOption {
  const FilterOption(this.value, this.label);
  final String value;
  final String label;
}

/// Calendar: a month of daily cash flow with running balance and scheduled items, or the year as a spending heatmap.
/// Port of libs/client/src/features/reports/calendar.vm.ts.
class CalendarViewModel {
  CalendarViewModel({
    required this.view,
    required this.account,
    required this.category,
    required this.tag,
    required this.period,
    required this.cal,
    required this.yearRes,
    required this.lookups,
    required this.f,
    required this.t,
    required this.detail,
    required this.today,
    required this.set,
  });

  final CalendarView view;
  final String account;
  final String category;
  final String tag;
  final Period period;
  final AsyncValue<CalendarReport> cal;
  final AsyncValue<YearHeatmapReport> yearRes;
  final Lookups? lookups;
  final Formatter f;
  final Translations t;
  final TxDetailNotifier detail;
  final String today;
  final void Function(CalendarView? view, CalendarFilter? filter, String value) set;

  Period get month => calendarMonth(period);

  int get year => int.parse(period.end.substring(0, 4));

  CalendarReport? get data => cal.valueOrNull;

  YearHeatmapReport? get yearData => yearRes.valueOrNull;

  bool get initialLoading => cal.isLoading && data == null;

  bool get yearInitialLoading => yearRes.isLoading && yearData == null;

  List<FilterOption> get accountOptions => [for (final a in lookups?.accounts ?? const <LookupItem>[]) FilterOption(a.id, a.name)];

  List<FilterOption> get categoryOptions => [FilterOption('none', t.common.uncategorized), for (final c in lookups?.categories ?? const <LookupItem>[]) FilterOption(c.id, c.name)];

  List<FilterOption> get tagOptions => [for (final x in lookups?.tags ?? const <LookupItem>[]) FilterOption(x.name, x.name)];

  /// Days with a known balance (the future has none).
  List<CalendarDay> get knownDays => [for (final d in data?.days ?? const <CalendarDay>[]) if (d.balance != null) d];

  double? get endBalance => knownDays.isEmpty ? null : knownDays.last.balance;

  /// The running balance needs the whole ledger: it makes no sense once a category or tag filters the days.
  bool get hasBalance => knownDays.isNotEmpty;

  TextTable? get dayTable {
    final days = data?.days;
    if (days == null) return null;
    return TextTable(
      columns: [t.common.date, t.common.income, t.common.expenses, t.calendar.balance],
      rows: [for (final d in days) if (d.income != 0 || d.expense != 0) [f.date(d.date, DateStyle.day), f.money(d.income), f.money(d.expense), f.money(d.balance)]],
    );
  }

  YearGridLayout? get heatmap {
    final y = yearData;
    return y == null ? null : yearGridLayout(y.year.toInt(), y.days);
  }

  TextTable? get yearTable {
    final y = yearData;
    if (y == null) return null;
    final byMonth = <String, double>{};
    for (final d in y.days) {
      byMonth[d.date.substring(0, 7)] = (byMonth[d.date.substring(0, 7)] ?? 0) + d.expense;
    }
    return TextTable(columns: [t.common.month, t.common.expenses], rows: [for (final e in byMonth.entries) [f.date(e.key, DateStyle.month), f.money(e.value)]]);
  }

  void setView(CalendarView next) => set(next, null, '');

  /// Sets one of the `account` / `category` / `tag` filters; an empty value clears it.
  void setFilter(CalendarFilter name, String value) => set(null, name, value);

  /// The transactions of a day, within the calendar's account / category / tag filters.
  void openDay(String date) {
    detail.open(f.date(date, DateStyle.full), {
      'start': date,
      'end': date,
      if (account.isNotEmpty) 'account': account,
      if (category.isNotEmpty) 'category': category,
      if (tag.isNotEmpty) 'tag': tag,
    });
  }

  /// A year heatmap tap reports the cell's data index; the cells are the days in order.
  bool openHeatmapDay(int index) {
    final days = yearData?.days;
    if (days == null || index < 0 || index >= days.length) return false;
    openDay(days[index].date);
    return true;
  }
}

final calendarViewModelProvider = Provider.autoDispose<CalendarViewModel>((ref) {
  ref.watch(preferencesProvider.select((p) => p.lang));
  // The notifiers are taken now: a closure must not use `ref` once a dependency changed and the provider has not rebuilt yet.
  final views = ref.read(calendarViewProvider.notifier);
  final accounts = ref.read(calendarAccountProvider.notifier);
  final categories = ref.read(calendarCategoryProvider.notifier);
  final tags = ref.read(calendarTagProvider.notifier);
  return CalendarViewModel(
    view: ref.watch(calendarViewProvider),
    account: ref.watch(calendarAccountProvider),
    category: ref.watch(calendarCategoryProvider),
    tag: ref.watch(calendarTagProvider),
    period: ref.watch(_periodProvider),
    cal: ref.watch(calendarReportProvider),
    yearRes: ref.watch(yearHeatmapProvider),
    lookups: ref.watch(lookupsProvider).valueOrNull,
    f: ref.watch(formatterProvider),
    t: t,
    detail: ref.read(txDetailProvider.notifier),
    today: todayIso(ref.read(clockProvider)()),
    set: (view, filter, value) {
      if (view != null) views.state = view;
      switch (filter) {
        case CalendarFilter.account:
          accounts.state = value;
        case CalendarFilter.category:
          categories.state = value;
        case CalendarFilter.tag:
          tags.state = value;
        case null:
          break;
      }
    },
  );
});
