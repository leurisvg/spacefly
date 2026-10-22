import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../state/filters_store.dart';
import '../state/meta_store.dart';
import '../state/preferences.dart';
import '../state/privacy_store.dart';
import 'formatter.dart';

/// Rebuilt when the language, the display currency, the server's currencies or privacy mode change.
final formatterProvider = Provider<Formatter>((ref) => Formatter(
      languageCode: ref.watch(preferencesProvider.select((p) => p.lang.languageCode)),
      currency: ref.watch(currencyProvider),
      currencies: ref.watch(currenciesProvider),
      hidden: ref.watch(privacyProvider),
    ));
