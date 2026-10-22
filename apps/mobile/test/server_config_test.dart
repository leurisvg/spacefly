import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/storage/server_config.dart';

import 'support.dart';

void main() {
  group('normalizeServerUrl', () {
    test('trims, drops trailing slashes and keeps a path', () {
      expect(normalizeServerUrl('  https://spacefly.example.com/ '), 'https://spacefly.example.com');
      expect(normalizeServerUrl('http://10.0.2.2:3100'), 'http://10.0.2.2:3100');
      expect(normalizeServerUrl('https://example.com/spacefly//'), 'https://example.com/spacefly');
      expect(normalizeServerUrl('HTTPS://Example.com'), 'HTTPS://Example.com');
    });

    test('rejects what is not an http(s) URL', () {
      for (final bad in ['', 'example.com', 'ftp://example.com', 'https://', 'https://exa mple.com', 'https://example.com?x=1', 'spacefly://auth/callback']) {
        expect(normalizeServerUrl(bad), isNull, reason: bad);
      }
    });
  });

  group('ServerConfigNotifier', () {
    test('saves the URL normalized and refuses a bad one', () async {
      final env = TestEnv();
      final container = env.container();
      final notifier = container.read(serverConfigProvider.notifier);

      expect(await notifier.setApiUrl('nope'), isFalse);
      expect(container.read(serverConfigProvider).configured, isFalse);

      expect(await notifier.setApiUrl('https://spacefly.example.com/'), isTrue);
      expect(container.read(serverConfigProvider).apiUrl, 'https://spacefly.example.com');
      expect(env.prefs.values['spacefly.apiUrl'], 'https://spacefly.example.com');
    });

    test('keeps the token and the Access credentials in the secure store, and removes them when emptied', () async {
      final env = TestEnv();
      final container = env.container();
      final notifier = container.read(serverConfigProvider.notifier);

      await notifier.setToken('abc');
      await notifier.setAccessCredentials(' id ', ' secret ');
      expect(container.read(serverConfigProvider).signedIn, isTrue);
      expect(container.read(serverConfigProvider).hasAccessCredentials, isTrue);
      expect(env.secure.values, {'spacefly.token': 'abc', 'spacefly.cf.clientId': 'id', 'spacefly.cf.clientSecret': 'secret'});
      expect(env.prefs.values, isEmpty);

      await notifier.setToken(null);
      await notifier.setAccessCredentials('', '');
      expect(env.secure.values, isEmpty);
      expect(container.read(serverConfigProvider).signedIn, isFalse);
    });

    test('loadServerConfig reads what was saved', () async {
      final env = TestEnv();
      await env.prefs.setString('spacefly.apiUrl', 'https://a.example.com');
      await env.secure.write('spacefly.token', 'tok');
      final config = await loadServerConfig(env.prefs, env.secure);
      expect((config.apiUrl, config.token, config.configured), ('https://a.example.com', 'tok', true));
    });
  });
}
