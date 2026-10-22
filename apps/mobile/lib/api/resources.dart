import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../state/filters_store.dart';
import 'api_client.dart';

typedef Json = Map<String, dynamic>;

/// A `/api/reports/*` (or other enveloped) answer: `{ meta, data }`.
T unwrapReport<T>(Object? body, T Function(Json) parse) {
  if (body is! Map) throw const FormatException('Unexpected answer from the server');
  return parse((body['data'] as Map).cast<String, dynamic>());
}

/// A provider for a `/api/…` endpoint parameterised by the global filters (period, currency, refresh tick) plus optional extra
/// params. Return `null` from [extra] to pause the request. While a new request is in flight the previous value stays available
/// (`valueOrNull`), so screens don't flash.
AutoDisposeFutureProvider<T> reportProvider<T>(String path, T Function(Json) parse, {Map<String, Object>? Function(Ref ref)? extra}) {
  return FutureProvider.autoDispose<T>((ref) async {
    final more = extra == null ? const <String, Object>{} : extra(ref);
    if (more == null) throw const PausedRequest();
    final params = {...ref.watch(filterQueryProvider), ...more};
    final response = await ref.watch(dioProvider).get<Object?>('/api/$path', queryParameters: params);
    return unwrapReport(response.data, parse);
  });
}

/// Thrown by a paused [reportProvider]; a screen treats it as "nothing to show yet".
class PausedRequest implements Exception {
  const PausedRequest();
}

/// Invalidates the server's cache and refetches every visible report (pull to refresh).
Future<void> refreshAll(WidgetRef ref) async {
  await ref.read(dioProvider).post<void>('/api/refresh');
  ref.read(filtersProvider.notifier).refresh();
}

String describeError(Object error) {
  if (error is DioException) return error.response?.statusCode?.toString() ?? error.type.name;
  return error.toString();
}
