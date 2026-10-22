import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/api_client.dart';
import '../../api/models.g.dart';
import '../../state/filters_store.dart';

enum TxViewState { ready, notEditable, missing, error }

/// One stored transaction: what it says and whether SpaceFly can edit it. The loading state is the provider's own `AsyncLoading`.
/// Port of libs/client/src/features/transactions/tx-view.vm.ts (deleting comes with the write screens).
class TxViewResult {
  const TxViewResult(this.state, {this.tx, this.reason});

  final TxViewState state;
  final TxEditPayload? tx;

  /// Why it can't be edited here (`splits` or `type`), for a 409.
  final String? reason;
}

/// Refetched after any write (the refresh tick), so a transaction that was just edited is not shown as it was.
final txViewProvider = FutureProvider.autoDispose.family<TxViewResult, String>((ref, id) async {
  ref.watch(filtersProvider.select((f) => f.refreshTick));
  try {
    final response = await ref.watch(dioProvider).get<Map<String, dynamic>>('/api/transactions/${Uri.encodeComponent(id)}');
    return TxViewResult(TxViewState.ready, tx: TxEditPayload.fromJson(response.data!));
  } on DioException catch (e) {
    final status = e.response?.statusCode;
    if (status == 409) {
      final body = e.response?.data;
      return TxViewResult(TxViewState.notEditable, reason: body is Map ? body['reason'] as String? : null);
    }
    return TxViewResult(status == 404 ? TxViewState.missing : TxViewState.error);
  }
});
