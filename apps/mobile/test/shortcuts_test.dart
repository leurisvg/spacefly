import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';
import 'package:spacefly_mobile/platform/launcher_shortcuts.dart';
import 'package:spacefly_mobile/state/preferences.dart';
import 'package:spacefly_mobile/storage/server_config.dart';

import 'fixtures.dart';
import 'support.dart';

void main() {
  setUpAll(initFormats);
  setUp(() => LocaleSettings.setLocaleSync(AppLocale.en));

  FakeAdapter server() => FakeAdapter((o) => switch ('${o.method} ${o.path}') {
        'GET /api/meta' => jsonBody(metaJson()),
        'GET /api/lookups' => jsonBody(lookupsJson()),
        'GET /api/lookups/editor' => jsonBody(editorLookupsJson()),
        'GET /api/reports/dashboard' => jsonBody(report(dashboardJson())),
        'GET /api/transactions' => jsonBody(report({'rows': [txJson()], 'totals': {'income': 0, 'expense': 100, 'transfer': 0}})),
        _ => jsonBody({'error': 'not_found'}, 404),
      });

  FocusNode? descriptionFocus(WidgetTester tester) => tester.widget<TextField>(find.widgetWithText(TextField, 'Description *')).focusNode;

  testWidgets('puts "New transaction" in the menu of the app icon', (tester) async {
    final env = TestEnv(config: signedInConfig, adapter: server());
    await env.pumpApp(tester);
    expect(env.shortcuts.current.map((s) => (s.type, s.title)), [(newTransactionShortcut, 'New transaction')]);
  });

  testWidgets('the menu follows the language', (tester) async {
    final env = TestEnv(config: signedInConfig, adapter: server());
    await env.pumpApp(tester);
    final container = ProviderScope.containerOf(tester.element(find.byType(NavigationBar)));
    // slang loads a language in real time, outside the fake clock of the test
    await tester.runAsync(() => container.read(preferencesProvider.notifier).setLang(AppLocale.es));
    await tester.pumpAndSettle();
    expect(env.shortcuts.current.single.title, 'Nueva transacción');
  });

  testWidgets('picking it opens the new transaction with the description ready to type in', (tester) async {
    final env = TestEnv(config: signedInConfig, adapter: server());
    await env.pumpApp(tester);
    expect(find.byType(NavigationBar), findsOneWidget);

    env.shortcuts.pick(newTransactionShortcut);
    await tester.pumpAndSettle();
    expect(find.text('New transaction'), findsWidgets);
    expect(find.byKey(const Key('tx-form')), findsOneWidget);
    expect(descriptionFocus(tester)!.hasFocus, isTrue, reason: 'the keyboard is up on the description');
  });

  testWidgets('the form does not take the keyboard when it is opened from inside the app', (tester) async {
    final env = TestEnv(config: signedInConfig, adapter: server());
    await env.pumpApp(tester);
    await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text('Transactions')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('new-transaction')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('tx-form')), findsOneWidget);
    expect(descriptionFocus(tester)!.hasFocus, isFalse);
  });

  testWidgets('an entry it does not know does nothing', (tester) async {
    final env = TestEnv(config: signedInConfig, adapter: server());
    await env.pumpApp(tester);
    env.shortcuts.pick('something_else');
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('tx-form')), findsNothing);
    expect(find.byType(NavigationBar), findsOneWidget);
  });

  testWidgets('without a session the shortcut leads to sign in first, and then to the form', (tester) async {
    final env = TestEnv(config: const ServerConfig(apiUrl: 'https://spacefly.test'), adapter: server());
    await env.pumpApp(tester);
    env.shortcuts.pick(newTransactionShortcut);
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('login-note')), findsOneWidget);

    final container = ProviderScope.containerOf(tester.element(find.byKey(const Key('login-note'))));
    await container.read(serverConfigProvider.notifier).setToken('t');
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('tx-form')), findsOneWidget);
  });
}
