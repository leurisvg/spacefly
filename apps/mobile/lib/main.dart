import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'i18n/strings.g.dart';
import 'state/preferences.dart';
import 'storage/server_config.dart';
import 'storage/stores.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = PrefsKeyValueStore(await SharedPreferences.getInstance());
  final secure = SecureCredentialStore();
  final config = await loadServerConfig(prefs, secure);
  final preferences = loadPreferences(prefs);
  LocaleSettings.setLocale(preferences.lang);

  runApp(TranslationProvider(
    child: ProviderScope(
      overrides: [
        keyValueStoreProvider.overrideWithValue(prefs),
        credentialStoreProvider.overrideWithValue(secure),
        initialServerConfigProvider.overrideWithValue(config),
        initialPreferencesProvider.overrideWithValue(preferences),
      ],
      child: const SpaceflyApp(),
    ),
  ));
}
