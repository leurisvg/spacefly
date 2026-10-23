import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';
import 'package:spacefly_mobile/storage/server_config.dart';
import 'package:spacefly_mobile/ui/lifecycle_gate.dart';

import 'fixtures.dart';
import 'support.dart';

void main() {
  setUpAll(initFormats);
  setUp(() => LocaleSettings.setLocaleSync(AppLocale.en));

  var now = DateTime(2026, 9, 15, 10);
  setUp(() => now = DateTime(2026, 9, 15, 10));

  FakeAdapter server({int refreshStatus = 204}) => FakeAdapter((o) => switch ('${o.method} ${o.path}') {
        'GET /api/meta' => jsonBody(metaJson()),
        'GET /api/lookups' => jsonBody(lookupsJson()),
        'GET /api/reports/dashboard' => jsonBody(report(dashboardJson())),
        'POST /api/refresh' => refreshStatus == 204 ? ResponseBody.fromString('', 204) : jsonBody({}, refreshStatus),
        _ => jsonBody({'error': 'not_found'}, 404),
      });

  int count(TestEnv env, String path, [String method = 'GET']) => env.adapter!.requests.where((r) => r.path == path && r.method == method).length;

  Future<TestEnv> open(WidgetTester tester, {ServerConfig config = signedInConfig, int refreshStatus = 204, bool cover = false}) async {
    final env = TestEnv(config: config, adapter: server(refreshStatus: refreshStatus));
    await env.pumpApp(tester, [lifecycleClockProvider.overrideWithValue(() => now), coverWhenInactiveProvider.overrideWithValue(cover)]);
    return env;
  }

  Future<void> away(WidgetTester tester, Duration time) async {
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    now = now.add(time);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();
  }

  testWidgets('coming back after a while asks the server to drop its cache and refetches what is on screen', (tester) async {
    final env = await open(tester);
    final before = count(env, '/api/reports/dashboard');
    await away(tester, const Duration(minutes: 10));
    expect(count(env, '/api/refresh', 'POST'), 1);
    expect(count(env, '/api/reports/dashboard'), greaterThan(before));
  });

  testWidgets('coming back quickly leaves the data alone', (tester) async {
    final env = await open(tester);
    final before = count(env, '/api/reports/dashboard');
    await away(tester, const Duration(minutes: 1));
    expect(count(env, '/api/refresh', 'POST'), 0);
    expect(count(env, '/api/reports/dashboard'), before);
  });

  testWidgets('a refresh that fails (no connection) still refetches and does not bother the user', (tester) async {
    final env = await open(tester, refreshStatus: 500);
    final before = count(env, '/api/reports/dashboard');
    await away(tester, const Duration(hours: 2));
    expect(count(env, '/api/refresh', 'POST'), 1);
    expect(count(env, '/api/reports/dashboard'), greaterThan(before));
    expect(env.toast.messages, isEmpty);
    expect(tester.takeException(), isNull);
  });

  testWidgets('with no session there is nothing to refresh', (tester) async {
    final env = await open(tester, config: const ServerConfig(apiUrl: 'https://spacefly.test'));
    await away(tester, const Duration(hours: 2));
    expect(count(env, '/api/refresh', 'POST'), 0);
  });

  testWidgets('where the app switcher takes a picture, the app covers itself while it is not active', (tester) async {
    await open(tester, cover: true);
    expect(find.byKey(const Key('privacy-cover')), findsNothing);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    await tester.pump();
    expect(find.byKey(const Key('privacy-cover')), findsOneWidget);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pump();
    expect(find.byKey(const Key('privacy-cover')), findsNothing);
  });

  testWidgets('elsewhere it never covers', (tester) async {
    await open(tester, cover: false);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    await tester.pump();
    expect(find.byKey(const Key('privacy-cover')), findsNothing);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
  });

  testWidgets('pull to refresh says how it went', (tester) async {
    final env = await open(tester);
    await tester.fling(find.byKey(const Key('dashboard')), const Offset(0, 400), 1000);
    await tester.pumpAndSettle();
    expect(env.toast.messages.single.message, 'Data refreshed from Firefly');
  });

  testWidgets('pull to refresh refetches even when the server can not be reached, and says so', (tester) async {
    final env = await open(tester, refreshStatus: 500);
    final before = count(env, '/api/reports/dashboard');
    await tester.fling(find.byKey(const Key('dashboard')), const Offset(0, 400), 1000);
    await tester.pumpAndSettle();
    expect(env.toast.messages.single.kind, 'error');
    expect(count(env, '/api/reports/dashboard'), greaterThan(before));
  });
}
