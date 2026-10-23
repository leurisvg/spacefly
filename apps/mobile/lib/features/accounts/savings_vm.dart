import 'dart:ui' show Color;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/models.g.dart';
import '../../api/resources.dart';
import '../../format/formatter.dart';
import '../../format/formatter_provider.dart';
import '../../i18n/strings.g.dart';
import '../../state/preferences.dart';
import '../../ui_logic/series_colors.dart';

/// How many months the savings screen asks for until the user picks another length.
const savingsMonths = '12';

final savingsMonthsProvider = StateProvider<String>((ref) => savingsMonths);

final savingsReportProvider = reportProvider<SavingsSeries>('reports/savings', SavingsSeries.fromJson, extra: (ref) => {'months': ref.watch(savingsMonthsProvider)});

/// The sum of every account's balance, month by month. Port of `savingsTotals` in libs/client/src/features/accounts/savings.vm.ts.
List<double> savingsTotals(SavingsSeries series) => [
      for (var i = 0; i < series.months.length; i++) series.accounts.fold<double>(0, (sum, a) => sum + (i < a.balances.length ? a.balances[i] : 0)),
    ];

/// Savings accounts: their balances over time, and the total of them all. Port of libs/client/src/features/accounts/savings.vm.ts.
class SavingsViewModel {
  SavingsViewModel({required this.res, required this.months, required this.f, required this.t, required this.colors, required this.setMonthsTo});

  final AsyncValue<SavingsSeries> res;
  final String months;
  final Formatter f;
  final Translations t;
  final SeriesColors colors;
  final void Function(String months) setMonthsTo;

  SavingsSeries? get data => res.valueOrNull;

  bool get initialLoading => res.isLoading && data == null;

  List<double>? get totals => data == null ? null : savingsTotals(data!);

  double? get total => totals?.isEmpty ?? true ? null : totals!.last;

  double? get first => totals?.isEmpty ?? true ? null : totals!.first;

  /// The color of an account's chart: the same one it has everywhere else.
  Color colorOf(String accountId) => colors.color('account', accountId);

  void setMonths(String next) => setMonthsTo(next);
}

final savingsViewModelProvider = Provider.autoDispose<SavingsViewModel>((ref) {
  ref.watch(preferencesProvider.select((p) => p.lang));
  final months = ref.read(savingsMonthsProvider.notifier);
  return SavingsViewModel(
    res: ref.watch(savingsReportProvider),
    months: ref.watch(savingsMonthsProvider),
    f: ref.watch(formatterProvider),
    t: t,
    colors: ref.watch(seriesColorsProvider),
    setMonthsTo: (m) => months.state = m,
  );
});
