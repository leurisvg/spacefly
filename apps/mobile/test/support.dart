import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/api/api_client.dart';
import 'package:spacefly_mobile/app.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:spacefly_mobile/state/filters_store.dart';
import 'package:spacefly_mobile/state/preferences.dart';
import 'package:spacefly_mobile/storage/server_config.dart';
import 'package:spacefly_mobile/storage/stores.dart';
import 'package:spacefly_mobile/theme/tokens.g.dart';

/// Answers every request from [handler] and remembers what it was asked.
class FakeAdapter implements HttpClientAdapter {
  FakeAdapter(this.handler);
  final ResponseBody Function(RequestOptions options) handler;
  final List<RequestOptions> requests = [];

  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<Uint8List>? requestStream, Future<void>? cancelFuture) async {
    requests.add(options);
    return handler(options);
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody jsonBody(Object body, [int status = 200]) =>
    ResponseBody.fromString(jsonEncode(body), status, headers: {Headers.contentTypeHeader: ['application/json']});

ResponseBody htmlBody(String html, [int status = 200]) => ResponseBody.fromString(html, status, headers: {Headers.contentTypeHeader: ['text/html']});

/// Loads the month and weekday names of every locale; call from `setUpAll`.
Future<void> initFormats() => initializeDateFormatting();

/// A signed-in config for tests that talk to the (fake) API.
const signedInConfig = ServerConfig(apiUrl: 'https://spacefly.test', token: 't');

/// "Today" in the tests: Tuesday 2026-09-15.
DateTime fixedNow() => DateTime.utc(2026, 9, 15, 12);

/// A fake server: [routes] maps a path (without query) to the JSON it answers with (a [ResponseBody] is passed through).
/// Unknown paths answer 404.
FakeAdapter fakeServer(Map<String, Object> routes) => FakeAdapter((o) {
      final route = routes[o.path];
      if (route == null) return jsonBody({'error': 'not_found'}, 404);
      return route is ResponseBody ? route : jsonBody(route);
    });

/// `{ meta, data }`, the envelope of the report endpoints.
Map<String, Object> report(Object data) => {'meta': {}, 'data': data};

/// The stores and overrides every test shares: in-memory storage, a fixed clock, no real browser.
class TestEnv {
  TestEnv({ServerConfig config = const ServerConfig(), Preferences? preferences, this.adapter})
      : prefs = MemoryKeyValueStore(),
        secure = MemoryCredentialStore(),
        initialConfig = config,
        initialPrefs = preferences ?? const Preferences(theme: defaultThemeId, lang: AppLocale.en);

  final MemoryKeyValueStore prefs;
  final MemoryCredentialStore secure;
  final ServerConfig initialConfig;
  final Preferences initialPrefs;
  final FakeAdapter? adapter;

  List<Override> get overrides => [
        keyValueStoreProvider.overrideWithValue(prefs),
        credentialStoreProvider.overrideWithValue(secure),
        initialServerConfigProvider.overrideWithValue(initialConfig),
        initialPreferencesProvider.overrideWithValue(initialPrefs),
        clockProvider.overrideWithValue(fixedNow),
        if (adapter != null) dioAdapterProvider.overrideWithValue(adapter),
      ];

  ProviderContainer container([List<Override> extra = const []]) {
    final c = ProviderContainer(overrides: [...overrides, ...extra]);
    addTearDown(c.dispose);
    return c;
  }

  /// Mounts the app. slang updates its provider asynchronously, so the tree is unmounted before the next test sets a locale.
  Future<void> pumpApp(WidgetTester tester, [List<Override> extra = const []]) async {
    addTearDown(() async {
      await tester.pumpWidget(const SizedBox());
      await LocaleSettings.setLocale(AppLocale.en);
    });
    await LocaleSettings.setLocale(initialPrefs.lang);
    await tester.pumpWidget(TranslationProvider(child: ProviderScope(overrides: [...overrides, ...extra], child: const SpaceflyApp())));
    await tester.pumpAndSettle();
  }
}
