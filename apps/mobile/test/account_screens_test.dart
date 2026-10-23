import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';
import 'package:spacefly_mobile/shared/dates.dart';
import 'package:spacefly_mobile/state/filters_store.dart';

import 'fixtures.dart';
import 'support.dart';

void main() {
  setUpAll(initFormats);
  setUp(() => LocaleSettings.setLocaleSync(AppLocale.en));

  void tallScreen(WidgetTester tester) {
    tester.view.physicalSize = const Size(1080, 7000);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);
  }

  FakeAdapter server({bool foreign = false, Map<String, ResponseBody Function(RequestOptions)> handlers = const {}}) => FakeAdapter((o) {
        final custom = handlers['${o.method} ${o.path}'];
        if (custom != null) return custom(o);
        return switch (o.path) {
          '/api/meta' => jsonBody(metaJson()),
          '/api/lookups' => jsonBody(lookupsJson()),
          '/api/lookups/editor' => jsonBody(editorLookupsJson()),
          '/api/reports/dashboard' => jsonBody(report(dashboardJson())),
          '/api/reports/accounts' => jsonBody(report(accountsJson())),
          '/api/reports/accounts/1' => jsonBody(report(accountDetailJson(foreign: foreign))),
          '/api/reports/net-worth' => jsonBody(report(netWorthJson())),
          '/api/reports/savings' => jsonBody(report(savingsJson())),
          '/api/reports/counterparties' => jsonBody(report(counterpartiesJson(kind: o.queryParameters['kind'] as String))),
          '/api/reports/counterparties/20' => jsonBody(report(counterpartyDetailJson(kind: o.queryParameters['kind'] as String))),
          '/api/transactions' => jsonBody(report({'rows': [txJson(id: '1', description: 'Supermercado')], 'totals': {'income': 0, 'expense': 100, 'transfer': 0}})),
          '/api/accounts/1' || '/api/accounts/20' => jsonBody({
              'id': o.path.split('/').last,
              'type': 'asset',
              'name': 'Banco Popular',
              'active': true,
              'iban': null,
              'notes': null,
              'currency': 'DOP',
              'includeNetWorth': true,
              'role': 'defaultAsset',
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
          _ => jsonBody({'error': 'not_found'}, 404),
        };
      });

  Future<TestEnv> open(WidgetTester tester, {bool foreign = false, Map<String, ResponseBody Function(RequestOptions)> handlers = const {}}) async {
    tallScreen(tester);
    final env = TestEnv(config: signedInConfig, adapter: server(foreign: foreign, handlers: handlers));
    await env.pumpApp(tester);
    return env;
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

  Map<String, dynamic> lastQuery(TestEnv env, String path) => env.adapter!.requests.lastWhere((r) => r.path == path).queryParameters;

  ProviderContainer containerOf(WidgetTester tester) => ProviderScope.containerOf(tester.element(find.byType(MaterialApp)));

  group('More tab', () {
    testWidgets('lists the account screens', (tester) async {
      await open(tester);
      await tapTab(tester, 'More');
      for (final entry in ['Accounts', 'Expense accounts', 'Revenue accounts', 'Net worth', 'Savings']) {
        await tester.ensureVisible(find.text(entry).first);
        expect(find.text(entry), findsWidgets, reason: entry);
      }
    });
  });

  group('expense and revenue accounts', () {
    testWidgets('shows the totals, the ranking and the accounts that moved money', (tester) async {
      final env = await open(tester);
      await openEntry(tester, 'Expense accounts');
      expect(lastQuery(env, '/api/reports/counterparties')['kind'], 'expense');
      expect(find.byKey(const Key('counterparties-expense')), findsOneWidget);
      expect(find.text('Where your money goes: totals, frequency and trend by expense account.'), findsOneWidget);
      expect(find.text('ACCOUNTS WITH ACTIVITY'), findsOneWidget);
      expect(find.byKey(const Key('counterparty-row-0')), findsOneWidget);
      expect(find.byKey(const Key('counterparty-row-1')), findsOneWidget, reason: 'it had money in the previous period');
      expect(find.byKey(const Key('counterparty-row-2')), findsNothing);
      await tester.ensureVisible(find.byKey(const Key('show-empty')));
      await tester.tap(find.byKey(const Key('show-empty')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('counterparty-row-2')), findsOneWidget);
    });

    testWidgets('revenue accounts ask for the income kind', (tester) async {
      final env = await open(tester);
      await openEntry(tester, 'Revenue accounts');
      expect(lastQuery(env, '/api/reports/counterparties')['kind'], 'income');
      expect(find.text('Where your money comes from: totals, frequency and trend by revenue account.'), findsOneWidget);
    });

    testWidgets('a row opens the detail of the account, the plus a new one and the pencil its editor', (tester) async {
      final env = await open(tester);
      await openEntry(tester, 'Expense accounts');
      await tester.ensureVisible(find.byKey(const Key('counterparty-row-0')));
      await tester.tap(find.byKey(const Key('counterparty-row-0')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('counterparty-detail-20')), findsOneWidget);
      expect(lastQuery(env, '/api/reports/counterparties/20')['kind'], 'expense');
      await tester.pageBack();
      await tester.pumpAndSettle();

      await tester.ensureVisible(find.byKey(const Key('counterparty-edit-0')));
      await tester.tap(find.byKey(const Key('counterparty-edit-0')));
      await tester.pumpAndSettle();
      expect(find.text('Edit account'), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('counterparty-new')));
      await tester.pumpAndSettle();
      expect(find.text('New account'), findsWidgets);
      expect(find.text('Expense'), findsOneWidget);
    });
  });

  group('counterparty detail', () {
    Future<TestEnv> detail(WidgetTester tester) async {
      final env = await open(tester);
      await openEntry(tester, 'Expense accounts');
      await tester.ensureVisible(find.byKey(const Key('counterparty-row-0')));
      await tester.tap(find.byKey(const Key('counterparty-row-0')));
      await tester.pumpAndSettle();
      return env;
    }

    testWidgets('shows the totals, the summary, the calendar, the breakdowns and the records', (tester) async {
      await detail(tester);
      expect(find.text('Supermercado Nacional'), findsWidgets);
      expect(find.text('DO00'), findsOneWidget);
      expect(find.text('% OF TOTAL'), findsOneWidget);
      expect(find.text('50.0%'), findsWidgets);
      expect(find.text('Period summary'), findsOneWidget);
      expect(find.text('RD\$80.00'), findsWidgets, reason: 'the monthly average of the year');
      expect(find.text('Spending by day'), findsOneWidget);
      expect(find.byKey(const Key('calendar-2026-09')), findsOneWidget);
      expect(find.text('Spending by weekday'), findsOneWidget);
      expect(find.text('By category'), findsOneWidget);
      expect(find.text('Paid from'), findsOneWidget);
      expect(find.byKey(const Key('record-1')), findsOneWidget);
      expect(find.text('Page 1 of 1'), findsOneWidget);
    });

    testWidgets('a day of the calendar opens its transactions with the account as filter', (tester) async {
      final env = await detail(tester);
      await tester.ensureVisible(find.byKey(const Key('day-2026-09-10')));
      await tester.tap(find.byKey(const Key('day-2026-09-10')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('drill')), findsOneWidget);
      final q = lastQuery(env, '/api/transactions');
      expect((q['start'], q['end'], q['counterparty']), ('2026-09-10', '2026-09-10', '20'));
    });

    testWidgets('its records edit and its account edits', (tester) async {
      await detail(tester);
      await tester.ensureVisible(find.byKey(const Key('record-edit-1')));
      expect(find.byKey(const Key('record-edit-1')), findsOneWidget);
      await tester.tap(find.byKey(const Key('counterparty-edit')));
      await tester.pumpAndSettle();
      expect(find.text('Edit account'), findsOneWidget);
    });

    testWidgets('says so when the account is not of this kind or was deleted', (tester) async {
      await open(tester, handlers: {'GET /api/reports/counterparties/20': (o) => jsonBody({'error': 'not_found'}, 404)});
      await openEntry(tester, 'Expense accounts');
      await tester.ensureVisible(find.byKey(const Key('counterparty-row-0')));
      await tester.tap(find.byKey(const Key('counterparty-row-0')));
      await tester.pumpAndSettle();
      expect(find.text('We couldn\'t find this account'), findsOneWidget);
      expect(find.text('It may not be an account of this type, or it was deleted.'), findsOneWidget);
    });
  });

  group('account detail', () {
    Future<TestEnv> detail(WidgetTester tester, {bool foreign = false}) async {
      final env = await open(tester, foreign: foreign);
      await tapTab(tester, 'Accounts');
      await tester.tap(find.text('Banco').first);
      await tester.pumpAndSettle();
      return env;
    }

    testWidgets('opens on the last 30 days and asks for its account', (tester) async {
      final env = await detail(tester);
      expect(find.byKey(const Key('account-detail-1')), findsOneWidget);
      final q = lastQuery(env, '/api/reports/accounts/1');
      expect((q['start'], q['end']), ('2026-08-17', '2026-09-15'));
      expect(env.adapter!.requests.where((r) => r.path == '/api/reports/accounts/1'), hasLength(1), reason: 'it does not ask for the user’s period first');
      expect(find.descendant(of: find.byKey(const Key('period-label')), matching: find.text('Last 30 days')), findsOneWidget, reason: 'the period bar shows the screen’s own period, by name while it ends today');
      await tester.tap(find.byKey(const Key('period-previous')));
      await tester.pumpAndSettle();
      expect(find.descendant(of: find.byKey(const Key('period-label')), matching: find.text('Last 30 days')), findsNothing, reason: 'after ◀ it is just a range');
    });

    testWidgets('shows the balance, the summary, the calendar, the rankings and the records', (tester) async {
      await detail(tester);
      expect(find.text('Savings · DOP · DO11'), findsOneWidget);
      expect(find.text('CLOSING BALANCE'), findsOneWidget);
      expect(find.text('Period summary'), findsOneWidget);
      expect(find.text('Lowest balance'.toUpperCase()), findsOneWidget);
      expect(find.text('Balance by day'), findsOneWidget);
      expect(find.byKey(const Key('calendar-2026-09')), findsOneWidget);
      expect(find.text('What it\'s spent on'), findsOneWidget);
      expect(find.text('Where it\'s spent'), findsOneWidget);
      expect(find.text('Where the money comes from'), findsOneWidget);
      expect(find.byKey(const Key('record-1')), findsOneWidget);
      expect(find.byKey(const Key('tab-all')), findsOneWidget);
    });

    testWidgets('each record tells its type and the year, and one made in another currency its original amount', (tester) async {
      await detail(tester, foreign: false);
      expect(find.byKey(const Key('record-type-3')), findsOneWidget);
      expect(find.descendant(of: find.byKey(const Key('record-type-3')), matching: find.text('Income')), findsOneWidget);
      expect(find.text('2026'), findsWidgets);
      expect(find.byKey(const Key('record-original-3')), findsNothing, reason: 'it was made in the display currency');
    });

    testWidgets('an account kept in dollars is shown in dollars, with what it is worth', (tester) async {
      await detail(tester, foreign: true);
      expect(find.text('USD · DO11', findRichText: true), findsNothing);
      expect(find.textContaining('US\$'), findsWidgets);
      expect(find.text('≈ RD\$1,000.00'), findsOneWidget, reason: 'under the closing balance');
    });

    testWidgets('the tabs filter the records and count them', (tester) async {
      await detail(tester);
      expect(find.text('Transactions  4'), findsOneWidget);
      expect(find.text('Transfers  1'), findsOneWidget);
      await tester.ensureVisible(find.byKey(const Key('tab-transfer')));
      await tester.tap(find.byKey(const Key('tab-transfer')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('record-4')), findsOneWidget);
      expect(find.byKey(const Key('record-1')), findsNothing);
    });

    testWidgets('a day of the calendar opens its transactions with the account as filter', (tester) async {
      final env = await detail(tester);
      await tester.ensureVisible(find.byKey(const Key('day-2026-09-10')));
      await tester.tap(find.byKey(const Key('day-2026-09-10')));
      await tester.pumpAndSettle();
      final q = lastQuery(env, '/api/transactions');
      expect((q['start'], q['end'], q['account']), ('2026-09-10', '2026-09-10', '1'));
    });

    testWidgets('edits the account and its records', (tester) async {
      await detail(tester);
      await tester.ensureVisible(find.byKey(const Key('record-edit-4')));
      expect(find.byKey(const Key('record-edit-4')), findsOneWidget, reason: 'a transfer can be edited here');
      await tester.tap(find.byKey(const Key('account-edit')));
      await tester.pumpAndSettle();
      expect(find.text('Edit account'), findsOneWidget);
    });

    testWidgets('gives the user’s period back when it closes', (tester) async {
      await detail(tester);
      final c = containerOf(tester);
      expect(c.read(filtersProvider).preset, PeriodPreset.last30);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(c.read(filtersProvider).preset, PeriodPreset.month);
      expect(c.read(filtersProvider.notifier).scoped, isFalse);
    });

    testWidgets('says so when the account is not an asset account or was deleted', (tester) async {
      await open(tester, handlers: {'GET /api/reports/accounts/1': (o) => jsonBody({'error': 'not_found'}, 404)});
      await tapTab(tester, 'Accounts');
      await tester.tap(find.text('Banco').first);
      await tester.pumpAndSettle();
      expect(find.text('We couldn\'t find this account'), findsOneWidget);
      expect(find.text('It may not be an asset account, or it was deleted.'), findsOneWidget);
    });

    testWidgets('the accounts tab keeps editing and reordering apart from opening', (tester) async {
      await open(tester);
      await tapTab(tester, 'Accounts');
      await tester.tap(find.byKey(const Key('reorder-start')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Banco').first);
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('account-detail-1')), findsNothing, reason: 'a tap while reordering does not open the account');
    });
  });

  group('net worth', () {
    testWidgets('shows the current worth, the change, the total and the stacked accounts', (tester) async {
      final env = await open(tester);
      await openEntry(tester, 'Net worth');
      expect(lastQuery(env, '/api/reports/net-worth')['months'], '24');
      expect(find.text('CURRENT NET WORTH'), findsOneWidget);
      expect(find.text('CHANGE OVER 2 MONTHS'), findsOneWidget);
      expect(find.text('Total net worth'), findsOneWidget);
      expect(find.text('By account'), findsOneWidget);
      expect(find.text('Banco'), findsOneWidget);
      expect(find.text('Ahorros'), findsOneWidget);
      expect(find.text('Préstamo'), findsNothing, reason: 'liabilities are not stacked');
    });

    testWidgets('the months picker asks for another length', (tester) async {
      final env = await open(tester);
      await openEntry(tester, 'Net worth');
      await tester.tap(find.text('36m'));
      await tester.pumpAndSettle();
      expect(lastQuery(env, '/api/reports/net-worth')['months'], '36');
    });
  });

  group('savings', () {
    testWidgets('shows the total saved, the number of accounts and a chart per account', (tester) async {
      final env = await open(tester);
      await openEntry(tester, 'Savings');
      expect(lastQuery(env, '/api/reports/savings')['months'], '12');
      expect(find.text('TOTAL SAVED'), findsOneWidget);
      expect(find.byKey(const Key('saving-a1')), findsOneWidget);
      expect(find.byKey(const Key('saving-a2')), findsOneWidget);
      expect(find.text('Ahorros BHD'), findsOneWidget);
      expect(find.text('RD\$150.00'), findsWidgets);
    });

    testWidgets('the months picker asks for another length and the link opens the excluded accounts', (tester) async {
      final env = await open(tester, handlers: {'GET /api/settings': (o) => jsonBody(settingsJson())});
      await openEntry(tester, 'Savings');
      await tester.tap(find.text('6m'));
      await tester.pumpAndSettle();
      expect(lastQuery(env, '/api/reports/savings')['months'], '6');
      await tester.tap(find.byKey(const Key('manage-excluded')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('server-settings')), findsOneWidget);
    });
  });
}
