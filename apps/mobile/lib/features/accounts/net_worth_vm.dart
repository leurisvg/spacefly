import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/models.g.dart';
import '../../api/resources.dart';
import '../../format/formatter.dart';
import '../../format/formatter_provider.dart';
import '../../i18n/strings.g.dart';
import '../../state/preferences.dart';
import '../../ui_logic/series_colors.dart';
import '../dashboard/dashboard_vm.dart' show TextTable;
import 'accounts_vm.dart' show BalanceLine;

/// How many months the net worth screen asks for until the user picks another length.
const netWorthMonths = '24';

final netWorthMonthsProvider = StateProvider.autoDispose<String>((ref) => netWorthMonths);

final netWorthReportProvider = reportProvider<NetWorthReport>('reports/net-worth', NetWorthReport.fromJson, extra: (ref) => {'months': ref.watch(netWorthMonthsProvider)});

/// The accounts that were ever positive, with their negative balances clamped to zero: liabilities are not stacked.
/// Port of `stackedAccounts` in libs/client/src/features/accounts/net-worth.vm.ts.
List<({String id, String name, List<double> balances})> stackedAccounts(List<ByAccount> accounts) => [
      for (final a in accounts)
        if (a.balances.any((b) => b > 0)) (id: a.id, name: a.name, balances: [for (final b in a.balances) b > 0 ? b : 0.0]),
    ];

/// Net worth over time: the total, and the accounts it is made of. Port of libs/client/src/features/accounts/net-worth.vm.ts.
class NetWorthViewModel {
  NetWorthViewModel({required this.res, required this.months, required this.f, required this.t, required this.colors, required this.setMonthsTo});

  final AsyncValue<NetWorthReport> res;
  final String months;
  final Formatter f;
  final Translations t;
  final SeriesColors colors;
  final void Function(String months) setMonthsTo;

  NetWorthReport? get r => res.valueOrNull;

  bool get initialLoading => res.isLoading && r == null;

  double? get first => r == null || r!.total.isEmpty ? null : r!.total.first;

  /// The stacked bands, one per account that was ever positive.
  List<BalanceLine> get stackLines => [for (final a in stackedAccounts(r?.byAccount ?? const [])) BalanceLine(id: a.id, name: a.name, values: a.balances, color: colors.color('account', a.id))];

  TextTable? get table {
    final report = r;
    if (report == null) return null;
    return TextTable(
      columns: [t.common.account, ...report.months.map(f.monthLabel)],
      rows: [
        for (final a in report.byAccount) [a.name, ...a.balances.map((b) => f.compact(b))],
        [t.common.total, ...report.total.map((v) => f.compact(v))],
      ],
    );
  }

  void setMonths(String next) => setMonthsTo(next);
}

final netWorthViewModelProvider = Provider.autoDispose<NetWorthViewModel>((ref) {
  ref.watch(preferencesProvider.select((p) => p.lang));
  final months = ref.read(netWorthMonthsProvider.notifier);
  return NetWorthViewModel(
    res: ref.watch(netWorthReportProvider),
    months: ref.watch(netWorthMonthsProvider),
    f: ref.watch(formatterProvider),
    t: t,
    colors: ref.watch(seriesColorsProvider),
    setMonthsTo: (m) => months.state = m,
  );
});
