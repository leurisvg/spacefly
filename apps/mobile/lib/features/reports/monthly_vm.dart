import 'dart:math' as math;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/models.g.dart' hide Period, PeriodPreset, Ref;
import '../../api/resources.dart';
import '../../format/formatter.dart';
import '../../format/formatter_provider.dart';
import '../../i18n/strings.g.dart';
import '../../state/preferences.dart';
import '../../state/tx_detail.dart';
import '../../ui_logic/names.dart';

/// How a category compares with the previous period. A zero baseline is "new" (no meaningful percentage).
class CategoryChange {
  const CategoryChange({required this.isNew, required this.delta, required this.ratio, required this.up});

  final bool isNew;

  /// Current minus previous total.
  final double delta;

  /// |delta| relative to the previous total; 0 when new.
  final double ratio;
  final bool up;

  @override
  bool operator ==(Object other) => other is CategoryChange && other.isNew == isNew && other.delta == delta && other.ratio == ratio && other.up == up;

  @override
  int get hashCode => Object.hash(isNew, delta, ratio, up);

  @override
  String toString() => 'CategoryChange(isNew: $isNew, delta: $delta, ratio: $ratio, up: $up)';
}

CategoryChange categoryChange({required double total, required double previous}) {
  final delta = total - previous;
  return CategoryChange(isNew: previous == 0, delta: delta, ratio: previous == 0 ? 0 : (delta / previous).abs(), up: delta > 0);
}

/// A category's total as a percentage of the largest one, for the little bar under its name.
double relativeWidth(double total, double maxAbs) => total.abs() / maxAbs * 100;

final monthlyReportProvider = reportProvider<MonthlyReport>('reports/monthly', MonthlyReport.fromJson);

/// The daily cash flow of the period, for the calendar under the categories.
final monthlyCalendarProvider = reportProvider<CalendarReport>('reports/calendar', CalendarReport.fromJson);

/// The asset accounts whose top transactions are unfolded.
final monthlyExpandedProvider = StateProvider.autoDispose<Set<String>>((ref) => const {});

/// The email report, interactive: same sections, same order, any period. Port of libs/client/src/features/reports/monthly.vm.ts
/// (the money flow is a link to its own screen on the phone).
class MonthlyViewModel {
  MonthlyViewModel({required this.res, required this.calendar, required this.expanded, required this.toggle, required this.f, required this.t, required this.detail});

  final AsyncValue<MonthlyReport> res;
  final AsyncValue<CalendarReport> calendar;
  final Set<String> expanded;
  final void Function(Set<String> next) toggle;
  final Formatter f;
  final Translations t;
  final TxDetailNotifier detail;

  MonthlyReport? get d => res.valueOrNull;

  bool get initialLoading => res.isLoading && d == null;

  double get maxAbs => math.max(1, (d?.categories ?? const <CategoryRow>[]).fold<double>(0, (m, c) => math.max(m, c.total.value.abs())));

  double relative(CategoryRow c) => relativeWidth(c.total.value, maxAbs);

  CategoryChange change(CategoryRow c) => categoryChange(total: c.total.value, previous: c.previous);

  void toggleAsset(String id) {
    final next = {...expanded};
    if (!next.remove(id)) next.add(id);
    toggle(next);
  }

  void openCategory(CategoryRow c) => detail.open(entityName(t, c.name, c.id), {'category': c.id ?? 'none'});

  void openBudget(BudgetRow b) => detail.open(b.name, {'type': 'withdrawal', 'budget': b.id});

  void openDay(String date) => detail.open(f.date(date, DateStyle.full), {'start': date, 'end': date});
}

final monthlyViewModelProvider = Provider.autoDispose<MonthlyViewModel>((ref) {
  ref.watch(preferencesProvider.select((p) => p.lang));
  final expanded = ref.read(monthlyExpandedProvider.notifier);
  return MonthlyViewModel(
    res: ref.watch(monthlyReportProvider),
    calendar: ref.watch(monthlyCalendarProvider),
    expanded: ref.watch(monthlyExpandedProvider),
    toggle: (next) => expanded.state = next,
    f: ref.watch(formatterProvider),
    t: t,
    detail: ref.read(txDetailProvider.notifier),
  );
});
