import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/router.dart';
import 'package:spacefly_mobile/storage/server_config.dart';

void main() {
  const none = ServerConfig();
  const server = ServerConfig(apiUrl: 'https://spacefly.test');
  const signedIn = ServerConfig(apiUrl: 'https://spacefly.test', token: 't');

  test('without a server URL everything leads to the server screen', () {
    expect(guard(none, '/'), '/server');
    expect(guard(none, '/login'), '/server');
    expect(guard(none, '/server'), isNull);
    expect(guard(const ServerConfig(apiUrl: 'not a url'), '/'), '/server');
  });

  test('with a server but no session, the app is the login screen (the server screen stays reachable)', () {
    expect(guard(server, '/'), '/login');
    expect(guard(server, '/settings'), '/login');
    expect(guard(server, '/login'), isNull);
    expect(guard(server, '/server'), isNull);
  });

  test('signed in, the login screen leads home and the rest stays', () {
    expect(guard(signedIn, '/login'), '/');
    expect(guard(signedIn, '/'), isNull);
    expect(guard(signedIn, '/accounts'), isNull);
    expect(guard(signedIn, '/server'), isNull);
  });
}
