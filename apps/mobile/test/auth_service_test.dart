import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/api/api_client.dart';
import 'package:spacefly_mobile/auth/auth_service.dart';
import 'package:spacefly_mobile/auth/pkce.dart';
import 'package:spacefly_mobile/config.dart';
import 'package:spacefly_mobile/storage/server_config.dart';

import 'support.dart';

void main() {
  const server = ServerConfig(apiUrl: 'https://spacefly.test');
  final pkce = Pkce('verifier-verifier-verifier-verifier-verifier-verifier-1234', challengeOf('verifier-verifier-verifier-verifier-verifier-verifier-1234'));

  ({AuthService auth, TestEnv env, FakeAdapter adapter, List<String> opened}) setup({
    required Future<String> Function(String url) browser,
    required ResponseBody Function(RequestOptions) server_,
  }) {
    final adapter = FakeAdapter(server_);
    final env = TestEnv(config: server, adapter: adapter);
    final container = env.container();
    final opened = <String>[];
    final auth = AuthService(
      dio: container.read(dioProvider),
      config: container.read(serverConfigProvider.notifier),
      authenticate: (url, scheme) {
        expect(scheme, callbackScheme);
        opened.add(url);
        return browser(url);
      },
      newPkce: () => pkce,
      newState: () => 'state-1',
    );
    return (auth: auth, env: env, adapter: adapter, opened: opened);
  }

  test('parseCallback reads code, state and error', () {
    final ok = parseCallback('spacefly://auth/callback?code=c1&state=s1');
    expect((ok.code, ok.state, ok.error), ('c1', 's1', null));
    final failed = parseCallback('spacefly://auth/callback?error=access_denied&state=s1');
    expect((failed.code, failed.error), (null, 'access_denied'));
    expect(parseCallback('garbage').code, isNull);
  });

  test('signs in: opens the PKCE login URL, trades the code and keeps the token', () async {
    final s = setup(
      browser: (_) async => 'spacefly://auth/callback?code=one-time&state=state-1',
      server_: (o) => jsonBody({'token': 'session-token', 'expiresAt': 1, 'email': 'a@b.c'}),
    );
    await s.auth.login();

    final start = Uri.parse(s.opened.single);
    expect(start.origin + start.path, 'https://spacefly.test/auth/mobile/login');
    expect(start.queryParameters, {'redirect_uri': redirectUri, 'code_challenge': pkce.challenge, 'state': 'state-1'});

    final exchange = s.adapter.requests.single;
    expect(exchange.path, '/auth/mobile/token');
    expect(exchange.data, {'code': 'one-time', 'code_verifier': pkce.verifier});
    expect(s.env.secure.values['spacefly.token'], 'session-token');
  });

  Future<String?> failureOf(AuthService auth) async {
    try {
      await auth.login();
      return null;
    } on SignInError catch (e) {
      return e.code;
    }
  }

  test('the server\'s error in the callback is the failure', () async {
    final s = setup(browser: (_) async => 'spacefly://auth/callback?error=token_exchange&state=state-1', server_: (_) => jsonBody({}));
    expect(await failureOf(s.auth), 'token_exchange');
    expect(s.adapter.requests, isEmpty);
  });

  test('a callback with another state is rejected before any request', () async {
    final s = setup(browser: (_) async => 'spacefly://auth/callback?code=c&state=other', server_: (_) => jsonBody({}));
    expect(await failureOf(s.auth), 'invalid_state');
    expect(s.adapter.requests, isEmpty);
    expect(s.env.secure.values, isEmpty);
  });

  test('closing the browser is "access_denied"; any other browser failure is "generic"', () async {
    final cancelled = setup(browser: (_) => throw PlatformException(code: 'CANCELED'), server_: (_) => jsonBody({}));
    expect(await failureOf(cancelled.auth), 'access_denied');
    final broken = setup(browser: (_) => throw PlatformException(code: 'boom'), server_: (_) => jsonBody({}));
    expect(await failureOf(broken.auth), 'generic');
  });

  test('a rejected code is "token_exchange"; Cloudflare Access blocking is "cf_access"', () async {
    String callback(_) => 'spacefly://auth/callback?code=c&state=state-1';
    final rejected = setup(browser: (u) async => callback(u), server_: (_) => jsonBody({'error': 'invalid_grant'}, 400));
    expect(await failureOf(rejected.auth), 'token_exchange');

    final forbidden = setup(browser: (u) async => callback(u), server_: (_) => jsonBody({}, 403));
    expect(await failureOf(forbidden.auth), 'cf_access');

    final loginPage = setup(browser: (u) async => callback(u), server_: (_) => htmlBody('<html>Cloudflare Access</html>'));
    expect(await failureOf(loginPage.auth), 'cf_access');

    final noToken = setup(browser: (u) async => callback(u), server_: (_) => jsonBody({'email': 'x'}));
    expect(await failureOf(noToken.auth), 'token_exchange');
    expect(noToken.env.secure.values, isEmpty);
  });

  test('logout drops the token even when the server cannot be reached', () async {
    final s = setup(browser: (_) async => '', server_: (_) => jsonBody({}, 500));
    await s.auth.config.setToken('t');
    expect(s.env.secure.values, isNotEmpty);
    await s.auth.logout();
    expect(s.env.secure.values, isEmpty);
    expect(s.adapter.requests.single.path, '/auth/logout');
  });

  group('testConnection', () {
    test('a server that answers counts, even with 401', () async {
      expect(await setup(browser: (_) async => '', server_: (_) => jsonBody({'authenticated': true})).auth.testConnection(), ConnectionResult.ok);
      expect(await setup(browser: (_) async => '', server_: (_) => jsonBody({}, 401)).auth.testConnection(), ConnectionResult.ok);
    });

    test('Cloudflare Access blocking, and an unreachable server, are told apart', () async {
      expect(await setup(browser: (_) async => '', server_: (_) => htmlBody('<html>')).auth.testConnection(), ConnectionResult.blocked);
      expect(await setup(browser: (_) async => '', server_: (_) => jsonBody({}, 403)).auth.testConnection(), ConnectionResult.blocked);
      expect(await setup(browser: (_) async => '', server_: (_) => jsonBody({}, 502)).auth.testConnection(), ConnectionResult.failed);
    });
  });
}
