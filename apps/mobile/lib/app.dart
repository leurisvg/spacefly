import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'i18n/strings.g.dart';
import 'router.dart';
import 'state/preferences.dart';
import 'theme/app_theme.dart';

class SpaceflyApp extends ConsumerWidget {
  const SpaceflyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final prefs = ref.watch(preferencesProvider);
    return MaterialApp.router(
      title: 'SpaceFly',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(prefs.theme),
      locale: prefs.lang.flutterLocale,
      supportedLocales: AppLocaleUtils.supportedLocales,
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      routerConfig: ref.watch(routerProvider),
    );
  }
}
