import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../i18n/strings.g.dart';
import '../router.dart';

/// What the view-models ask of the app that is not about data: tell the user something, ask them to confirm, go back.
/// The Flutter counterpart of the tokens in libs/client/src/platform; tests plug in recording fakes.

/// A short message over the current screen.
abstract class Toast {
  void success(String message);
  void error(String message);
}

class Confirmation {
  const Confirmation({required this.title, required this.message, required this.confirmLabel, this.destructive = false});
  final String title;
  final String message;
  final String confirmLabel;
  final bool destructive;
}

abstract class Confirm {
  Future<bool> confirm(Confirmation request);
}

abstract class BackNavigation {
  /// Pops the screen, or goes to [fallback] when there is nothing to pop (a deep link).
  void back(String fallback);
}

final rootMessengerKey = GlobalKey<ScaffoldMessengerState>(debugLabel: 'root messenger');

class SnackBarToast implements Toast {
  void _show(String message, {bool error = false}) {
    final messenger = rootMessengerKey.currentState;
    if (messenger == null) return;
    messenger.hideCurrentSnackBar();
    final ctx = rootNavigatorKey.currentContext;
    final scheme = ctx == null ? null : Theme.of(ctx).colorScheme;
    messenger.showSnackBar(SnackBar(content: Text(message), backgroundColor: error ? scheme?.errorContainer : null));
  }

  @override
  void success(String message) => _show(message);

  @override
  void error(String message) => _show(message, error: true);
}

class DialogConfirm implements Confirm {
  @override
  Future<bool> confirm(Confirmation request) async {
    final ctx = rootNavigatorKey.currentContext;
    if (ctx == null) return false;
    final scheme = Theme.of(ctx).colorScheme;
    final answer = await showDialog<bool>(
      context: ctx,
      builder: (context) => AlertDialog(
        title: Text(request.title),
        content: Text(request.message),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: Text(context.t.forms.cancel)),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: request.destructive ? FilledButton.styleFrom(backgroundColor: scheme.error, foregroundColor: scheme.onError, minimumSize: const Size(88, 44)) : const ButtonStyle(minimumSize: WidgetStatePropertyAll(Size(88, 44))),
            child: Text(request.confirmLabel),
          ),
        ],
      ),
    );
    return answer ?? false;
  }
}

class RouterBackNavigation implements BackNavigation {
  RouterBackNavigation(this._router);
  final GoRouter _router;

  @override
  void back(String fallback) {
    if (_router.canPop()) {
      _router.pop();
    } else {
      _router.go(fallback);
    }
  }
}

final toastProvider = Provider<Toast>((ref) => SnackBarToast());
final confirmProvider = Provider<Confirm>((ref) => DialogConfirm());
final backNavigationProvider = Provider<BackNavigation>((ref) => RouterBackNavigation(ref.read(routerProvider)));
