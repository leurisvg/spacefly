import 'dart:ui' show PlatformDispatcher;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../i18n/strings.g.dart';
import '../storage/stores.dart';
import '../theme/tokens.g.dart';

const themeKey = 'spacefly.theme';
const langKey = 'spacefly.lang';

/// The saved language if valid, else English for English devices, else Spanish.
AppLocale initialLang(String? saved, String? deviceLang) {
  if (saved == 'es') return AppLocale.es;
  if (saved == 'en') return AppLocale.en;
  return (deviceLang ?? '').toLowerCase().startsWith('en') ? AppLocale.en : AppLocale.es;
}

/// The saved theme if it is one of ours, else the default.
ThemeId initialTheme(String? saved) => ThemeId.values.where((t) => t.name == saved).firstOrNull ?? defaultThemeId;

class Preferences {
  const Preferences({required this.theme, required this.lang});
  final ThemeId theme;
  final AppLocale lang;
}

/// What is saved on the device, with the language resolved against the device's.
Preferences loadPreferences(KeyValueStore store) => Preferences(
      theme: initialTheme(store.getString(themeKey)),
      lang: initialLang(store.getString(langKey), PlatformDispatcher.instance.locale.toLanguageTag()),
    );

/// Overridden in `main()` with [loadPreferences]; slang's locale is set from it before the first frame.
final initialPreferencesProvider = Provider<Preferences>((ref) => const Preferences(theme: defaultThemeId, lang: AppLocale.es));

final preferencesProvider = NotifierProvider<PreferencesNotifier, Preferences>(PreferencesNotifier.new);

/// Theme and language, kept on the device. The language drives slang's current locale.
class PreferencesNotifier extends Notifier<Preferences> {
  @override
  Preferences build() => ref.watch(initialPreferencesProvider);

  Future<void> setTheme(ThemeId id) async {
    state = Preferences(theme: id, lang: state.lang);
    await ref.read(keyValueStoreProvider).setString(themeKey, id.name);
  }

  Future<void> setLang(AppLocale lang) async {
    await LocaleSettings.setLocale(lang);
    state = Preferences(theme: state.theme, lang: lang);
    await ref.read(keyValueStoreProvider).setString(langKey, lang.languageCode);
  }
}
