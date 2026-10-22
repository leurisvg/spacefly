import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../state/filters_store.dart';
import 'api_client.dart';
import 'models.g.dart' show TxEditPayload;

enum WriteErrorKind { validation, notEditable, notFound, network, other }

/// A failed write, with what the server said: field errors (422), "not editable" (409)…
/// Port of `WriteError` in libs/client/src/api/write-api.ts.
class WriteError implements Exception {
  const WriteError(this.status, this.body);

  final int status;
  final Object? body;

  WriteErrorKind get kind {
    if (status == 422) return WriteErrorKind.validation;
    if (status == 409) return WriteErrorKind.notEditable;
    if (status == 404) return WriteErrorKind.notFound;
    return status == 0 || status == 504 ? WriteErrorKind.network : WriteErrorKind.other;
  }

  /// Field → messages, keyed like the request DTO. Empty unless this is a validation error.
  Map<String, List<String>> get fields {
    final b = body;
    if (kind != WriteErrorKind.validation || b is! Map || b['fields'] is! Map) return const {};
    return {for (final e in (b['fields'] as Map).entries) e.key.toString(): [for (final m in e.value as List) m.toString()]};
  }

  /// Why the target can't be edited here (`splits` or `type`), for a 409.
  String? get reason {
    final b = body;
    return kind == WriteErrorKind.notEditable && b is Map ? b['reason'] as String? : null;
  }

  @override
  String toString() => 'WriteError($status)';
}

/// Create / update / delete through the BFF. The server invalidates its own cache, so after each successful write this only has to nudge
/// every visible report and lookup to refetch. Port of `WriteApi`.
class WriteApi {
  WriteApi(this._dio, this._onWritten);

  final Dio _dio;
  final void Function() _onWritten;

  Future<T> _run<T>(Future<Response<T>> Function() request, {bool refresh = true}) async {
    try {
      final response = await request();
      if (refresh) _onWritten();
      return response.data as T;
    } on DioException catch (e) {
      // Cloudflare Access answering instead of the server is not a write the server refused
      if (isAccessBlocked(e)) rethrow;
      throw WriteError(e.response?.statusCode ?? 0, e.response?.data);
    }
  }

  Future<Map<String, dynamic>> get(String path) => _run(() => _dio.get<Map<String, dynamic>>('/api/$path'), refresh: false);

  Future<Map<String, dynamic>> create(String path, Object body) => _run(() => _dio.post<Map<String, dynamic>>('/api/$path', data: body));

  Future<Map<String, dynamic>> update(String path, Object body) => _run(() => _dio.put<Map<String, dynamic>>('/api/$path', data: body));

  Future<void> remove(String path) => _run(() => _dio.delete<void>('/api/$path'));

  Future<TxEditPayload> getTransaction(String id) async => TxEditPayload.fromJson(await get('transactions/${Uri.encodeComponent(id)}'));

  Future<void> createTransaction(Map<String, Object?> request) => create('transactions', request);

  Future<void> updateTransaction(String id, Map<String, Object?> request) => update('transactions/${Uri.encodeComponent(id)}', request);

  Future<void> deleteTransaction(String id) => remove('transactions/${Uri.encodeComponent(id)}');
}

final writeApiProvider = Provider<WriteApi>((ref) => WriteApi(ref.watch(dioProvider), () => ref.read(filtersProvider.notifier).refresh()));
