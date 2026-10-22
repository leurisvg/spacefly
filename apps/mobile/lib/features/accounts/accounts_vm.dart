import 'dart:ui' show Color;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/models.g.dart';
import '../../api/resources.dart';
import '../../format/formatter.dart';
import '../../format/formatter_provider.dart';
import '../../i18n/strings.g.dart';
import '../../state/preferences.dart';
import '../../ui_logic/series_colors.dart';
import '../dashboard/dashboard_vm.dart' show TextTable;

/// How many months of balance history the screen asks for.
final accountsMonthsProvider = StateProvider<String>((ref) => '12');

final accountsReportProvider = reportProvider<AccountsReport>('reports/accounts', AccountsReport.fromJson, extra: (ref) => {'months': ref.watch(accountsMonthsProvider)});

class BalanceLine {
  const BalanceLine({required this.id, required this.name, required this.values, required this.color});
  final String id;
  final String name;
  final List<double> values;
  final Color color;
}

/// Asset accounts: balances, flow and the balance history chart. Port of libs/client/src/features/accounts/accounts.vm.ts
/// (reordering and editing come with the write screens).
class AccountsViewModel {
  AccountsViewModel({required this.report, required this.months, required this.f, required this.t, required this.colors});

  final AsyncValue<AccountsReport> report;
  final String months;
  final Formatter f;
  final Translations t;
  final SeriesColors colors;

  AccountsReport? get data => report.valueOrNull;

  /// Accounts in the order the server sends them (the user's order, then largest balance first).
  List<AccountSummary> get rows => data?.accounts ?? const [];

  double? get income => data?.accounts.fold<double>(0, (s, a) => s + a.income);

  double? get expense => data?.accounts.fold<double>(0, (s, a) => s + a.expense);

  /// Balance series in the same order as the list.
  List<AccountsReportHistory> get history {
    final rank = {for (final (i, a) in rows.indexed) a.id: i};
    return [...?data?.history]..sort((a, b) => (rank[a.id] ?? 1 << 30).compareTo(rank[b.id] ?? 1 << 30));
  }

  List<BalanceLine> get lines => [for (final h in history) BalanceLine(id: h.id, name: h.name, values: h.balances, color: colors.color('account', h.id))];

  TextTable? get table {
    final r = data;
    if (r == null) return null;
    return TextTable(
      columns: [t.common.account, ...r.months.map(f.monthLabel)],
      rows: [for (final h in history) [h.name, ...h.balances.map((b) => f.compact(b))]],
    );
  }
}

final accountsViewModelProvider = Provider.autoDispose<AccountsViewModel>((ref) {
  ref.watch(preferencesProvider.select((p) => p.lang));
  return AccountsViewModel(
    report: ref.watch(accountsReportProvider),
    months: ref.watch(accountsMonthsProvider),
    f: ref.watch(formatterProvider),
    t: t,
    colors: ref.watch(seriesColorsProvider),
  );
});
