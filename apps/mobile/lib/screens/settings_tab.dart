import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:url_launcher/url_launcher.dart';

import '../auth/auth_service.dart';
import '../features/settings/preferences_vm.dart';
import '../i18n/strings.g.dart';
import '../state/filters_store.dart';
import '../state/meta_store.dart';
import '../state/preferences.dart';
import '../state/privacy_store.dart';
import '../storage/server_config.dart';
import '../theme/tokens.g.dart';

String themeLabel(Translations t, ThemeId id) => switch (id) {
      ThemeId.midnight => t.theme.midnight,
      ThemeId.earth => t.theme.earth,
      ThemeId.dusk => t.theme.dusk,
      ThemeId.frappe => t.theme.frappe,
      ThemeId.macchiato => t.theme.macchiato,
      ThemeId.mocha => t.theme.mocha,
    };

class SettingsTab extends ConsumerWidget {
  const SettingsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final prefs = ref.watch(preferencesProvider);
    final config = ref.watch(serverConfigProvider);
    final scheme = Theme.of(context).colorScheme;
    final meta = ref.watch(metaProvider).valueOrNull;
    final email = ref.watch(emailProvider);
    final fireflyLink = (meta?.fireflyPublicUrl ?? '').isEmpty ? null : meta!.fireflyPublicUrl;
    final titleStyle = Theme.of(context).textTheme.titleSmall?.copyWith(color: scheme.onSurfaceVariant);

    return Scaffold(
      appBar: AppBar(title: Text(t.nav.settings)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          Text(t.topbar.theme, style: titleStyle),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: [
                for (final id in ThemeId.values)
                  RadioListTile<ThemeId>(
                    key: Key('theme-${id.name}'),
                    value: id,
                    groupValue: prefs.theme,
                    onChanged: (v) => ref.read(preferencesProvider.notifier).setTheme(v!),
                    title: Text(themeLabel(t, id)),
                    secondary: _Swatch(themeTokens[id]!),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Text(t.topbar.language, style: titleStyle),
          const SizedBox(height: 8),
          SegmentedButton<AppLocale>(
            key: const Key('language'),
            showSelectedIcon: false,
            segments: [
              ButtonSegment(value: AppLocale.es, label: Text(t.lang.es)),
              ButtonSegment(value: AppLocale.en, label: Text(t.lang.en)),
            ],
            selected: {prefs.lang},
            onSelectionChanged: (v) => ref.read(preferencesProvider.notifier).setLang(v.first),
          ),
          const SizedBox(height: 20),
          Text(t.currency.label, style: titleStyle),
          const SizedBox(height: 8),
          SegmentedButton<String>(
            key: const Key('display-currency'),
            showSelectedIcon: false,
            segments: [for (final c in ref.watch(currenciesProvider)) ButtonSegment(value: c.code, label: Text(c.code))],
            selected: {ref.watch(currencyProvider)},
            onSelectionChanged: (v) => ref.read(filtersProvider.notifier).setCurrency(v.first),
          ),
          const SizedBox(height: 12),
          Card(
            child: SwitchListTile(
              key: const Key('privacy-switch'),
              title: Text(t.topbar.hideAmounts),
              value: ref.watch(privacyProvider),
              onChanged: (v) => ref.read(privacyProvider.notifier).set(v),
            ),
          ),
          const SizedBox(height: 20),
          Text(t.settings.mobile.server, style: titleStyle),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const Icon(Icons.dns_outlined),
              title: Text(config.apiUrl),
              subtitle: Text(email.isEmpty ? t.settings.mobile.signedIn : '${t.settings.mobile.signedIn} · $email'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/server'),
            ),
          ),
          const SizedBox(height: 20),
          Text(t.settings.preferences, style: titleStyle),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: [
                ListTile(
                  key: const Key('server-settings-link'),
                  leading: const Icon(Icons.tune),
                  title: Text(t.settings.preferences),
                  subtitle: Text(t.settings.excluded),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/settings/server'),
                ),
                const Divider(),
                ListTile(
                  key: const Key('exchange-rates-link'),
                  leading: const Icon(Icons.currency_exchange),
                  title: Text(t.settings.exchange.title),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/settings/exchange-rates'),
                ),
                const Divider(),
                ListTile(
                  key: const Key('refresh'),
                  leading: ref.watch(refreshingProvider) ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.5)) : const Icon(Icons.refresh),
                  title: Text(t.topbar.refresh),
                  onTap: ref.watch(refreshingProvider) ? null : () => ref.read(refreshingProvider.notifier).refresh(),
                ),
                if (fireflyLink != null) ...[
                  const Divider(),
                  ListTile(
                    key: const Key('open-firefly'),
                    leading: const Icon(Icons.open_in_new),
                    title: Text(t.topbar.openFirefly),
                    onTap: () => launchUrl(Uri.parse(fireflyLink), mode: LaunchMode.externalApplication),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 20),
          OutlinedButton.icon(
            key: const Key('logout'),
            onPressed: () => ref.read(authServiceProvider).logout(),
            icon: const Icon(Icons.logout),
            label: Text(t.topbar.logout),
            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(52), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
          ),
        ],
      ),
    );
  }
}

/// Page color with the accent as a dot: the same preview the web theme picker shows.
class _Swatch extends StatelessWidget {
  const _Swatch(this.tokens);
  final ThemeTokens tokens;

  @override
  Widget build(BuildContext context) => Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(color: tokens.background, shape: BoxShape.circle, border: Border.all(color: tokens.chartAxis)),
        alignment: Alignment.center,
        child: Container(width: 12, height: 12, decoration: BoxDecoration(color: tokens.accent, shape: BoxShape.circle)),
      );
}
