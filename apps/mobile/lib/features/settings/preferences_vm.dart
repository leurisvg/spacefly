import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/api_client.dart';
import '../../i18n/strings.g.dart';
import '../../platform/platform.dart';
import '../../state/filters_store.dart';

/// Drops the server cache and refetches every visible report, telling the user. Port of `refresh` in
/// libs/client/src/features/settings/preferences.vm.ts (language, theme, currency and privacy are in their own stores).
final refreshingProvider = NotifierProvider<RefreshNotifier, bool>(RefreshNotifier.new);

class RefreshNotifier extends Notifier<bool> {
  @override
  bool build() => false;

  Future<void> refresh() async {
    state = true;
    try {
      await ref.read(dioProvider).post<void>('/api/refresh');
      ref.read(filtersProvider.notifier).refresh();
      ref.read(toastProvider).success(t.topbar.refreshed);
    } catch (_) {
      ref.read(toastProvider).error(t.errors.generic);
    } finally {
      state = false;
    }
  }
}
