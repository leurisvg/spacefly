import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/auth/auth_service.dart';
import 'package:spacefly_mobile/screens/settings_tab.dart';
import 'package:spacefly_mobile/screens/login_screen.dart';
import 'package:spacefly_mobile/storage/server_config.dart';
import 'package:spacefly_mobile/theme/tokens.g.dart';

import 'fixtures.dart';
import 'support.dart';

void main() {
  FakeAdapter server() => FakeAdapter((o) => switch (o.path) {
        '/auth/mobile/token' => jsonBody({'token': 'session', 'expiresAt': 0, 'email': 'a@b.c'}),
        '/auth/logout' => ResponseBody.fromString('', 204),
        '/api/meta' => jsonBody(metaJson()),
        '/api/lookups' => jsonBody(lookupsJson()),
        '/api/reports/dashboard' => jsonBody(report(dashboardJson())),
        '/api/reports/accounts' => jsonBody(report(accountsJson())),
        '/api/transactions' => jsonBody(report({'rows': [txJson()], 'totals': {'income': 0, 'expense': 100, 'transfer': 0}})),
        _ => jsonBody({'authenticated': true}),
      });

  Authenticate browser(List<String> opened) => (url, _) async {
        opened.add(url);
        return 'spacefly://auth/callback?code=c&state=${Uri.parse(url).queryParameters['state']}';
      };

  testWidgets('first run: server → login → tabs → settings → sign out', (tester) async {
    final opened = <String>[];
    final env = TestEnv(adapter: server());
    await env.pumpApp(tester, [authenticateProvider.overrideWithValue(browser(opened))]);

    // no server yet: the server screen, and a bad URL is refused
    expect(find.byKey(const Key('server-url')), findsOneWidget);
    await tester.enterText(find.byKey(const Key('server-url')), 'nope');
    await tester.tap(find.byKey(const Key('server-save')));
    await tester.pumpAndSettle();
    expect(find.text('Enter a valid URL (https://…).'), findsOneWidget);

    await tester.enterText(find.byKey(const Key('server-url')), 'https://spacefly.test/');
    await tester.tap(find.byKey(const Key('server-save')));
    await tester.pumpAndSettle();
    expect(env.prefs.values['spacefly.apiUrl'], 'https://spacefly.test');

    // login screen, then the PKCE login in the "browser"
    expect(find.text('Sign in with Firefly'), findsOneWidget);
    await tester.tap(find.text('Sign in with Firefly'));
    await tester.pumpAndSettle();
    expect(Uri.parse(opened.single).path, '/auth/mobile/login');
    expect(env.secure.values['spacefly.token'], 'session');

    // the shell with its four tabs
    for (final label in ['Dashboard', 'Transactions', 'Accounts', 'Settings']) {
      expect(find.text(label), findsWidgets, reason: label);
    }
    await tester.tap(find.text('Settings'));
    await tester.pumpAndSettle();

    // theme and language
    await tester.tap(find.byKey(const Key('theme-earth')));
    await tester.pumpAndSettle();
    expect(env.prefs.values['spacefly.theme'], 'earth');
    expect(Theme.of(tester.element(find.byKey(const Key('language')))).colorScheme.primary, themeEarth.accent);

    await tester.tap(find.text('Español'));
    await tester.pumpAndSettle();
    expect(env.prefs.values['spacefly.lang'], 'es');
    expect(find.text('Ajustes'), findsWidgets);

    // sign out returns to the login screen
    await tester.pump(const Duration(seconds: 5)); // the "saved" snackbar from the server screen
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.byKey(const Key('logout')), 100, scrollable: find.descendant(of: find.byType(SettingsTab), matching: find.byType(Scrollable)));
    await tester.drag(find.byType(ListView), const Offset(0, -150));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('logout')));
    await tester.pumpAndSettle();
    expect(env.secure.values.containsKey('spacefly.token'), isFalse);
    expect(find.byType(LoginScreen), findsOneWidget);
  });

  testWidgets('a failed sign-in shows its message and stays on the login screen', (tester) async {
    final env = TestEnv(config: const ServerConfig(apiUrl: 'https://spacefly.test'), adapter: server());
    await env.pumpApp(tester, [authenticateProvider.overrideWithValue((_, __) async => 'spacefly://auth/callback?error=access_denied')]);

    await tester.tap(find.text('Sign in with Firefly'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('login-error')), findsOneWidget);
    expect(find.text('Authorization was cancelled in Firefly.'), findsOneWidget);
    expect(env.secure.values, isEmpty);
  });

  testWidgets('a stored session opens straight on the dashboard tab', (tester) async {
    final env = TestEnv(config: const ServerConfig(apiUrl: 'https://spacefly.test', token: 't'), adapter: server());
    await env.pumpApp(tester);
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.byType(LoginScreen), findsNothing);
  });

  testWidgets('a session that expires (401) sends the user back to login', (tester) async {
    final env = TestEnv(config: const ServerConfig(apiUrl: 'https://spacefly.test', token: 't'), adapter: server());
    await env.pumpApp(tester);

    final container = ProviderScope.containerOf(tester.element(find.byType(NavigationBar)));
    await container.read(serverConfigProvider.notifier).setToken(null);
    await tester.pumpAndSettle();
    expect(find.byType(LoginScreen), findsOneWidget);
  });
}
