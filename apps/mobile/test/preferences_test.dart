import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';
import 'package:spacefly_mobile/state/preferences.dart';
import 'package:spacefly_mobile/theme/tokens.g.dart';

import 'support.dart';

void main() {
  group('initialLang', () {
    test('a saved language wins', () {
      expect(initialLang('es', 'en-US'), AppLocale.es);
      expect(initialLang('en', 'es-DO'), AppLocale.en);
    });

    test('otherwise English devices get English and everyone else Spanish', () {
      expect(initialLang(null, 'en-GB'), AppLocale.en);
      expect(initialLang('fr', 'EN-us'), AppLocale.en);
      expect(initialLang(null, 'es-DO'), AppLocale.es);
      expect(initialLang(null, 'de-DE'), AppLocale.es);
      expect(initialLang(null, null), AppLocale.es);
    });
  });

  test('initialTheme falls back to the default for an unknown id', () {
    expect(initialTheme('earth'), ThemeId.earth);
    expect(initialTheme('dusk'), ThemeId.dusk);
    expect(initialTheme('frappe'), ThemeId.frappe);
    expect(initialTheme('macchiato'), ThemeId.macchiato);
    expect(initialTheme('mocha'), ThemeId.mocha);
    expect(initialTheme('neon'), defaultThemeId);
    expect(initialTheme(null), defaultThemeId);
  });

  test('loadPreferences reads the saved values', () async {
    final env = TestEnv();
    await env.prefs.setString(themeKey, 'dusk');
    await env.prefs.setString(langKey, 'en');
    final prefs = loadPreferences(env.prefs);
    expect((prefs.theme, prefs.lang), (ThemeId.dusk, AppLocale.en));
  });

  test('changing the theme and the language persists them and switches the strings', () async {
    final env = TestEnv();
    final container = env.container();
    final notifier = container.read(preferencesProvider.notifier);

    await notifier.setTheme(ThemeId.earth);
    await notifier.setLang(AppLocale.es);
    addTearDown(() => LocaleSettings.setLocale(AppLocale.en));

    expect(container.read(preferencesProvider).theme, ThemeId.earth);
    expect(container.read(preferencesProvider).lang, AppLocale.es);
    expect(env.prefs.values, {themeKey: 'earth', langKey: 'es'});
    expect(t.login.button, isNot('Sign in with Firefly'));
  });
}
