import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../storage/stores.dart';

const privacyKey = 'spacefly.privacy';

/// Privacy mode: while on, every monetary amount is shown as 0 so nobody looking at the screen can read it. Persisted locally so a
/// restart doesn't expose the numbers again. Port of libs/client/src/state/privacy.store.ts.
final privacyProvider = NotifierProvider<PrivacyNotifier, bool>(PrivacyNotifier.new);

class PrivacyNotifier extends Notifier<bool> {
  @override
  bool build() => ref.read(keyValueStoreProvider).getString(privacyKey) == '1';

  Future<void> toggle() => set(!state);

  Future<void> set(bool hidden) async {
    state = hidden;
    await ref.read(keyValueStoreProvider).setString(privacyKey, hidden ? '1' : '0');
  }
}
