import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_service.dart';
import '../i18n/strings.g.dart';
import '../storage/server_config.dart';

/// The server URL and, behind Cloudflare Access, the service token. First screen of a fresh install, and reachable from the
/// login screen and the settings afterwards.
class ServerScreen extends ConsumerStatefulWidget {
  const ServerScreen({super.key});

  @override
  ConsumerState<ServerScreen> createState() => _ServerScreenState();
}

class _ServerScreenState extends ConsumerState<ServerScreen> {
  late final TextEditingController _url;
  late final TextEditingController _clientId;
  late final TextEditingController _clientSecret;
  final _form = GlobalKey<FormState>();
  bool _testing = false;

  @override
  void initState() {
    super.initState();
    final config = ref.read(serverConfigProvider);
    _url = TextEditingController(text: config.apiUrl);
    _clientId = TextEditingController(text: config.accessClientId);
    _clientSecret = TextEditingController(text: config.accessClientSecret);
  }

  @override
  void dispose() {
    _url.dispose();
    _clientId.dispose();
    _clientSecret.dispose();
    super.dispose();
  }

  Future<bool> _save() async {
    if (!_form.currentState!.validate()) return false;
    final config = ref.read(serverConfigProvider.notifier);
    await config.setApiUrl(_url.text);
    await config.setAccessCredentials(_clientId.text, _clientSecret.text);
    return true;
  }

  void _snack(String message) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));

  Future<void> _saveAndLeave() async {
    if (!await _save() || !mounted) return;
    _snack(context.t.settings.mobile.saved);
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/');
    }
  }

  Future<void> _test() async {
    final t = context.t;
    if (!await _save()) return;
    setState(() => _testing = true);
    final result = await ref.read(authServiceProvider).testConnection();
    if (!mounted) return;
    setState(() => _testing = false);
    _snack(switch (result) {
      ConnectionResult.ok => t.settings.mobile.testOk,
      ConnectionResult.blocked => t.settings.mobile.testBlocked,
      ConnectionResult.failed => t.settings.mobile.testFailed,
    });
  }

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: Text(t.settings.mobile.server)),
      body: SafeArea(
        child: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              TextFormField(
                key: const Key('server-url'),
                controller: _url,
                keyboardType: TextInputType.url,
                autocorrect: false,
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(labelText: t.settings.mobile.serverUrl, hintText: 'https://spacefly.example.com'),
                validator: (value) => normalizeServerUrl(value ?? '') == null ? t.settings.mobile.invalidUrl : null,
              ),
              const SizedBox(height: 28),
              Text(t.settings.mobile.access, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 4),
              Text(t.settings.mobile.accessHint, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
              const SizedBox(height: 16),
              TextFormField(
                controller: _clientId,
                autocorrect: false,
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(labelText: t.settings.mobile.clientId),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _clientSecret,
                obscureText: true,
                autocorrect: false,
                decoration: InputDecoration(labelText: t.settings.mobile.clientSecret),
              ),
              const SizedBox(height: 28),
              FilledButton(key: const Key('server-save'), onPressed: _testing ? null : _saveAndLeave, child: Text(t.settings.mobile.save)),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: _testing ? null : _test,
                style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(52), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                child: _testing ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2.5)) : Text(t.settings.mobile.test),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
