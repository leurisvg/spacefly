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
    expect(guard(server, '/settings'), '/login?returnTo=%2Fsettings');
    expect(guard(server, '/login'), isNull);
    expect(guard(server, '/server'), isNull);
  });

  test('the login screen remembers where the user was, query included, and leads back there', () {
    expect(guard(server, '/reports/flow?mode=tags&threshold=2.5'), '/login?returnTo=%2Freports%2Fflow%3Fmode%3Dtags%26threshold%3D2.5');
    expect(guard(signedIn, '/login?returnTo=%2Freports%2Fflow%3Fmode%3Dtags'), '/reports/flow?mode=tags');
    expect(guard(signedIn, '/login?returnTo=%2Ftransactions%2F5'), '/transactions/5');
  });

  test('a returnTo that is not a place of the app leads home', () {
    for (final bad in [null, '', 'https://evil.test', '//evil.test', 'reports/flow', '/login', '/login?returnTo=/x', '/server']) {
      expect(safeReturnTo(bad), '/', reason: '$bad');
    }
    expect(safeReturnTo('/accounts/12?tab=deposit'), '/accounts/12?tab=deposit');
  });

  test('signed in, the login screen leads home and the rest stays', () {
    expect(guard(signedIn, '/login'), '/');
    expect(guard(signedIn, '/'), isNull);
    expect(guard(signedIn, '/accounts'), isNull);
    expect(guard(signedIn, '/server'), isNull);
  });
}
