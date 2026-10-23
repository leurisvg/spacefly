import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../state/filters_store.dart';
import '../storage/server_config.dart';
import '../theme/app_theme.dart';

/// How long the app has to have been away for the data to be asked for again when it comes back.
const resumeRefreshAfter = Duration(minutes: 5);

/// The time of day for the lifecycle, replaceable in tests.
final lifecycleClockProvider = Provider<DateTime Function()>((ref) => DateTime.now);

/// Whether the app covers itself while it is not active (the app switcher takes its picture of iOS then). Android keeps the amounts out
/// of its recent-apps thumbnail natively (MainActivity), and covering there would flash on every pulled-down shade.
final coverWhenInactiveProvider = Provider<bool>((ref) => defaultTargetPlatform == TargetPlatform.iOS);

/// Asks the server to drop its cache and refetches every visible report. Failing (no connection) is not an error: what is on screen stays.
Future<void> refreshQuietly(T Function<T>(ProviderListenable<T> provider) read) async {
  try {
    await read(dioProvider).post<void>('/api/refresh');
  } on DioException {
    // offline or the server is away: the reports still refetch, and keep what they show if that fails too
  }
  read(filtersProvider.notifier).refresh();
}

/// Wraps the app to look after what happens when it leaves the screen and comes back: after [resumeRefreshAfter] away it refetches
/// its data (a screen left open for hours would show yesterday's), and where the app switcher takes a picture it shows a plain
/// cover instead of the amounts.
class AppLifecycleGate extends ConsumerStatefulWidget {
  const AppLifecycleGate({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<AppLifecycleGate> createState() => _AppLifecycleGateState();
}

class _AppLifecycleGateState extends ConsumerState<AppLifecycleGate> with WidgetsBindingObserver {
  DateTime? _leftAt;
  bool _covered = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.inactive:
        if (ref.read(coverWhenInactiveProvider)) setState(() => _covered = true);
      case AppLifecycleState.paused || AppLifecycleState.hidden || AppLifecycleState.detached:
        _leftAt ??= ref.read(lifecycleClockProvider)();
      case AppLifecycleState.resumed:
        if (_covered) setState(() => _covered = false);
        final leftAt = _leftAt;
        _leftAt = null;
        if (leftAt != null && ref.read(serverConfigProvider).signedIn && ref.read(lifecycleClockProvider)().difference(leftAt) >= resumeRefreshAfter) {
          refreshQuietly(ref.read);
        }
    }
  }

  @override
  Widget build(BuildContext context) => Stack(
        children: [
          widget.child,
          if (_covered) Positioned.fill(child: ColoredBox(key: const Key('privacy-cover'), color: Theme.of(context).scaffoldBackgroundColor, child: Center(child: Icon(Icons.rocket_launch_outlined, size: 56, color: context.tokens.chartMuted)))),
        ],
      );
}
