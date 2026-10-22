import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../storage/server_config.dart';

/// Cloudflare Access answers an unauthenticated API call with its HTML login page instead of JSON.
bool isAccessLoginPage(Object? body) => body is String && RegExp(r'^\s*<(!doctype|html)', caseSensitive: false).hasMatch(body);

const accessRequiredStatus = 403;
const accessRequiredMessage = 'cf_access_required';

/// Thrown (as a [DioException]'s `error`) when Cloudflare Access, not SpaceFly, answered.
bool isAccessBlocked(Object error) =>
    error is DioException && (error.response?.statusCode == accessRequiredStatus || isAccessLoginPage(error.response?.data));

/// Called on a 401 from the API while a token is set: the session expired or was revoked.
typedef OnUnauthorized = void Function();

/// The HTTP client for the SpaceFly server. The base URL is the saved server URL; the interceptors, in order:
///  1. headers: `Authorization: Bearer` and the Cloudflare Access service token (only ever sent to the server) and the CSRF
///     header the BFF requires on writes;
///  2. an Access login page, which is HTML where JSON was expected, becomes a 403 so callers see the failure it is;
///  3. a 401 on the API ends the session.
Dio buildDio({required ServerConfig Function() config, required OnUnauthorized onUnauthorized, HttpClientAdapter? adapter}) {
  final dio = Dio(BaseOptions(
    baseUrl: config().apiUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 30),
    headers: {'Accept': 'application/json'},
  ));
  if (adapter != null) dio.httpClientAdapter = adapter;

  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) {
      final c = config();
      final token = c.token;
      if (token != null) options.headers['Authorization'] = 'Bearer $token';
      if (c.hasAccessCredentials) {
        options.headers['CF-Access-Client-Id'] = c.accessClientId;
        options.headers['CF-Access-Client-Secret'] = c.accessClientSecret;
      }
      final mutating = options.method != 'GET' && options.method != 'HEAD';
      if (mutating) options.headers['X-SpaceFly'] = '1';
      handler.next(options);
    },
    onResponse: (response, handler) {
      if (isAccessLoginPage(response.data)) {
        handler.reject(DioException(
          requestOptions: response.requestOptions,
          response: Response(requestOptions: response.requestOptions, statusCode: accessRequiredStatus, statusMessage: accessRequiredMessage, data: {'error': accessRequiredMessage}),
          type: DioExceptionType.badResponse,
        ));
        return;
      }
      handler.next(response);
    },
    onError: (error, handler) {
      final path = error.requestOptions.path;
      if (error.response?.statusCode == 401 && path.startsWith('/api/') && !path.endsWith('/me') && config().signedIn) onUnauthorized();
      handler.next(error);
    },
  ));
  return dio;
}

/// Tests plug a fake adapter in here.
final dioAdapterProvider = Provider<HttpClientAdapter?>((ref) => null);

/// Rebuilt when the server URL changes; the token and credentials are read per request.
final dioProvider = Provider<Dio>((ref) {
  final url = ref.watch(serverConfigProvider.select((c) => c.apiUrl));
  final dio = buildDio(
    config: () => ref.read(serverConfigProvider).copyWith(apiUrl: url),
    onUnauthorized: () => ref.read(serverConfigProvider.notifier).setToken(null),
    adapter: ref.read(dioAdapterProvider),
  );
  ref.onDispose(dio.close);
  return dio;
});
