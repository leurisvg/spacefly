import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../i18n/strings.g.dart';
import '../router.dart';
import '../ui_logic/fold.dart';

/// What the view-models ask of the app that is not about data: tell the user something, ask them to confirm, go back.
/// The Flutter counterpart of the tokens in libs/client/src/platform; tests plug in recording fakes.

/// A short message over the current screen.
abstract class Toast {
  void success(String message);
  void error(String message);
}

class Confirmation {
  const Confirmation({required this.title, required this.message, required this.confirmLabel, this.destructive = false, this.requireText});
  final String title;
  final String message;
  final String confirmLabel;
  final bool destructive;

  /// Text the user has to type to be allowed to confirm (an account's name); `null` for a plain confirmation.
  final String? requireText;
}

abstract class Confirm {
  Future<bool> confirm(Confirmation request);
}

abstract class BackNavigation {
  /// Pops the screen, or goes to [fallback] when there is nothing to pop (a deep link).
  void back(String fallback);
}

/// Hands a text file to the platform's share sheet (the CSV the user wants to keep or send).
abstract class FileShare {
  Future<void> shareText({required String fileName, required String text, String mimeType = 'text/csv'});
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
      builder: (context) => _ConfirmDialog(request: request, scheme: scheme),
    );
    return answer ?? false;
  }
}

class _ConfirmDialog extends StatefulWidget {
  const _ConfirmDialog({required this.request, required this.scheme});

  final Confirmation request;
  final ColorScheme scheme;

  @override
  State<_ConfirmDialog> createState() => _ConfirmDialogState();
}

class _ConfirmDialogState extends State<_ConfirmDialog> {
  final _typed = TextEditingController();

  @override
  void dispose() {
    _typed.dispose();
    super.dispose();
  }

  /// The typed text matches when accents, case and surrounding spaces are ignored, as on the web.
  bool get _allowed => widget.request.requireText == null || fold(_typed.text.trim()) == fold(widget.request.requireText!.trim());

  @override
  Widget build(BuildContext context) {
    final request = widget.request;
    return AlertDialog(
      title: Text(request.title),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(request.message),
          if (request.requireText != null) ...[
            const SizedBox(height: 16),
            Text(context.t.forms.confirm.typeToConfirm(text: request.requireText!)),
            const SizedBox(height: 8),
            TextField(key: const Key('confirm-text'), controller: _typed, autofocus: true, autocorrect: false, onChanged: (_) => setState(() {})),
          ],
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(false), child: Text(context.t.forms.cancel)),
        FilledButton(
          key: const Key('confirm-ok'),
          onPressed: _allowed ? () => Navigator.of(context).pop(true) : null,
          style: request.destructive ? FilledButton.styleFrom(backgroundColor: widget.scheme.error, foregroundColor: widget.scheme.onError, minimumSize: const Size(88, 44)) : const ButtonStyle(minimumSize: WidgetStatePropertyAll(Size(88, 44))),
          child: Text(request.confirmLabel),
        ),
      ],
    );
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

class SystemFileShare implements FileShare {
  @override
  Future<void> shareText({required String fileName, required String text, String mimeType = 'text/csv'}) async {
    // The share sheet takes a file: it goes to the temporary folder first.
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/$fileName');
    await file.writeAsString(text);
    await Share.shareXFiles([XFile(file.path, mimeType: mimeType, name: fileName)], fileNameOverrides: [fileName]);
  }
}

final toastProvider = Provider<Toast>((ref) => SnackBarToast());
final confirmProvider = Provider<Confirm>((ref) => DialogConfirm());
final fileShareProvider = Provider<FileShare>((ref) => SystemFileShare());
final backNavigationProvider = Provider<BackNavigation>((ref) => RouterBackNavigation(ref.read(routerProvider)));
