import 'dart:ui' show Color;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/api_client.dart';
import '../../api/models.g.dart';
import '../../api/resources.dart';
import '../../format/formatter.dart';
import '../../format/formatter_provider.dart';
import '../../i18n/strings.g.dart';
import '../../platform/platform.dart';
import '../../state/filters_store.dart';
import '../../state/preferences.dart';
import '../../ui_logic/series_colors.dart';
import '../../ui_logic/text_table.dart';

/// How many months of balance history the screen asks for.
final accountsMonthsProvider = StateProvider<String>((ref) => '12');

final accountsReportProvider = reportProvider<AccountsReport>('reports/accounts', AccountsReport.fromJson, extra: (ref) => {'months': ref.watch(accountsMonthsProvider)});

/// `order` with `id` moved one place up (-1) or down (1); unchanged at the ends or for an unknown id.
List<String> moveId(List<String> order, String id, int delta) {
  final next = [...order];
  final from = next.indexOf(id);
  final to = from + delta;
  if (from < 0 || to < 0 || to >= next.length) return next;
  final moved = next[from];
  next[from] = next[to];
  next[to] = moved;
  return next;
}

/// `order` after dropping `id` on `targetId`: dragging down lands after the target, dragging up before it.
List<String> dropId(List<String> order, String id, String targetId) {
  if (id == targetId) return [...order];
  final from = order.indexOf(id);
  final rest = [
    for (final x in order)
      if (x != id) x
  ];
  rest.insert(rest.indexOf(targetId) + (from < order.indexOf(targetId) ? 1 : 0), id);
  return rest;
}

/// The order the user gave the accounts on this screen, until the screen goes; `null` is the server's own order.
final accountOrderProvider = StateProvider.autoDispose<List<String>?>((ref) => null);

/// Whether the list is in "reorder" mode.
final accountsReorderingProvider = StateProvider.autoDispose<bool>((ref) => false);

class BalanceLine {
  const BalanceLine({required this.id, required this.name, required this.values, required this.color});
  final String id;
  final String name;
  final List<double> values;
  final Color color;
}

/// Asset accounts: balances, flow, a user-defined order and the balance history chart. Port of
/// libs/client/src/features/accounts/accounts.vm.ts.
class AccountsViewModel {
  AccountsViewModel({
    required this.report,
    required this.months,
    required this.f,
    required this.t,
    required this.colors,
    required this.order,
    required this.reordering,
    required this.write,
  });

  final AsyncValue<AccountsReport> report;
  final String months;
  final Formatter f;
  final Translations t;
  final SeriesColors colors;

  /// The order the user gave, or `null` for the server's.
  final List<String>? order;
  final bool reordering;

  /// What the screen does to its own state and the server: set the order (and save it), pick "reorder" mode, go back to the default order.
  final AccountsActions write;

  AccountsReport? get data => report.valueOrNull;

  /// Accounts in the order shown: the user's, then whatever it does not name (the server's order is the user's order, then largest
  /// balance first).
  List<AccountSummary> get rows {
    final all = data?.accounts ?? const <AccountSummary>[];
    final o = order;
    if (o == null) return all;
    final byId = {for (final a in all) a.id: a};
    return [
      for (final id in o)
        if (byId.containsKey(id)) byId[id]!,
      for (final a in all)
        if (!o.contains(a.id)) a
    ];
  }

  List<String> get ids => [for (final a in rows) a.id];

  void setReordering(bool on) => write.setReordering(on);

  /// Moves an account one place up (-1) or down (1).
  Future<void> move(String id, int delta) async {
    final next = moveId(ids, id, delta);
    if (_changed(next)) await write.save(next);
  }

  /// Drops the row at [from] where Flutter's reorderable list says ([to] is its index before the dragged row is taken out).
  Future<void> reorder(int from, int to) async {
    final list = ids;
    if (from < 0 || from >= list.length) return;
    final target = list[(to > from ? to - 1 : to).clamp(0, list.length - 1)];
    final next = dropId(list, list[from], target);
    if (_changed(next)) await write.save(next);
  }

  bool _changed(List<String> next) {
    final current = ids;
    return next.length != current.length ||
        [
          for (final (i, x) in next.indexed)
            if (x != current[i]) x
        ].isNotEmpty;
  }

  /// Back to the default order (largest balance first).
  Future<void> reset() => write.reset();

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
      rows: [
        for (final h in history) [h.name, ...h.balances.map((b) => f.compact(b))]
      ],
    );
  }
}

class AccountsActions {
  const AccountsActions({required this.save, required this.reset, required this.setReordering});
  final Future<void> Function(List<String> order) save;
  final Future<void> Function() reset;
  final void Function(bool on) setReordering;
}

final accountsViewModelProvider = Provider.autoDispose<AccountsViewModel>((ref) {
  ref.watch(preferencesProvider.select((p) => p.lang));
  // The notifiers and services are taken now: a closure must not use `ref` once a dependency changed and the provider has not rebuilt yet.
  final orders = ref.read(accountOrderProvider.notifier);
  final modes = ref.read(accountsReorderingProvider.notifier);
  final dio = ref.read(dioProvider);
  final toast = ref.read(toastProvider);
  final filters = ref.read(filtersProvider.notifier);
  Future<void> put(List<String> order) => dio.put<void>('/api/settings/account-order', data: {'order': order});
  return AccountsViewModel(
    report: ref.watch(accountsReportProvider),
    months: ref.watch(accountsMonthsProvider),
    f: ref.watch(formatterProvider),
    t: t,
    colors: ref.watch(seriesColorsProvider),
    order: ref.watch(accountOrderProvider),
    reordering: ref.watch(accountsReorderingProvider),
    write: AccountsActions(
      save: (next) async {
        orders.state = next;
        try {
          await put(next);
        } catch (_) {
          toast.error(t.errors.generic);
        }
      },
      reset: () async {
        try {
          await put(const []);
          orders.state = null;
          filters.refresh();
        } catch (_) {
          toast.error(t.errors.generic);
        }
      },
      setReordering: (on) => modes.state = on,
    ),
  );
});
