import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/state/privacy_store.dart';

import 'support.dart';

void main() {
  test('starts visible and toggles', () async {
    final c = TestEnv().container();
    expect(c.read(privacyProvider), isFalse);
    await c.read(privacyProvider.notifier).toggle();
    expect(c.read(privacyProvider), isTrue);
    await c.read(privacyProvider.notifier).toggle();
    expect(c.read(privacyProvider), isFalse);
  });

  test('persists the choice across restarts', () async {
    final env = TestEnv();
    await env.container().read(privacyProvider.notifier).set(true);
    expect(env.prefs.values['spacefly.privacy'], '1');
    expect(env.container().read(privacyProvider), isTrue);
  });
}
