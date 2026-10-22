import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';

import '../api/api_client.dart';
import '../config.dart';
import '../storage/server_config.dart';
import 'pkce.dart';

/// A sign-in that failed; `code` is a `login.errors.*` key (`access_denied`, `invalid_state`, `token_exchange`, `cf_access`, `generic`).
class SignInError implements Exception {
  const SignInError(this.code);
  final String code;

  @override
  String toString() => 'SignInError($code)';
}

class CallbackParams {
  const CallbackParams({this.code, this.state, this.error});
  final String? code;
  final String? state;
  final String? error;
}

CallbackParams parseCallback(String url) {
  final uri = Uri.tryParse(url);
  final params = uri?.queryParameters ?? const <String, String>{};
  return CallbackParams(code: params['code'], state: params['state'], error: params['error']);
}

/// Opens the system browser on [url] and resolves with the URL it ended on (a `spacefly://…` deep link).
typedef Authenticate = Future<String> Function(String url, String callbackScheme);

Future<String> systemBrowserAuthenticate(String url, String callbackScheme) =>
    FlutterWebAuth2.authenticate(url: url, callbackUrlScheme: callbackScheme);

/// Bearer-token sign-in: PKCE in the system browser against `/auth/mobile/login`, then the one-time code is traded for the
/// session token at `/auth/mobile/token`. The token lives in the secure storage; there is no cookie.
class AuthService {
  AuthService({
    required this.dio,
    required this.config,
    required this.authenticate,
    this.newPkce = createPkce,
    this.newState = randomState,
  });

  final Dio dio;
  final ServerConfigNotifier config;
  final Authenticate authenticate;
  final Pkce Function() newPkce;
  final String Function() newState;

  Future<void> login() async {
    final pkce = newPkce();
    final state = newState();
    final start = Uri.parse('${dio.options.baseUrl}/auth/mobile/login').replace(queryParameters: {
      'redirect_uri': redirectUri,
      'code_challenge': pkce.challenge,
      'state': state,
    });

    final String callback;
    try {
      callback = await authenticate(start.toString(), callbackScheme);
    } on PlatformException catch (e) {
      throw SignInError(e.code == 'CANCELED' ? 'access_denied' : 'generic');
    } catch (_) {
      throw const SignInError('generic');
    }
    final result = parseCallback(callback);
    if (result.error != null) throw SignInError(result.error!);
    if (result.code == null || result.state != state) throw const SignInError('invalid_state');

    final String token;
    try {
      final response = await dio.post<Map<String, dynamic>>('/auth/mobile/token', data: {'code': result.code, 'code_verifier': pkce.verifier});
      final value = response.data?['token'];
      if (value is! String || value.isEmpty) throw const SignInError('token_exchange');
      token = value;
    } on SignInError {
      rethrow;
    } catch (error) {
      // Cloudflare Access (no/wrong service token) answers 403 or its HTML login page; only a rejected code is the server's token_exchange.
      throw SignInError(isAccessBlocked(error) ? 'cf_access' : 'token_exchange');
    }
    await config.setToken(token);
  }

  /// Ends the session on the server (best effort: the token is dropped locally either way).
  Future<void> logout() async {
    try {
      await dio.post<void>('/auth/logout');
    } catch (_) {
      // an expired session or an unreachable server must not keep the user signed in here
    }
    await config.setToken(null);
  }

  /// `true` when the server answers (even with 401); `false` + [accessBlocked] when Cloudflare Access did.
  Future<ConnectionResult> testConnection() async {
    try {
      await dio.get<void>('/api/me');
      return ConnectionResult.ok;
    } catch (error) {
      if (isAccessBlocked(error)) return ConnectionResult.blocked;
      if (error is DioException && error.response != null && error.response!.statusCode == 401) return ConnectionResult.ok;
      return ConnectionResult.failed;
    }
  }
}

enum ConnectionResult { ok, blocked, failed }

final authenticateProvider = Provider<Authenticate>((ref) => systemBrowserAuthenticate);

final authServiceProvider = Provider<AuthService>((ref) => AuthService(
      dio: ref.watch(dioProvider),
      config: ref.read(serverConfigProvider.notifier),
      authenticate: ref.watch(authenticateProvider),
    ));
