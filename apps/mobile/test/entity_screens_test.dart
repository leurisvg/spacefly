import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/features/editor/entity_form_vm.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';
import 'package:spacefly_mobile/platform/platform.dart';
import 'package:spacefly_mobile/router.dart';

import 'fixtures.dart';
import 'support.dart';

void main() {
  setUpAll(initFormats);
  setUp(() => LocaleSettings.setLocaleSync(AppLocale.en));

  void tallScreen(WidgetTester tester) {
    tester.view.physicalSize = const Size(1080, 4800);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);
  }

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
        'GET /api/reports/dashboard' => jsonBody(report(dashboardJson())),
        'GET /api/reports/accounts' => jsonBody(report(accountsJson())),
        'GET /api/reports/budgets' => jsonBody(report(budgetsJson())),
        'GET /api/reports/ranking' => jsonBody(report(o.queryParameters['by'] == 'tag'
            ? {
                ...rankingJson(),
                'items': [
                  {'id': 'viaje', 'name': 'viaje', 'value': 100, 'share': 1, 'count': 4, 'avg': 25, 'previous': 0},
                ],
              }
            : rankingJson())),
        'GET /api/categories/1' => jsonBody({'id': '1', 'name': 'Comida', 'notes': 'Super y colmado'}),
        'GET /api/tags/t1' => jsonBody({'id': 't1', 'tag': 'viaje', 'date': '2026-08-01', 'description': null}),
        'GET /api/budgets/b2' => jsonBody({'id': 'b2', 'name': 'Ocio', 'active': true, 'notes': null, 'autoBudget': {'type': 'rollover', 'amount': '200.00', 'period': 'monthly', 'currency': 'DOP'}}),
        'GET /api/accounts/2' => jsonBody({
            'id': '2',
            'type': 'asset',
            'name': 'Ahorros',
            'active': true,
            'iban': null,
            'notes': null,
            'currency': 'DOP',
            'includeNetWorth': true,
            'role': 'savingAsset',
            'creditCardType': null,
            'monthlyPaymentDate': null,
            'openingBalance': null,
            'openingBalanceDate': null,
            'liabilityType': null,
            'liabilityDirection': null,
            'interest': null,
            'interestPeriod': null,
            'transactionCount': 3,
          }),
        'POST /api/categories' => jsonBody({'id': '9'}, 201),
        'POST /api/accounts' => jsonBody({'id': '9'}, 201),
        'POST /api/piggy-banks' => jsonBody({'id': '9'}, 201),
        'PUT /api/budgets/b2' => jsonBody({'id': 'b2'}),
        'PUT /api/settings/account-order' => jsonBody({}),
        'DELETE /api/accounts/2' => ResponseBody.fromString('', 204),
        'POST /api/refresh' => ResponseBody.fromString('', 204),
        _ => jsonBody({'error': 'not_found'}, 404),
      };
    });
    return (adapter: adapter, writes: writes);
  }

  Future<(TestEnv, List<RequestOptions>)> open(WidgetTester tester, {Map<String, ResponseBody Function(RequestOptions)> handlers = const {}}) async {
    tallScreen(tester);
    final s = server(handlers: handlers);
    final env = TestEnv(config: signedInConfig, adapter: s.adapter);
    await env.pumpApp(tester);
    return (env, s.writes);
  }

  Future<void> tapTab(WidgetTester tester, String label) async {
    await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text(label)));
    await tester.pumpAndSettle();
  }

  Future<void> openEntry(WidgetTester tester, String entry) async {
    await tapTab(tester, 'More');
    await tester.ensureVisible(find.text(entry));
    await tester.tap(find.text(entry));
    await tester.pumpAndSettle();
  }

  Future<void> save(WidgetTester tester) async {
    await tester.tap(find.byKey(const Key('save')));
    await tester.pumpAndSettle();
  }

  /// The text field of a form, whichever time the record was loaded.
  Finder field(String name) => find.byWidgetPredicate((w) => w is TextFormField && (w.key is ValueKey) && (w.key as ValueKey).value.toString().startsWith('$name-'));

  test('the editor routes know the kinds of entity', () {
    expect(entityKindOf('piggy'), EntityKind.piggy);
    expect(entityKindOf('bill'), EntityKind.bill);
    expect(entityKindOf('nope'), isNull);
    expect(entityKindOf(null), isNull);
  });

  group('More tab', () {
    testWidgets('lists what can be created', (tester) async {
      await open(tester);
      await tapTab(tester, 'More');
      for (final entry in ['Create', 'New category', 'New tag', 'New budget', 'New subscription', 'New account', 'New goal']) {
        await tester.ensureVisible(find.text(entry).first);
        expect(find.text(entry), findsWidgets, reason: entry);
      }
    });
  });

  group('More tab', () {
    testWidgets('offers a new transaction among what can be created', (tester) async {
      await open(tester);
      await tapTab(tester, 'More');
      await tester.ensureVisible(find.byKey(const Key('more-/transactions/new')));
      expect(find.text('New transaction'), findsOneWidget);
    });
  });

  group('category form', () {
    testWidgets('creates a category and goes back', (tester) async {
      final (env, writes) = await open(tester);
      await openEntry(tester, 'New category');
      expect(find.byKey(const Key('entity-form-category')), findsOneWidget);
      await tester.enterText(field('name'), '  Mascotas ');
      await tester.enterText(field('notes'), 'Comida y vet');
      await save(tester);
      expect(writes.single.path, '/api/categories');
      expect(writes.single.data, {'name': 'Mascotas', 'notes': 'Comida y vet'});
      expect(env.toast.messages.single.message, 'Category created');
      expect(env.back.fallbacks, [entityFormFallback]);
    });

    testWidgets('says what is missing instead of sending an empty form', (tester) async {
      final (env, writes) = await open(tester);
      await openEntry(tester, 'New category');
      expect(find.text('This field is required.'), findsNothing);
      await save(tester);
      expect(writes, isEmpty);
      expect(find.text('This field is required.'), findsOneWidget);
      expect(env.back.fallbacks, isEmpty);
    });

    testWidgets('shows what the server refused under the field', (tester) async {
      final (_, _) = await open(tester, handlers: {
        'POST /api/categories': (o) => jsonBody({'error': 'validation', 'message': 'x', 'fields': {'name': ['Already in use.']}}, 422),
      });
      await openEntry(tester, 'New category');
      await tester.enterText(field('name'), 'Comida');
      await save(tester);
      expect(find.text('Already in use.'), findsOneWidget);
    });
  });

  group('editing from the analysis screens', () {
    testWidgets('a category row opens its editor with the stored values, and the unnamed one has none', (tester) async {
      final (_, writes) = await open(tester);
      await openEntry(tester, 'Categories');
      expect(find.byKey(const Key('rank-edit-0')), findsOneWidget);
      expect(find.byKey(const Key('rank-edit-1')), findsNothing, reason: 'the uncategorized row is not a record');
      await tester.tap(find.byKey(const Key('rank-edit-0')));
      await tester.pumpAndSettle();
      expect(find.text('Edit category'), findsOneWidget);
      expect(tester.widget<TextFormField>(field('name')).initialValue, 'Comida');
      expect(tester.widget<TextFormField>(field('notes')).initialValue, 'Super y colmado');
      expect(find.byKey(const Key('delete')), findsOneWidget);
      expect(writes, isEmpty);
    });

    testWidgets('a tag row finds its id by name', (tester) async {
      await open(tester);
      await openEntry(tester, 'Tags');
      await tester.tap(find.byKey(const Key('rank-edit-0')));
      await tester.pumpAndSettle();
      expect(find.text('Edit tag'), findsOneWidget);
      expect(tester.widget<TextFormField>(field('tag')).initialValue, 'viaje');
      expect(find.text('2026-08-01'), findsOneWidget);
    });

    testWidgets('the plus of each ranking creates its own kind', (tester) async {
      await open(tester);
      await openEntry(tester, 'Merchants');
      await tester.tap(find.byKey(const Key('ranking-new')));
      await tester.pumpAndSettle();
      expect(find.text('New account'), findsWidgets);
      expect(find.text('Expense'), findsOneWidget, reason: 'a merchant is an expense account');
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.pageBack();
      await tester.pumpAndSettle();

      await openEntry(tester, 'Income sources');
      await tester.tap(find.byKey(const Key('ranking-new')));
      await tester.pumpAndSettle();
      expect(find.text('Income'), findsWidgets);
    });

    testWidgets('a budget opens its editor with its automatic budget', (tester) async {
      await open(tester);
      await openEntry(tester, 'Budgets');
      await tester.tap(find.byKey(const Key('budget-edit-b2')));
      await tester.pumpAndSettle();
      expect(find.text('Edit budget'), findsOneWidget);
      expect(tester.widget<SwitchListTile>(find.byKey(const Key('switch-auto'))).value, isTrue);
      expect(find.text('Roll over what\'s left'), findsOneWidget);
      expect(tester.widget<TextFormField>(field('autoAmount')).initialValue, '200.00');
    });

    testWidgets('saving a budget sends the change', (tester) async {
      final (env, writes) = await open(tester);
      await openEntry(tester, 'Budgets');
      await tester.tap(find.byKey(const Key('budget-edit-b2')));
      await tester.pumpAndSettle();
      await tester.enterText(field('name'), 'Ocio y salidas');
      await save(tester);
      expect((writes.single.method, writes.single.path), ('PUT', '/api/budgets/b2'));
      expect(writes.single.data, containsPair('name', 'Ocio y salidas'));
      expect(env.toast.messages.single.message, 'Budget updated');
    });

    testWidgets('the plus of Budgets opens an empty form', (tester) async {
      await open(tester);
      await openEntry(tester, 'Budgets');
      await tester.tap(find.byKey(const Key('budget-new')));
      await tester.pumpAndSettle();
      expect(find.text('New budget'), findsWidgets);
      expect(find.byKey(const Key('delete')), findsNothing);
      expect(field('autoAmount'), findsNothing, reason: 'the automatic budget is off');
    });
  });

  group('accounts tab', () {
    testWidgets('edits an account and asks for its name before deleting it', (tester) async {
      final (env, writes) = await open(tester);
      await tapTab(tester, 'Accounts');
      await tester.tap(find.byKey(const Key('edit-2')));
      await tester.pumpAndSettle();
      expect(find.text('Edit account'), findsOneWidget);
      expect(find.text('The type can\'t be changed after the account is created.'), findsOneWidget);
      final hint = tester.widget<InputDecorator>(find.descendant(of: find.byKey(const Key('option-type')), matching: find.byType(InputDecorator)));
      expect(hint.decoration.errorText, isNull, reason: 'a hint is not an error');
      await tester.ensureVisible(find.byKey(const Key('delete')));
      await tester.tap(find.byKey(const Key('delete')));
      await tester.pumpAndSettle();
      final asked = env.confirm.asked.single;
      expect(asked.requireText, 'Ahorros');
      expect(asked.message, contains('3 transactions'));
      expect(writes.single.path, '/api/accounts/2');
      expect(env.back.fallbacks, [entityFormFallback]);
    });

    testWidgets('an asset account marks what is required and writes its amounts with their currency', (tester) async {
      await open(tester);
      await tapTab(tester, 'Accounts');
      await tester.tap(find.byKey(const Key('new-account')));
      await tester.pumpAndSettle();
      expect(find.text('Use *'), findsOneWidget, reason: 'the role is required');
      expect(find.text('Opening balance'), findsOneWidget);
      expect(find.text('Amount owed'), findsNothing);
      final balance = tester.widget<TextField>(find.descendant(of: find.byKey(const ValueKey('openingBalance-0')), matching: find.byType(TextField)));
      expect(balance.decoration!.suffixText, 'DOP');
    });

    testWidgets('creates an account of the kind picked', (tester) async {
      final (env, writes) = await open(tester);
      await tapTab(tester, 'Accounts');
      await tester.tap(find.byKey(const Key('new-account')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('option-type')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('option-liability')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('option-liabilityType')), findsOneWidget, reason: 'debt fields appear for a liability');
      expect(find.text('Interest (%) *'), findsOneWidget, reason: 'the interest is required for a debt');
      expect(find.text('Amount owed'), findsOneWidget, reason: 'a debt starts from what is owed, not an opening balance');
      expect(find.text('Opening balance'), findsNothing);
      expect(find.text('Start date'), findsOneWidget);
      await tester.enterText(field('name'), 'Préstamo auto');
      await save(tester);
      expect(writes.single.path, '/api/accounts');
      expect(writes.single.data, containsPair('type', 'liability'));
      expect(writes.single.data, containsPair('liabilityType', 'loan'));
      expect(writes.single.data, containsPair('role', null));
      expect(env.toast.messages.single.message, 'Account created');
    });

    testWidgets('reorders the accounts with the arrows and resets the order', (tester) async {
      final (_, writes) = await open(tester);
      await tapTab(tester, 'Accounts');
      expect(find.byKey(const Key('edit-1')), findsOneWidget);
      await tester.tap(find.byKey(const Key('reorder-start')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('accounts-reorder')), findsOneWidget);
      expect(find.byKey(const Key('edit-1')), findsNothing, reason: 'no editing while reordering');
      expect(tester.widget<IconButton>(find.byKey(const Key('up-1'))).onPressed, isNull, reason: 'already first');
      await tester.tap(find.byKey(const Key('down-1')));
      await tester.pumpAndSettle();
      expect(writes.single.data, {'order': ['2', '1']});
      expect(tester.getTopLeft(find.byKey(const ValueKey('2'))).dy, lessThan(tester.getTopLeft(find.byKey(const ValueKey('1'))).dy));
      writes.clear();
      await tester.tap(find.byKey(const Key('reorder-reset')));
      await tester.pumpAndSettle();
      expect(writes.first.data, {'order': <String>[]});
      expect(tester.getTopLeft(find.byKey(const ValueKey('1'))).dy, lessThan(tester.getTopLeft(find.byKey(const ValueKey('2'))).dy));
      await tester.tap(find.byKey(const Key('reorder-done')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('accounts-reorder')), findsNothing);
      expect(find.byKey(const Key('edit-1')), findsOneWidget);
    });
  });

  group('goal form', () {
    testWidgets('adds an account, adjusts what is set aside and saves the complete list', (tester) async {
      final (env, writes) = await open(tester);
      await openEntry(tester, 'New goal');
      expect(find.text('Pick at least one account.'), findsOneWidget);
      await tester.enterText(field('name'), 'Viaje');
      await save(tester);
      expect(writes, isEmpty);
      await tester.ensureVisible(find.byKey(const Key('piggy-pick-account')));
      await tester.tap(find.byKey(const Key('piggy-pick-account')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('option-2')));
      await tester.pumpAndSettle();
      expect(find.text('Cuenta USD'), findsOneWidget);
      expect(tester.widget<IconButton>(find.byKey(const Key('piggy-add-0'))).onPressed, isNull, reason: 'nothing typed to add');
      await tester.enterText(find.byKey(const ValueKey('piggy-adjust-0-true-0')), '25');
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('piggy-add-0')));
      await tester.pumpAndSettle();
      await save(tester);
      expect(writes.single.path, '/api/piggy-banks');
      expect(writes.single.data, containsPair('accounts', [{'accountId': '2', 'currentAmount': '25.00'}]));
      expect(writes.single.data, containsPair('currency', 'USD'));
      expect(env.toast.messages.single.message, 'Goal created');
    });
  });

  group('typing the name to confirm', () {
    testWidgets('the dialog only lets a matching name through, ignoring case and accents', (tester) async {
      await tester.pumpWidget(TranslationProvider(child: MaterialApp(navigatorKey: rootNavigatorKey, home: const Scaffold(body: SizedBox()))));
      bool? answer;
      final pending = DialogConfirm().confirm(const Confirmation(title: 'Delete account', message: 'Sure?', confirmLabel: 'Delete', destructive: true, requireText: 'Préstamo')).then((v) => answer = v);
      await tester.pumpAndSettle();
      expect(find.text('Type “Préstamo” to confirm'), findsOneWidget);
      expect(tester.widget<FilledButton>(find.byKey(const Key('confirm-ok'))).onPressed, isNull);
      await tester.enterText(find.byKey(const Key('confirm-text')), 'Prest');
      await tester.pump();
      expect(tester.widget<FilledButton>(find.byKey(const Key('confirm-ok'))).onPressed, isNull);
      await tester.enterText(find.byKey(const Key('confirm-text')), '  prestamo ');
      await tester.pump();
      expect(tester.widget<FilledButton>(find.byKey(const Key('confirm-ok'))).onPressed, isNotNull);
      await tester.tap(find.byKey(const Key('confirm-ok')));
      await tester.pumpAndSettle();
      await pending;
      expect(answer, isTrue);
    });

    testWidgets('a plain confirmation needs nothing typed', (tester) async {
      await tester.pumpWidget(TranslationProvider(child: MaterialApp(navigatorKey: rootNavigatorKey, home: const Scaffold(body: SizedBox()))));
      bool? answer;
      final pending = DialogConfirm().confirm(const Confirmation(title: 'Delete', message: 'Sure?', confirmLabel: 'Delete')).then((v) => answer = v);
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('confirm-text')), findsNothing);
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      await pending;
      expect(answer, isFalse);
    });
  });
}
