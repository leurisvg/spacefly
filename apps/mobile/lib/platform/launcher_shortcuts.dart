import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quick_actions/quick_actions.dart';

/// The type of the shortcut that opens a new transaction.
const newTransactionShortcut = 'new_transaction';

/// One entry of the menu that opens when the app's icon is held (Android's app shortcuts, iOS's quick actions).
class LauncherShortcut {
  const LauncherShortcut({required this.type, required this.title});
  final String type;
  final String title;
}

/// What the app asks of the launcher: put these entries in the icon's menu, and say which one was picked (also when it was the one
/// that started the app). Tests plug in a recording fake.
abstract class LauncherShortcuts {
  /// Starts listening: [onPick] is called with the `type` of the entry the user picked.
  void listen(void Function(String type) onPick);

  Future<void> set(List<LauncherShortcut> shortcuts);
}

class SystemLauncherShortcuts implements LauncherShortcuts {
  final _quickActions = const QuickActions();

  @override
  void listen(void Function(String type) onPick) => _quickActions.initialize(onPick);

  @override
  Future<void> set(List<LauncherShortcut> shortcuts) => _quickActions.setShortcutItems([
        for (final s in shortcuts) ShortcutItem(type: s.type, localizedTitle: s.title, icon: 'ic_shortcut_add'),
      ]);
}

final launcherShortcutsProvider = Provider<LauncherShortcuts>((ref) => SystemLauncherShortcuts());
