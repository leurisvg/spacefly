import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/api_client.dart';
import '../../api/models.g.dart';
import '../../api/resources.dart';
import '../../format/formatter.dart';
import '../../format/formatter_provider.dart';
import '../../i18n/strings.g.dart';
import '../../state/filters_store.dart';
import '../../state/preferences.dart';
import '../dashboard/dashboard_vm.dart' show TextTable;

/// How many accounts the ranking draws.
const counterpartyTop = 12;

/// Accounts that moved money in this or the previous period, or all of them on request.
List<CounterpartyItem> shownCounterparties(List<CounterpartyItem> items, {required bool showEmpty}) => showEmpty
    ? [...items]
    : [
        for (final i in items)
          if (i.value > 0 || i.previous > 0) i
      ];

/// The accounts that moved money in the period, biggest first, as many as the ranking draws.
List<CounterpartyItem> topCounterparties(List<CounterpartyItem> items) => [
      for (final i in items)
        if (i.value > 0) i
    ].take(counterpartyTop).toList();

String kindName(CounterpartyKind kind) => counterpartyKindValues.reverse[kind]!;

/// Where the detail of an expense or revenue account lives.
String counterpartyPath(CounterpartyKind kind, String id) => '/accounts/${kind == CounterpartyKind.INCOME ? 'revenue' : 'expense'}/${Uri.encodeComponent(id)}';

final counterpartiesShowEmptyProvider = StateProvider.autoDispose<bool>((ref) => false);

final counterpartiesReportProvider = FutureProvider.autoDispose.family<CounterpartiesReport, CounterpartyKind>((ref, kind) async {
  final params = {...ref.watch(filterQueryProvider), 'kind': kindName(kind)};
  final response = await ref.watch(dioProvider).get<Object?>('/api/reports/counterparties', queryParameters: params);
  return unwrapReport(response.data, CounterpartiesReport.fromJson);
});

/// Expense accounts (where money goes) or revenue accounts (where it comes from): their ranking, monthly trend and list.
/// Port of libs/client/src/features/accounts/counterparties.vm.ts.
class CounterpartiesViewModel {
  CounterpartiesViewModel({required this.kind, required this.res, required this.showEmpty, required this.f, required this.t, required this.setShowEmptyTo});

  final CounterpartyKind kind;
  final AsyncValue<CounterpartiesReport> res;
  final bool showEmpty;
  final Formatter f;
  final Translations t;
  final void Function(bool value) setShowEmptyTo;

  bool get income => kind == CounterpartyKind.INCOME;

  CounterpartiesReport? get r => res.valueOrNull;

  bool get initialLoading => res.isLoading && r == null;

  List<CounterpartyItem> get items => r?.items ?? const [];

  int? get active => r == null ? null : items.where((i) => i.count > 0).length;

  double? get avgTicket => r == null || r!.count == 0 ? null : r!.total / r!.count;

  List<CounterpartyItem> get shown => shownCounterparties(items, showEmpty: showEmpty);

  /// The accounts the ranking draws, biggest first.
  List<CounterpartyItem> get top => topCounterparties(items);

  TextTable? get rankTable => top.isEmpty
      ? null
      : TextTable(columns: [
          t.ranking.name,
          t.common.total,
          t.ranking.share,
          t.ranking.count
        ], rows: [
          for (final i in top) [i.name, f.money(i.value), f.pct(i.share), i.count.toInt().toString()]
        ]);

  TextTable? get monthlyTable => r == null
      ? null
      : TextTable(columns: [
          t.common.month,
          t.common.total
        ], rows: [
          for (final (i, m) in r!.months.indexed) [f.date(m, DateStyle.month), f.money(r!.monthly[i])]
        ]);

  String path(String id) => counterpartyPath(kind, id);

  /// The route that creates an account of this kind.
  String get createRoute => '/edit/account?type=${income ? 'revenue' : 'expense'}';

  String editRoute(String id) => '/edit/account/${Uri.encodeComponent(id)}';

  void setShowEmpty(bool value) => setShowEmptyTo(value);
}

final counterpartiesViewModelProvider = Provider.autoDispose.family<CounterpartiesViewModel, CounterpartyKind>((ref, kind) {
  ref.watch(preferencesProvider.select((p) => p.lang));
  final empty = ref.read(counterpartiesShowEmptyProvider.notifier);
  return CounterpartiesViewModel(
    kind: kind,
    res: ref.watch(counterpartiesReportProvider(kind)),
    showEmpty: ref.watch(counterpartiesShowEmptyProvider),
    f: ref.watch(formatterProvider),
    t: t,
    setShowEmptyTo: (v) => empty.state = v,
  );
});
