import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/api/api_client.dart';
import 'package:spacefly_mobile/storage/server_config.dart';

import 'support.dart';

void main() {
  const signedIn = ServerConfig(apiUrl: 'https://spacefly.test', token: 'tok', accessClientId: 'cf-id', accessClientSecret: 'cf-secret');

  Dio dio(ServerConfig config, FakeAdapter adapter, {void Function()? onUnauthorized}) =>
      buildDio(config: () => config, onUnauthorized: onUnauthorized ?? () {}, adapter: adapter);

  test('sends the bearer token and the Access service token to the server', () async {
    final adapter = FakeAdapter((_) => jsonBody({'ok': true}));
    await dio(signedIn, adapter).get<void>('/api/meta');
    final request = adapter.requests.single;
    expect(request.uri.toString(), 'https://spacefly.test/api/meta');
    expect(request.headers['Authorization'], 'Bearer tok');
    expect(request.headers['CF-Access-Client-Id'], 'cf-id');
    expect(request.headers['CF-Access-Client-Secret'], 'cf-secret');
    expect(request.headers.containsKey('X-SpaceFly'), isFalse);
  });

  test('sends no credentials it does not have, and the CSRF header on writes', () async {
    final adapter = FakeAdapter((_) => jsonBody({}));
    await dio(const ServerConfig(apiUrl: 'https://spacefly.test'), adapter).post<void>('/auth/mobile/token', data: {'a': 1});
    final headers = adapter.requests.single.headers;
    expect(headers.containsKey('Authorization'), isFalse);
    expect(headers.containsKey('CF-Access-Client-Id'), isFalse);
    expect(headers['X-SpaceFly'], '1');
  });

  test('Access\' HTML login page becomes a 403 instead of a parse problem', () async {
    final adapter = FakeAdapter((_) => htmlBody('<!DOCTYPE html><html>Sign in</html>'));
    await expectLater(
      dio(signedIn, adapter).get<void>('/api/meta'),
      throwsA(isA<DioException>().having((e) => e.response?.statusCode, 'status', 403).having(isAccessBlocked, 'blocked', true)),
    );
  });

  test('a 401 from the API ends the session, except on /api/me', () async {
    var expired = 0;
    final adapter = FakeAdapter((_) => jsonBody({'error': 'unauthorized'}, 401));
    final client = dio(signedIn, adapter, onUnauthorized: () => expired++);

    await expectLater(client.get<void>('/api/transactions'), throwsA(isA<DioException>()));
    expect(expired, 1);
    await expectLater(client.get<void>('/api/me'), throwsA(isA<DioException>()));
    expect(expired, 1);
  });

  test('a 401 while signed out is not a session ending', () async {
    var expired = 0;
    final adapter = FakeAdapter((_) => jsonBody({}, 401));
    await expectLater(dio(const ServerConfig(apiUrl: 'https://spacefly.test'), adapter, onUnauthorized: () => expired++).get<void>('/api/x'), throwsA(isA<DioException>()));
    expect(expired, 0);
  });

  test('isAccessLoginPage only matches HTML documents', () {
    expect(isAccessLoginPage('  <html><body/></html>'), isTrue);
    expect(isAccessLoginPage('<!doctype html>'), isTrue);
    expect(isAccessLoginPage('{"a":1}'), isFalse);
    expect(isAccessLoginPage({'a': 1}), isFalse);
    expect(isAccessLoginPage(null), isFalse);
  });
}
