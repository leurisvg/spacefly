import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../i18n/strings.g.dart';
import '../platform/launcher_shortcuts.dart';
import '../router.dart';
import '../state/preferences.dart';

/// Where the "new transaction" shortcut leads: the form with the description ready to type in.
const newTransactionShortcutPath = '/transactions/new?focus=description';

/// Puts "New transaction" in the menu of the app's icon (hold the icon) and opens the form when it is picked. The title follows the
/// language. Mobile only: the web has no icon to hold.
class ShortcutsGate extends ConsumerStatefulWidget {
  const ShortcutsGate({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<ShortcutsGate> createState() => _ShortcutsGateState();
}

class _ShortcutsGateState extends ConsumerState<ShortcutsGate> {
  @override
  void initState() {
    super.initState();
    final shortcuts = ref.read(launcherShortcutsProvider);
    shortcuts.listen((type) {
      if (type == newTransactionShortcut && mounted) ref.read(routerProvider).go(newTransactionShortcutPath);
    });
    _publish();
  }

  void _publish() {
    // `t` follows the language the user chose, which is set before the first frame
    ref.read(launcherShortcutsProvider).set([LauncherShortcut(type: newTransactionShortcut, title: t.nav.newTransaction)]);
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(preferencesProvider.select((p) => p.lang), (_, __) => _publish());
    return widget.child;
  }
}
