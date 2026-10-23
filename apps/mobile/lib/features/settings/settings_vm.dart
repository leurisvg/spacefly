import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/api_client.dart';
import '../../api/models.g.dart' hide Ref;
import '../../api/write_api.dart';
import '../../i18n/strings.g.dart';
import '../../platform/platform.dart';

/// `excluded` with [id] added or removed.
List<String> toggleId(List<String> excluded, String id, bool on) {
  final set = {...excluded};
  if (on) {
    set.add(id);
  } else {
    set.remove(id);
  }
  return set.toList();
}

/// The balance history windows (months) the server accepts: 2–60.
bool isValidBalanceMonths(int months) => months >= 2 && months <= 60;

final settingsResponseProvider = FutureProvider.autoDispose<SettingsResponse>((ref) async {
  final response = await ref.watch(dioProvider).get<Map<String, dynamic>>('/api/settings');
  return SettingsResponse.fromJson(response.data!);
});

class SettingsState {
  const SettingsState({this.draft, this.saving = false});

  /// What is being edited: a copy of the server's settings.
  final UserSettings? draft;
  final bool saving;

  SettingsState copyWith({UserSettings? draft, bool? saving}) => SettingsState(draft: draft ?? this.draft, saving: saving ?? this.saving);
}

UserSettings _copyOf(UserSettings s) => UserSettings(accountOrder: [...s.accountOrder], balanceMonths: s.balanceMonths, excludedAccounts: [...s.excludedAccounts], sankeyThreshold: s.sankeyThreshold);

/// Server-side settings: excluded accounts, balance window and Sankey threshold. The draft starts again from the server's whenever it is
/// loaded again. Port of libs/client/src/features/settings/settings.vm.ts.
final settingsProvider = NotifierProvider.autoDispose<SettingsNotifier, SettingsState>(SettingsNotifier.new);

class SettingsNotifier extends AutoDisposeNotifier<SettingsState> {
  @override
  SettingsState build() {
    final loaded = ref.watch(settingsResponseProvider).valueOrNull;
    return SettingsState(draft: loaded == null ? null : _copyOf(loaded.settings));
  }

  void patch({List<String>? excludedAccounts, double? balanceMonths, double? sankeyThreshold}) {
    final d = state.draft;
    if (d == null) return;
    state = state.copyWith(
      draft: UserSettings(
        accountOrder: d.accountOrder,
        balanceMonths: balanceMonths ?? d.balanceMonths,
        excludedAccounts: excludedAccounts ?? d.excludedAccounts,
        sankeyThreshold: sankeyThreshold ?? d.sankeyThreshold,
      ),
    );
  }

  void toggleExcluded(String id, bool excluded) {
    final d = state.draft;
    if (d != null) patch(excludedAccounts: toggleId(d.excludedAccounts, id, excluded));
  }

  Future<void> save() async {
    final d = state.draft;
    if (d == null) return;
    state = state.copyWith(saving: true);
    try {
      await ref.read(writeApiProvider).update('settings', d.toJson());
      ref.read(toastProvider).success(t.settings.saved);
    } catch (_) {
      ref.read(toastProvider).error(t.errors.generic);
    } finally {
      state = state.copyWith(saving: false);
    }
  }
}
