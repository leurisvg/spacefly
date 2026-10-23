import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';

import 'fixtures.dart';
import 'support.dart';

void main() {
  setUpAll(initFormats);
  setUp(() => LocaleSettings.setLocaleSync(AppLocale.en));

  void tallScreen(WidgetTester tester) {
    tester.view.physicalSize = const Size(1080, 6000);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);
  }

  FakeAdapter server() => fakeServer({
        '/api/meta': metaJson(),
        '/api/lookups': lookupsJson(),
        '/api/reports/dashboard': report(dashboardJson()),
        '/api/reports/monthly': report(monthlyJson()),
        '/api/reports/calendar': report(calendarJson()),
        '/api/reports/sankey': report(sankeyJson()),
        '/api/reports/ranking': report(rankingJson()),
        '/api/reports/budgets': report(budgetsJson()),
        '/api/transactions': report({
          'rows': [txJson(id: '1', description: 'Supermercado')],
          'totals': {'income': 0, 'expense': 100, 'transfer': 0},
        }),
      });

  Future<TestEnv> open(WidgetTester tester) async {
    tallScreen(tester);
    final env = TestEnv(config: signedInConfig, adapter: server());
    await env.pumpApp(tester);
    return env;
  }

  Future<void> openEntry(WidgetTester tester, String entry) async {
    await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text('More')));
    await tester.pumpAndSettle();
    await tester.tap(find.text(entry));
    await tester.pumpAndSettle();
  }

  Map<String, dynamic> lastQuery(TestEnv env, String path) => env.adapter!.requests.lastWhere((r) => r.path == path).queryParameters;

  group('More tab', () {
    testWidgets('lists the flow and the analysis screens', (tester) async {
      await open(tester);
      await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text('More')));
      await tester.pumpAndSettle();
      for (final entry in ['Money flow', 'Analysis', 'Categories', 'Tags', 'Budgets', 'Merchants', 'Income sources']) {
        expect(find.text(entry), findsOneWidget, reason: entry);
      }
    });

    testWidgets('the monthly summary links to the money flow', (tester) async {
      await open(tester);
      await openEntry(tester, 'Monthly summary');
      await tester.ensureVisible(find.byKey(const Key('open-flow')));
      await tester.tap(find.byKey(const Key('open-flow')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('flow')), findsOneWidget);
    });
  });

  group('money flow', () {
    testWidgets('shows the totals, the chart, its legend and every link', (tester) async {
      await open(tester);
      await openEntry(tester, 'Money flow');
      expect(find.byKey(const Key('flow')), findsOneWidget);
      expect(find.text('SAVINGS'), findsOneWidget);
      expect(find.byKey(const Key('sankey')), findsOneWidget);
      for (final kind in ['Income source', 'Total', 'Budget', 'Expense category', 'Savings']) {
        expect(find.text(kind), findsWidgets, reason: kind);
      }
      expect(find.text('Salary → Total income'), findsOneWidget);
      expect(find.text('Total income → Savings'), findsOneWidget);
    });

    testWidgets('opens the transactions behind the target of a link', (tester) async {
      final env = await open(tester);
      await openEntry(tester, 'Money flow');
      await tester.ensureVisible(find.byKey(const Key('flow-link-2')));
      await tester.tap(find.byKey(const Key('flow-link-2')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('drill')), findsOneWidget);
      final q = lastQuery(env, '/api/transactions');
      expect((q['type'], q['category']), ('withdrawal', '1'));
      await closeSheet(tester);

      await tester.tap(find.byKey(const Key('flow-link-0')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('drill')), findsNothing, reason: 'the hub has no transactions of its own');
    });

    testWidgets('asks again when the mode, a switch or the threshold changes', (tester) async {
      final env = await open(tester);
      await openEntry(tester, 'Money flow');
      expect(lastQuery(env, '/api/reports/sankey')['mode'], 'budget');

      await tester.tap(find.byKey(const Key('flow-budgets')));
      await tester.pumpAndSettle();
      expect(lastQuery(env, '/api/reports/sankey')['budgets'], '0');

      await tester.tap(find.byKey(const Key('flow-income-categories')));
      await tester.pumpAndSettle();
      expect(lastQuery(env, '/api/reports/sankey')['incomeCategories'], '0');

      tester.widget<Slider>(find.byKey(const Key('threshold-slider'))).onChangeEnd!(0.05);
      await tester.pumpAndSettle();
      expect(lastQuery(env, '/api/reports/sankey')['threshold'], 0.05);

      await tester.tap(find.text('By tags'));
      await tester.pumpAndSettle();
      expect(lastQuery(env, '/api/reports/sankey')['mode'], 'tags');
      expect(find.byKey(const Key('flow-budgets')), findsNothing, reason: 'budgets only exist in the budget view');
    });

    testWidgets('says so when the report fails', (tester) async {
      tallScreen(tester);
      final adapter = FakeAdapter((o) => switch (o.path) {
            '/api/reports/sankey' => jsonBody({'error': 'boom'}, 500),
            '/api/meta' => jsonBody(metaJson()),
            '/api/reports/dashboard' => jsonBody(report(dashboardJson())),
            _ => jsonBody({}, 404),
          });
      await TestEnv(config: signedInConfig, adapter: adapter).pumpApp(tester);
      await openEntry(tester, 'Money flow');
      expect(find.text('Could not load the data'), findsOneWidget);
    });
  });

  group('ranking', () {
    testWidgets('shows the summary, the bars, the trend and the table of the categories', (tester) async {
      final env = await open(tester);
      await openEntry(tester, 'Categories');
      final q = lastQuery(env, '/api/reports/ranking');
      expect((q['by'], q['kind']), ('category', 'expense'));
      expect(find.text('AVERAGE TICKET'), findsOneWidget);
      expect(find.text('RD\$150.00'), findsOneWidget, reason: 'the total');
      expect(find.byKey(const Key('rank-bar-0')), findsOneWidget);
      expect(find.text('Top items, last 12 months'), findsOneWidget);
      expect(find.byKey(const Key('rank-row-1')), findsOneWidget);
      expect(find.text('Uncategorized'), findsWidgets);
    });

    testWidgets('a row that changed says which way with an arrow, not only a color', (tester) async {
      await open(tester);
      await openEntry(tester, 'Categories');
      final up = find.descendant(of: find.byKey(const Key('rank-delta-0')), matching: find.byIcon(Icons.arrow_upward));
      await tester.ensureVisible(find.byKey(const Key('rank-delta-0')));
      expect(up, findsOneWidget, reason: 'Food went from 80 to 100');
      expect(find.byKey(const Key('rank-delta-1')), findsNothing, reason: 'nothing to compare the second row with');
    });

    testWidgets('opens the transactions of a bar and of a row', (tester) async {
      final env = await open(tester);
      await openEntry(tester, 'Categories');
      await tester.tap(find.byKey(const Key('rank-bar-0')));
      await tester.pumpAndSettle();
      var q = lastQuery(env, '/api/transactions');
      expect((q['type'], q['category']), ('withdrawal', '1'));
      await closeSheet(tester);

      await tester.ensureVisible(find.byKey(const Key('rank-row-1')));
      await tester.tap(find.byKey(const Key('rank-row-1')));
      await tester.pumpAndSettle();
      q = lastQuery(env, '/api/transactions');
      expect(q['category'], 'none');
    });

    testWidgets('switches between bars and the treemap, and offers the budget sunburst for expense categories', (tester) async {
      final env = await open(tester);
      await openEntry(tester, 'Categories');
      expect(find.byKey(const Key('treemap')), findsNothing);
      await tester.tap(find.text('Treemap'));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('treemap')), findsOneWidget);
      expect(find.byKey(const Key('rank-bar-0')), findsNothing);

      expect(env.adapter!.requests.where((r) => r.path == '/api/reports/budgets'), isEmpty);
      await tester.tap(find.text('Budgets').last);
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('sunburst')), findsOneWidget);
      expect(env.adapter!.requests.where((r) => r.path == '/api/reports/budgets'), isNotEmpty);
      expect(find.text('Hogar'), findsWidgets);
      expect(find.text('No budget'), findsWidgets);

      // a tap in the inner ring (the second group, "Ocio") names that slice under the chart; the hole goes back to the whole
      expect(find.descendant(of: find.byKey(const Key('sunburst-caption')), matching: find.text('Budgets')), findsOneWidget);
      await tester.tapAt(tester.getCenter(find.byKey(const Key('sunburst'))) + const Offset(30, -10));
      await tester.pumpAndSettle();
      expect(find.descendant(of: find.byKey(const Key('sunburst-caption')), matching: find.text('Ocio')), findsOneWidget);
      await tester.tapAt(tester.getCenter(find.byKey(const Key('sunburst'))));
      await tester.pumpAndSettle();
      expect(find.descendant(of: find.byKey(const Key('sunburst-caption')), matching: find.text('Budgets')), findsOneWidget);
    });

    testWidgets('switches the side of the categories and asks again', (tester) async {
      final env = await open(tester);
      await openEntry(tester, 'Categories');
      await tester.tap(find.descendant(of: find.byKey(const Key('ranking-kind')), matching: find.text('Income')));
      await tester.pumpAndSettle();
      expect(lastQuery(env, '/api/reports/ranking')['kind'], 'income');
      expect(find.text('Budgets'), findsNothing, reason: 'the sunburst is for expenses only');
    });

    testWidgets('merchants and income sources group by counterparty and pin their side', (tester) async {
      final env = await open(tester);
      await openEntry(tester, 'Merchants');
      var q = lastQuery(env, '/api/reports/ranking');
      expect((q['by'], q['kind']), ('counterparty', 'expense'));
      expect(find.byKey(const Key('ranking-kind')), findsNothing);
      await tester.pageBack();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Income sources'));
      await tester.pumpAndSettle();
      q = lastQuery(env, '/api/reports/ranking');
      expect((q['by'], q['kind']), ('counterparty', 'income'));
    });
  });

  group('budgets', () {
    testWidgets('shows the totals, each budget with its pace, and the history of the first', (tester) async {
      await open(tester);
      await openEntry(tester, 'Budgets');
      expect(find.text('TOTAL LIMIT'), findsOneWidget);
      expect(find.text('RD\$300.00'), findsWidgets);
      expect(find.byKey(const Key('budget-b1')), findsOneWidget);
      expect(find.byKey(const Key('budget-b2')), findsOneWidget);
      expect(find.byKey(const Key('meter-marker')), findsNWidgets(2), reason: 'the expected pace, as the period is half over');
      expect(find.text('Hogar · last 12 months'), findsOneWidget);
      expect(find.text('Hogar by category'), findsOneWidget);
      expect(find.text('Auto · reset'), findsOneWidget);
      expect(find.textContaining('Projected at period end:'), findsOneWidget);
      expect(find.textContaining('over by RD\$60.00'), findsOneWidget);
    });

    testWidgets('picking a budget shows its history and categories', (tester) async {
      await open(tester);
      await openEntry(tester, 'Budgets');
      await tester.tap(find.byKey(const Key('budget-b2')));
      await tester.pumpAndSettle();
      expect(find.text('Ocio · last 12 months'), findsOneWidget);
      expect(find.text('Ocio by category'), findsOneWidget);
      expect(find.text('Cine'), findsOneWidget);
    });

    testWidgets('opens the transactions of a budget and of one of its categories', (tester) async {
      final env = await open(tester);
      await openEntry(tester, 'Budgets');
      await tester.tap(find.byKey(const Key('budget-open-b2')));
      await tester.pumpAndSettle();
      var q = lastQuery(env, '/api/transactions');
      expect((q['type'], q['budget']), ('withdrawal', 'b2'));
      await closeSheet(tester);

      await tester.ensureVisible(find.byKey(const Key('rank-bar-0')));
      await tester.tap(find.byKey(const Key('rank-bar-0')));
      await tester.pumpAndSettle();
      q = lastQuery(env, '/api/transactions');
      expect((q['budget'], q['category']), ('b1', '9'));
    });
  });
}
