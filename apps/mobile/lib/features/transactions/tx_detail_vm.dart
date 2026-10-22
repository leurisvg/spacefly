import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/api_client.dart';
import '../../api/models.g.dart' hide Period;
import '../../api/resources.dart';
import '../../state/filters_store.dart';
import '../../shared/dates.dart' show Period;
import '../../state/tx_detail.dart';
import 'explorer_vm.dart';

class TxGroup {
  TxGroup({required this.key, required this.type, required this.category});
  final String key;
  final String type;
  final String? category;

  /// Signed: expenses count negative.
  double total = 0;
  final List<TxRow> rows = [];
}

/// Groups by type and category, biggest absolute total first.
List<TxGroup> groupTransactions(List<TxRow> rows) {
  final map = <String, TxGroup>{};
  for (final tx in rows) {
    final key = '${tx.type}|${tx.category?.id ?? ''}';
    final g = map.putIfAbsent(key, () => TxGroup(key: key, type: tx.type, category: tx.category?.name));
    g.total += signedAmount(tx);
    g.rows.add(tx);
  }
  return map.values.toList()..sort((a, b) => b.total.abs().compareTo(a.total.abs()));
}

/// The transactions behind the open [TxDetailRequest].
final txDetailListProvider = FutureProvider.autoDispose<TxListResponse?>((ref) async {
  final req = ref.watch(txDetailProvider);
  if (req == null) return null;
  final period = ref.watch(filtersProvider.select((f) => f.period));
  final params = <String, Object>{
    'currency': ref.watch(currencyProvider),
    '_r': ref.watch(filtersProvider.select((f) => f.refreshTick)),
    'start': req.filter['start'] ?? period.start,
    'end': req.filter['end'] ?? period.end,
  };
  for (final e in req.filter.entries) {
    if (e.value.isNotEmpty) params[e.key] = e.value;
  }
  final response = await ref.watch(dioProvider).get<Object?>('/api/transactions', queryParameters: params);
  return unwrapReport(response.data, TxListResponse.fromJson);
});

/// The transactions behind a tapped chart element or row (`txDetailProvider`), grouped.
/// Port of libs/client/src/features/transactions/tx-detail.vm.ts.
class TxDetailViewModel {
  TxDetailViewModel({required this.request, required this.list, required this.period, required this.notifier});

  final TxDetailRequest? request;
  final AsyncValue<TxListResponse?> list;
  final Period period;
  final TxDetailNotifier notifier;

  bool get isOpen => request != null;

  ({String start, String end}) get range => (start: request?.filter['start'] ?? period.start, end: request?.filter['end'] ?? period.end);

  TxListResponse? get data => list.valueOrNull;

  List<TxGroup> get groups => groupTransactions(data?.rows ?? const []);

  bool isActiveRange(TxRange r) => r.start == range.start && r.end == range.end;

  /// Narrows a grouped request down to one of its members, keeping the same period and type.
  void drill(BreakdownRow row) {
    final filter = request?.filter ?? const {};
    notifier.open(row.name, {
      'category': row.id ?? 'none',
      if ((filter['type'] ?? '').isNotEmpty) 'type': filter['type']!,
      if ((filter['start'] ?? '').isNotEmpty) 'start': filter['start']!,
      if ((filter['end'] ?? '').isNotEmpty) 'end': filter['end']!,
    });
  }
}

final txDetailViewModelProvider = Provider.autoDispose<TxDetailViewModel>((ref) => TxDetailViewModel(
      request: ref.watch(txDetailProvider),
      list: ref.watch(txDetailListProvider),
      period: ref.watch(filtersProvider.select((f) => f.period)),
      notifier: ref.read(txDetailProvider.notifier),
    ));
