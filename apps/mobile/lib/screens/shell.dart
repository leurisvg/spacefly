import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../i18n/strings.g.dart';
import '../state/meta_store.dart';
import 'app_tab.dart';

/// The signed-in frame: the five tabs in a NavigationBar, each tab keeping its own navigation stack. A Firefly that is too old for
/// SpaceFly says so above them, as the web's shell does.
class Shell extends ConsumerWidget {
  const Shell({super.key, required this.shell});
  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final meta = ref.watch(metaProvider).valueOrNull;
    final outdated = meta != null && !meta.fireflyVersionOk;
    return Scaffold(
      body: outdated
          ? Column(
              children: [
                Material(
                  key: const Key('version-banner'),
                  color: Theme.of(context).colorScheme.errorContainer,
                  child: SafeArea(
                    bottom: false,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                      child: Row(
                        children: [
                          Icon(Icons.warning_amber_rounded, size: 18, color: Theme.of(context).colorScheme.onErrorContainer),
                          const SizedBox(width: 8),
                          Expanded(child: Text(t.errors.version(version: meta.fireflyVersion, min: meta.minFireflyVersion), style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onErrorContainer))),
                        ],
                      ),
                    ),
                  ),
                ),
                // The banner already sits under the status bar: the tabs' own app bars must not leave room for it again.
                Expanded(child: MediaQuery.removePadding(context: context, removeTop: true, child: shell)),
              ],
            )
          : shell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: shell.currentIndex,
        onDestinationSelected: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
        destinations: [
          for (final tab in AppTab.values) NavigationDestination(icon: Icon(tab.icon), selectedIcon: Icon(tab.selectedIcon), label: tab.label(t)),
        ],
      ),
    );
  }
}
