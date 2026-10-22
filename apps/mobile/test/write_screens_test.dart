import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/features/editor/transaction_form_vm.dart';

import 'fixtures.dart';
import 'support.dart';

void main() {
  setUpAll(initFormats);

  void tallScreen(WidgetTester tester) {
    tester.view.physicalSize = const Size(1080, 4800);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);
  }

  /// A server that answers by method and path, and remembers every write.
  ({FakeAdapter adapter, List<RequestOptions> writes}) server({Map<String, ResponseBody Function(RequestOptions)> handlers = const {}}) {
    final writes = <RequestOptions>[];
    final adapter = FakeAdapter((o) {
      final key = '${o.method} ${o.path}';
      if (o.method != 'GET') writes.add(o);
      final custom = handlers[key];
      if (custom != null) return custom(o);
      return switch (key) {
        'GET /api/meta' => jsonBody(metaJson()),
        'GET /api/lookups' => jsonBody(lookupsJson()),
        'GET /api/lookups/editor' => jsonBody(editorLookupsJson()),
        'GET /api/lookups/descriptions' => jsonBody(['Cena familiar', 'Cena fuera']),
        'GET /api/reports/dashboard' => jsonBody(report(dashboardJson())),
        'GET /api/reports/accounts' => jsonBody(report(accountsJson())),
        'GET /api/transactions' => jsonBody(report({'rows': [txJson(id: '1', groupId: '5', description: 'Cena')], 'totals': {'income': 0, 'expense': 100, 'transfer': 0}})),
        'GET /api/transactions/5' => jsonBody(txEditJson(id: '5')),
        'POST /api/transactions' => jsonBody({'groupId': '9', 'journalId': '9', 'type': 'withdrawal'}, 201),
        'PUT /api/transactions/5' => jsonBody({'groupId': '5', 'journalId': '50', 'type': 'withdrawal'}),
        'DELETE /api/transactions/5' => ResponseBody.fromString('', 204),
        'GET /api/settings' => jsonBody(settingsJson()),
        'PUT /api/settings' => jsonBody({}),
        'GET /api/exchange-rates' => jsonBody(exchangeRatesJson()),
        'POST /api/exchange-rates' => jsonBody({}, 201),
        'DELETE /api/exchange-rates/USD/DOP/2026-09-01' => ResponseBody.fromString('', 204),
        'POST /api/refresh' => ResponseBody.fromString('', 204),
        _ => jsonBody({'error': 'not_found'}, 404),
      };
    });
    return (adapter: adapter, writes: writes);
  }

  Future<TestEnv> open(WidgetTester tester, FakeAdapter adapter) async {
    tallScreen(tester);
    final env = TestEnv(config: signedInConfig, adapter: adapter);
    await env.pumpApp(tester, [suggestionDebounceProvider.overrideWithValue(Duration.zero)]);
    return env;
  }

  Future<void> tapTab(WidgetTester tester, String label) async {
    await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text(label)));
    await tester.pumpAndSettle();
  }

  Future<void> openNewForm(WidgetTester tester) async {
    await tapTab(tester, 'Transactions');
    await tester.tap(find.byKey(const Key('new-transaction')));
    await tester.pumpAndSettle();
  }

  Future<void> pickAccount(WidgetTester tester, Key field, String name) async {
    await tester.tap(find.byKey(field));
    await tester.pumpAndSettle();
    await tester.tap(find.descendant(of: find.byType(ListTile), matching: find.text(name)));
    await tester.pumpAndSettle();
  }

  Future<void> save(WidgetTester tester) async {
    await tester.tap(find.byKey(const Key('save')));
    await tester.pumpAndSettle();
  }

  group('new transaction', () {
    testWidgets('records an expense: accounts decide the type, and the form goes back after saving', (tester) async {
      final s = server();
      final env = await open(tester, s.adapter);
      await openNewForm(tester);
      expect(find.text('New transaction'), findsWidgets);
      expect(find.byKey(const Key('type-chip')), findsNothing, reason: 'no type until both accounts are known');
      expect(find.text('Banco Popular'), findsOneWidget, reason: 'the default account is the source');

      await tester.enterText(find.widgetWithText(TextField, 'Description *'), 'Compra');
      await pickAccount(tester, const Key('destination'), 'Supermercado');
      expect(find.descendant(of: find.byKey(const Key('type-chip')), matching: find.text('Expense')), findsOneWidget);
      await tester.enterText(find.byKey(const Key('amount')), '250.5');
      await save(tester);

      final post = s.writes.singleWhere((w) => w.method == 'POST');
      expect(post.path, '/api/transactions');
      final body = post.data as Map;
      expect((body['description'], body['amount'], body['date']), ('Compra', '250.5', '2026-09-15'));
      expect(body['source'], {'id': '1'});
      expect(body['destination'], {'id': '20'});
      expect(env.toast.messages.single.message, 'Transaction created');
      expect(env.back.fallbacks, ['/transactions']);
    });

    testWidgets('says what is missing instead of sending an empty form', (tester) async {
      final s = server();
      await open(tester, s.adapter);
      await openNewForm(tester);
      await save(tester);
      expect(s.writes, isEmpty);
      expect(find.text('This field is required.'), findsWidgets);
      expect(find.text('Enter a valid time, like 18:30.'), findsNothing);
    });

    testWidgets('swaps the accounts and shows the type that follows', (tester) async {
      final s = server();
      await open(tester, s.adapter);
      await openNewForm(tester);
      await pickAccount(tester, const Key('destination'), 'Cuenta USD');
      expect(find.descendant(of: find.byKey(const Key('type-chip')), matching: find.text('Transfer')), findsOneWidget);
      expect(find.text('Received amount (USD) *'), findsOneWidget, reason: 'a transfer between currencies asks for what arrives');

      await tester.tap(find.byKey(const Key('swap')));
      await tester.pumpAndSettle();
      expect(find.text('Received amount (DOP) *'), findsOneWidget);
    });

    testWidgets('the account sheet greys out what cannot be combined and offers to create a new account', (tester) async {
      final s = server();
      await open(tester, s.adapter);
      await openNewForm(tester);
      await pickAccount(tester, const Key('source'), 'Empresa SRL'); // an income source
      await tester.tap(find.byKey(const Key('destination')));
      await tester.pumpAndSettle();
      expect(tester.widget<ListTile>(find.byKey(const Key('account-20'))).enabled, isFalse, reason: 'income source → expense account is not a thing');
      expect(tester.widget<ListTile>(find.byKey(const Key('account-1'))).enabled, isTrue);

      await tester.enterText(find.byKey(const Key('account-search')), 'Nuevo banco');
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('account-create')), findsOneWidget);
      expect(tester.widget<ListTile>(find.byKey(const Key('account-create'))).enabled, isFalse, reason: 'a new expense account cannot be paid by an income source either');
    });

    testWidgets('a name that does not exist becomes a new expense account', (tester) async {
      final s = server();
      await open(tester, s.adapter);
      await openNewForm(tester);
      await tester.tap(find.byKey(const Key('destination')));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('account-search')), 'Colmado nuevo');
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('account-create')));
      await tester.pumpAndSettle();
      expect(find.text('Colmado nuevo'), findsOneWidget);
      expect(find.descendant(of: find.byKey(const Key('type-chip')), matching: find.text('Expense')), findsOneWidget);

      await tester.enterText(find.widgetWithText(TextField, 'Description *'), 'Pan');
      await tester.enterText(find.byKey(const Key('amount')), '10');
      await save(tester);
      expect((s.writes.single.data as Map)['destination'], {'name': 'Colmado nuevo'});
    });

    testWidgets('offers earlier descriptions as you type, right under the field', (tester) async {
      final s = server();
      await open(tester, s.adapter);
      await openNewForm(tester);
      await tester.enterText(find.widgetWithText(TextField, 'Description *'), 'cen');
      await tester.pump(const Duration(milliseconds: 50));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('suggestion-Cena familiar')), findsOneWidget);

      await tester.tap(find.byKey(const Key('suggestion-Cena familiar')));
      await tester.pumpAndSettle();
      expect(find.widgetWithText(TextField, 'Cena familiar'), findsOneWidget);
      expect(find.byKey(const Key('suggestion-Cena fuera')), findsNothing, reason: 'the list closes once the text is one of them');
    });

    testWidgets('records an expense in another currency', (tester) async {
      final s = server();
      await open(tester, s.adapter);
      await openNewForm(tester);
      await pickAccount(tester, const Key('destination'), 'Supermercado');
      await tester.enterText(find.widgetWithText(TextField, 'Description *'), 'Amazon');
      await tester.enterText(find.byKey(const Key('amount')), '6100');
      await tester.tap(find.byKey(const Key('other-currency')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('foreign-currency')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('option-DOP')), findsNothing, reason: 'its own currency is not "another"');
      await tester.tap(find.byKey(const Key('option-USD')));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('foreign-amount')), '100');
      await save(tester);
      final body = s.writes.single.data as Map;
      expect((body['foreignAmount'], body['foreignCurrency']), ('100', 'USD'));
    });

    testWidgets('keeps the form open and empties it when asked to stay', (tester) async {
      final s = server();
      final env = await open(tester, s.adapter);
      await openNewForm(tester);
      await tester.tap(find.byKey(const Key('stay')));
      await tester.pumpAndSettle();
      await pickAccount(tester, const Key('destination'), 'Supermercado');
      await tester.enterText(find.widgetWithText(TextField, 'Description *'), 'Pan');
      await tester.enterText(find.byKey(const Key('amount')), '10');
      await save(tester);
      expect(env.back.fallbacks, isEmpty);
      expect(tester.widget<TextField>(find.byKey(const Key('amount'))).controller!.text, '');
      expect(find.text('Banco Popular'), findsOneWidget, reason: 'back to the default account');
      expect(env.prefs.values['spacefly.tx.afterSave'], contains('"stay":true'));
    });

    testWidgets('shows what the server refused under the field', (tester) async {
      final s = server(handlers: {
        'POST /api/transactions': (_) => jsonBody({'error': 'validation', 'message': 'x', 'fields': {'description': ['Too long for Firefly.']}}, 422),
      });
      final env = await open(tester, s.adapter);
      await openNewForm(tester);
      await pickAccount(tester, const Key('destination'), 'Supermercado');
      await tester.enterText(find.widgetWithText(TextField, 'Description *'), 'Pan');
      await tester.enterText(find.byKey(const Key('amount')), '10');
      await save(tester);
      expect(find.text('Too long for Firefly.'), findsOneWidget);
      expect(env.back.fallbacks, isEmpty);
    });
  });

  group('editing', () {
    Future<void> openEdit(WidgetTester tester, TestEnv env) async {
      await tapTab(tester, 'Transactions');
      await tester.tap(find.text('Cena'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('edit')));
      await tester.pumpAndSettle();
    }

    testWidgets('loads the stored transaction into the form and saves the change', (tester) async {
      final s = server();
      final env = await open(tester, s.adapter);
      await openEdit(tester, env);
      expect(find.text('Edit transaction'), findsWidgets);
      expect(tester.widget<TextField>(find.byKey(const Key('amount'))).controller!.text, '250.00');
      expect(find.widgetWithText(TextField, 'Cena'), findsOneWidget);
      expect(find.text('Restaurante'), findsOneWidget);
      expect(find.text('18:30'), findsOneWidget);
      expect(find.byKey(const Key('delete')), findsOneWidget);

      await tester.enterText(find.byKey(const Key('amount')), '300');
      await save(tester);
      final put = s.writes.singleWhere((w) => w.method == 'PUT');
      expect(put.path, '/api/transactions/5');
      expect((put.data as Map)['amount'], '300');
      expect((put.data as Map)['time'], '18:30');
      expect(env.toast.messages.single.message, 'Transaction updated');
    });

    testWidgets('deletes after asking', (tester) async {
      final s = server();
      final env = await open(tester, s.adapter);
      await openEdit(tester, env);
      env.confirm.answer = false;
      await tester.ensureVisible(find.byKey(const Key('delete')));
      await tester.tap(find.byKey(const Key('delete')));
      await tester.pumpAndSettle();
      expect(s.writes, isEmpty);

      env.confirm.answer = true;
      await tester.tap(find.byKey(const Key('delete')));
      await tester.pumpAndSettle();
      expect(s.writes.single.method, 'DELETE');
      expect(env.toast.messages.single.message, 'Transaction deleted');
    });

    testWidgets('a transaction with several parts is shown but not edited', (tester) async {
      final s = server(handlers: {'GET /api/transactions/5': (_) => jsonBody({'reason': 'splits'}, 409)});
      final env = await open(tester, s.adapter);
      await tapTab(tester, 'Transactions');
      await tester.tap(find.text('Cena'));
      await tester.pumpAndSettle();
      expect(find.text("This transaction can't be edited here"), findsOneWidget);
      expect(find.byKey(const Key('edit')), findsNothing);
      expect(env.toast.messages, isEmpty);
    });
  });

  group('the transaction page', () {
    testWidgets('deletes from its app bar', (tester) async {
      final s = server();
      final env = await open(tester, s.adapter);
      await tapTab(tester, 'Transactions');
      await tester.tap(find.text('Cena'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('delete')));
      await tester.pumpAndSettle();
      expect(env.confirm.asked.single.message, contains('Cena'));
      expect(s.writes.single.path, '/api/transactions/5');
      expect(env.back.fallbacks, ['/transactions']);
    });
  });

  group('settings', () {
    testWidgets('saves the server settings', (tester) async {
      final s = server();
      await open(tester, s.adapter);
      await tapTab(tester, 'Settings');
      await tester.ensureVisible(find.byKey(const Key('server-settings-link')));
      await tester.tap(find.byKey(const Key('server-settings-link')));
      await tester.pumpAndSettle();

      expect(tester.widget<Switch>(find.descendant(of: find.byKey(const Key('excluded-1')), matching: find.byType(Switch))).value, isTrue);
      await tester.tap(find.byKey(const Key('excluded-2')));
      await tester.enterText(find.byKey(const Key('balance-months')), '6');
      await tester.tap(find.byKey(const Key('threshold-0.05')));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byKey(const Key('settings-save')));
      await tester.tap(find.byKey(const Key('settings-save')));
      await tester.pumpAndSettle();

      final put = s.writes.singleWhere((w) => w.path == '/api/settings');
      final body = put.data as Map;
      expect((body['excludedAccounts'] as List).toSet(), {'1', '2'});
      expect((body['balanceMonths'], body['sankeyThreshold']), (6, 0.05));
    });

    testWidgets('ignores a balance window the server would refuse', (tester) async {
      final s = server();
      await open(tester, s.adapter);
      await tapTab(tester, 'Settings');
      await tester.ensureVisible(find.byKey(const Key('server-settings-link')));
      await tester.tap(find.byKey(const Key('server-settings-link')));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('balance-months')), '1');
      await tester.ensureVisible(find.byKey(const Key('settings-save')));
      await tester.tap(find.byKey(const Key('settings-save')));
      await tester.pumpAndSettle();
      expect((s.writes.single.data as Map)['balanceMonths'], 12, reason: 'it keeps the last valid value');
    });

    testWidgets('adds, edits and deletes exchange rates', (tester) async {
      final s = server();
      final env = await open(tester, s.adapter);
      await tapTab(tester, 'Settings');
      await tester.ensureVisible(find.byKey(const Key('exchange-rates-link')));
      await tester.tap(find.byKey(const Key('exchange-rates-link')));
      await tester.pumpAndSettle();
      expect(find.text('Add rate'), findsOneWidget);
      expect(find.byKey(const Key('rate-row-USD-2026-09-01')), findsOneWidget);

      await tester.enterText(find.byKey(const Key('rate')), '62,5');
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('rate-save')));
      await tester.pumpAndSettle();
      final post = s.writes.singleWhere((w) => w.method == 'POST');
      expect(post.data, {'currency': 'USD', 'date': '2026-09-15', 'rate': '62.5'});
      expect(env.toast.messages.single.message, 'Rate saved');

      await tester.tap(find.byKey(const Key('rate-row-USD-2026-09-01')));
      await tester.pumpAndSettle();
      expect(find.text('Replace rate'), findsOneWidget);
      expect(find.text('This day already has a rate: saving replaces it.'), findsOneWidget);
      expect(tester.widget<TextField>(find.byKey(const Key('rate'))).controller!.text, '61');

      await tester.tap(find.byKey(const Key('rate-delete-USD-2026-09-01')));
      await tester.pumpAndSettle();
      expect(env.confirm.asked.single.destructive, isTrue);
      expect(s.writes.last.path, '/api/exchange-rates/USD/DOP/2026-09-01');
    });

    testWidgets('refreshes the data from Firefly', (tester) async {
      final s = server();
      final env = await open(tester, s.adapter);
      await tapTab(tester, 'Settings');
      await tester.ensureVisible(find.byKey(const Key('refresh')));
      await tester.tap(find.byKey(const Key('refresh')));
      await tester.pumpAndSettle();
      expect(s.writes.single.path, '/api/refresh');
      expect(env.toast.messages.single.message, 'Data refreshed from Firefly');
    });

    testWidgets('shows who is signed in', (tester) async {
      final s = server();
      await open(tester, s.adapter);
      await tapTab(tester, 'Settings');
      expect(find.text('Signed in · a@b.c'), findsOneWidget);
    });
  });
}
