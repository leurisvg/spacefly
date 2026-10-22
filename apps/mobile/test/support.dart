import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/api/api_client.dart';
import 'package:spacefly_mobile/app.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';
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

/// The stores and overrides every test shares: in-memory storage, no real browser.
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
