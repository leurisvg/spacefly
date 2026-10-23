import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';
import 'package:spacefly_mobile/screens/login_screen.dart';

import 'fixtures.dart';
import 'support.dart';

void main() {
  setUpAll(initFormats);

  /// A phone-sized screen tall enough to lay a long list out without scrolling.
  void tallScreen(WidgetTester tester) {
    tester.view.physicalSize = const Size(1080, 4200);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);
  }

  FakeAdapter server() => fakeServer({
        '/api/meta': metaJson(),
        '/api/lookups': lookupsJson(),
        '/api/reports/dashboard': report(dashboardJson()),
        '/api/reports/accounts': report(accountsJson()),
        '/api/transactions': report({
          'rows': [txJson(id: '1', description: 'Supermercado'), txJson(id: '2', description: 'Sueldo', type: 'deposit', amount: 5000, category: null, date: '2026-09-02')],
          'totals': {'income': 5000, 'expense': 100, 'transfer': 0},
        }),
        '/api/transactions/1': txEditJson(id: '1'),
        '/api/search': report({'rows': [txJson(id: '8', description: 'Hallazgo')], 'page': 1, 'totalPages': 2, 'total': 12}),
      });

  Future<TestEnv> open(WidgetTester tester, {AppLocale lang = AppLocale.en}) async {
    tallScreen(tester);
    final env = TestEnv(config: signedInConfig, adapter: server());
    await env.pumpApp(tester);
    return env;
  }

  Future<void> tapTab(WidgetTester tester, String label) async {
    await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text(label)));
    await tester.pumpAndSettle();
  }

  group('dashboard', () {
    testWidgets('shows the KPIs, the charts, the budgets, the subscriptions and the largest expense', (tester) async {
      await open(tester);
      for (final label in ['INCOME', 'EXPENSES', 'NET', 'SAVINGS RATE', 'NET WORTH']) {
        expect(find.text(label), findsOneWidget, reason: label);
      }
      expect(find.text('RD\$100.00'), findsWidgets);
      expect(find.text('60.0%'), findsOneWidget, reason: 'the savings rate is a percentage');
      expect(find.text('Income vs expenses'), findsOneWidget);
      expect(find.text('Top spending categories'), findsOneWidget);
      expect(find.text('Food'), findsOneWidget);
      expect(find.text('Others'), findsOneWidget);
      expect(find.text('Hogar'), findsOneWidget);
      expect(find.text('Netflix'), findsOneWidget);
      expect(find.text('Alquiler'), findsOneWidget);
    });

    testWidgets('a chart can be seen as a table and shared as a CSV', (tester) async {
      final env = await open(tester);
      await tester.tap(find.byKey(const Key('chart-toggle-dashboard-top-categories')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('chart-table-dashboard-top-categories')), findsOneWidget);
      expect(find.byKey(const Key('slice-0')), findsNothing, reason: 'the table replaces the chart');
      expect(find.text('Category'), findsOneWidget);

      await tester.tap(find.byKey(const Key('chart-share-dashboard-top-categories')));
      await tester.pumpAndSettle();
      expect(env.share.shared.single.fileName, 'spacefly-dashboard-top-categories.csv');
      expect(env.share.shared.single.text, contains('Category,Amount'));
      expect(env.share.shared.single.text, contains('Food,'));
    });

    testWidgets('budgets, subscriptions and the calendar each have a "View all"', (tester) async {
      await open(tester);
      await tester.scrollUntilVisible(find.text('Upcoming subscriptions'), 300, scrollable: find.byType(Scrollable).first);
      expect(find.text('View all'), findsAtLeastNWidgets(2));
      await tester.tap(find.text('View all').first);
      await tester.pumpAndSettle();
      expect(find.text('Budgets'), findsWidgets);
    });

    testWidgets('a tapped category opens the drill-down of its expenses', (tester) async {
      final env = await open(tester);
      await tester.tap(find.byKey(const Key('slice-0')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('drill')), findsOneWidget);
      expect(find.descendant(of: find.byKey(const Key('drill')), matching: find.text('Food')), findsOneWidget);
      final totals = find.byKey(const Key('drill-totals'));
      expect(totals, findsOneWidget, reason: 'what the list adds up to, under the title');
      expect(find.descendant(of: totals, matching: find.textContaining('Transactions')), findsOneWidget);
      expect(find.byType(BottomSheet), findsOneWidget);
      final request = env.adapter!.requests.lastWhere((r) => r.path == '/api/transactions');
      expect((request.queryParameters['type'], request.queryParameters['category']), ('withdrawal', '1'));
      expect(find.text('Supermercado'), findsOneWidget);

      await closeSheet(tester);
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('dashboard')), findsOneWidget);
    });

    testWidgets('the folded "Others" slice opens a breakdown of its members', (tester) async {
      await open(tester);
      await tester.tap(find.byKey(const Key('slice-1')));
      await tester.pumpAndSettle();
      expect(find.text('Categories in this group'), findsOneWidget);
      expect(find.text('Pets'), findsOneWidget);
    });

    testWidgets('the period bar moves the period and refetches', (tester) async {
      final env = await open(tester);
      // The calendar card is titled with the month too: look at the period bar only.
      Finder label(String text) => find.descendant(of: find.byKey(const Key('period-label')), matching: find.text(text));
      expect(label('September 2026'), findsOneWidget);
      await tester.tap(find.byKey(const Key('period-next')));
      await tester.pumpAndSettle();
      expect(label('October 2026'), findsOneWidget);
      final request = env.adapter!.requests.lastWhere((r) => r.path == '/api/reports/dashboard');
      expect((request.queryParameters['start'], request.queryParameters['end']), ('2026-10-01', '2026-10-31'));

      await tester.tap(find.byKey(const Key('period-label')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('preset-lastMonth')));
      await tester.pumpAndSettle();
      expect(label('August 2026'), findsOneWidget);
    });

    testWidgets('privacy mode shows every amount as 0', (tester) async {
      await open(tester);
      expect(find.text('RD\$100.00'), findsWidgets);
      await tester.tap(find.byKey(const Key('privacy')));
      await tester.pumpAndSettle();
      expect(find.text('RD\$100.00'), findsNothing);
      expect(find.text('RD\$0.00'), findsWidgets);
    });

    testWidgets('a failed load says so and can be retried', (tester) async {
      tallScreen(tester);
      var fail = true;
      final adapter = FakeAdapter((o) => switch (o.path) {
            '/api/reports/dashboard' => fail ? jsonBody({'error': 'boom'}, 500) : jsonBody(report(dashboardJson())),
            '/api/meta' => jsonBody(metaJson()),
            _ => jsonBody({}, 404),
          });
      await TestEnv(config: signedInConfig, adapter: adapter).pumpApp(tester);
      expect(find.text('Could not load the data'), findsOneWidget);

      fail = false;
      await tester.tap(find.text('Refresh data'));
      await tester.pumpAndSettle();
      expect(find.text('INCOME'), findsOneWidget);
    });
  });

  group('transactions', () {
    testWidgets('lists the period with its totals and opens a transaction', (tester) async {
      await open(tester);
      await tapTab(tester, 'Transactions');
      expect(find.text('Supermercado'), findsOneWidget);
      expect(find.text('Sueldo'), findsOneWidget);
      expect(find.text('2 results'), findsOneWidget);
      expect(find.text('+RD\$100.00'), findsNothing);
      expect(find.text('−RD\$100.00'), findsWidgets);

      await tester.tap(find.text('Supermercado'));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('tx-detail')), findsOneWidget);
      expect(find.text('Cena'), findsOneWidget);
      expect(find.text('Restaurante'), findsOneWidget);
      expect(find.text('−RD\$250.00'), findsOneWidget);
      expect(find.text('Con la familia'), findsOneWidget);
      expect(find.text('#familia'), findsOneWidget);
    });

    testWidgets('sorts by a column, toggling its direction', (tester) async {
      await open(tester);
      await tapTab(tester, 'Transactions');
      double top(String text) => tester.getTopLeft(find.text(text)).dy;
      expect(top('Supermercado'), lessThan(top('Sueldo')), reason: 'newest first');
      await tester.tap(find.byKey(const Key('sort-date')));
      await tester.pumpAndSettle();
      expect(top('Sueldo'), lessThan(top('Supermercado')));
    });

    testWidgets('filters by type through the filter sheet', (tester) async {
      final env = await open(tester);
      await tapTab(tester, 'Transactions');
      await tester.tap(find.byKey(const Key('filters')));
      await tester.pumpAndSettle();
      await tester.tap(find.descendant(of: find.byKey(const Key('filter-type')), matching: find.text('Income')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('filters-apply')));
      await tester.pumpAndSettle();
      final request = env.adapter!.requests.lastWhere((r) => r.path == '/api/transactions');
      expect(request.queryParameters['type'], 'deposit');
      expect(find.text('1'), findsOneWidget, reason: 'the filter badge counts the active filters');
    });

    testWidgets('each filter says what "no filter" means in its own words', (tester) async {
      await open(tester);
      await tapTab(tester, 'Transactions');
      await tester.tap(find.byKey(const Key('filters')));
      await tester.pumpAndSettle();
      for (final all in ['All categories', 'All budgets', 'All accounts', 'All tags']) {
        expect(find.text(all), findsOneWidget, reason: all);
      }
    });

    testWidgets('the filters step aside while Firefly\'s own search is on', (tester) async {
      await open(tester);
      await tapTab(tester, 'Transactions');
      await tester.enterText(find.byKey(const Key('search')), 'amount_more:500');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('filters')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('filter-type')), findsOneWidget);
      await tester.tap(find.byType(Switch));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('filter-type')), findsNothing);
      expect(find.byKey(const Key('filter-category')), findsNothing);
    });

    testWidgets('searches Firefly with its syntax and pages through the results', (tester) async {
      final env = await open(tester);
      await tapTab(tester, 'Transactions');
      await tester.tap(find.byKey(const Key('filters')));
      await tester.pumpAndSettle();
      await tester.tap(find.byType(Switch));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('filters-apply')));
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('search')), 'amount_more:500');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();
      final request = env.adapter!.requests.lastWhere((r) => r.path == '/api/search');
      expect(request.queryParameters['query'], 'amount_more:500');
      expect(find.text('Hallazgo'), findsOneWidget);
      expect(find.text('12 results'), findsOneWidget);
      expect(find.text('Page 1 of 2'), findsOneWidget);
    });
  });

  group('accounts', () {
    testWidgets('shows the total, each account and the history', (tester) async {
      await open(tester);
      await tapTab(tester, 'Accounts');
      expect(find.text('RD\$300.00'), findsOneWidget);
      expect(find.text('Banco'), findsWidgets);
      expect(find.text('Ahorros'), findsWidgets);
      expect(find.text('DOP · Savings'), findsOneWidget);
      expect(find.text('Balance history'), findsOneWidget);
      expect(find.text('Current balances and how they evolved.'), findsOneWidget);
      expect(find.byKey(const Key('account-dot-1')), findsOneWidget, reason: 'each account has the color of its line');
      expect(find.byKey(const Key('account-dot-2')), findsOneWidget);
    });

    testWidgets('changes how many months of history it asks for', (tester) async {
      final env = await open(tester);
      await tapTab(tester, 'Accounts');
      await tester.tap(find.descendant(of: find.byKey(const Key('history-months')), matching: find.text('24m')));
      await tester.pumpAndSettle();
      expect(env.adapter!.requests.lastWhere((r) => r.path == '/api/reports/accounts').queryParameters['months'], '24');
    });
  });

  group('settings', () {
    testWidgets('picks the display currency, which the reports then use', (tester) async {
      final env = await open(tester);
      await tapTab(tester, 'Settings');
      await tester.tap(find.descendant(of: find.byKey(const Key('display-currency')), matching: find.text('USD')));
      await tester.pumpAndSettle();
      expect(env.prefs.values['spacefly.currency'], 'USD');
      await tapTab(tester, 'Dashboard');
      expect(env.adapter!.requests.lastWhere((r) => r.path == '/api/reports/dashboard').queryParameters['currency'], 'USD');
      expect(find.text('US\$100.00'), findsWidgets);
    });

    testWidgets('hides amounts from the switch', (tester) async {
      final env = await open(tester);
      await tapTab(tester, 'Settings');
      await tester.tap(find.byKey(const Key('privacy-switch')));
      await tester.pumpAndSettle();
      expect(env.prefs.values['spacefly.privacy'], '1');
    });
  });

  testWidgets('a 401 from the API sends the user back to the login screen', (tester) async {
    tallScreen(tester);
    final adapter = FakeAdapter((o) => switch (o.path) {
          '/api/meta' => jsonBody(metaJson()),
          _ => jsonBody({'error': 'unauthorized'}, 401),
        });
    final env = TestEnv(config: signedInConfig, adapter: adapter);
    await env.pumpApp(tester);
    expect(find.byType(LoginScreen), findsOneWidget);
    expect(env.secure.values.containsKey('spacefly.token'), isFalse);
  });
}
