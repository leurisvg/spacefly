import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_service.dart';
import '../i18n/strings.g.dart';

String loginErrorText(Translations t, String code) => switch (code) {
      'invalid_state' => t.login.errors.invalidState,
      'token_exchange' => t.login.errors.tokenExchange,
      'access_denied' => t.login.errors.accessDenied,
      'cf_access' => t.login.errors.cfAccess,
      _ => t.login.errors.generic,
    };

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  bool _busy = false;
  String? _error;

  Future<void> _login() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authServiceProvider).login();
      // the router sees the new token and leaves this screen
    } on SignInError catch (e) {
      if (mounted) setState(() => _error = e.code);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Icon(Icons.rocket_launch_outlined, size: 56, color: scheme.primary),
                  const SizedBox(height: 16),
                  Text('SpaceFly', textAlign: TextAlign.center, style: text.headlineLarge?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Text(t.login.subtitle, textAlign: TextAlign.center, style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant)),
                  const SizedBox(height: 32),
                  if (_error != null) ...[
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(color: scheme.error.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(12), border: Border.all(color: scheme.error.withValues(alpha: 0.5))),
                      child: Text(loginErrorText(t, _error!), key: const Key('login-error'), style: TextStyle(color: scheme.onSurface)),
                    ),
                    const SizedBox(height: 16),
                  ],
                  FilledButton(
                    onPressed: _busy ? null : _login,
                    child: _busy ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2.5)) : Text(t.login.button),
                  ),
                  const SizedBox(height: 8),
                  TextButton(onPressed: _busy ? null : () => context.push('/server'), child: Text(t.settings.mobile.server)),
                  const SizedBox(height: 16),
                  Text(t.login.readOnly, key: const Key('login-note'), textAlign: TextAlign.center, style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
