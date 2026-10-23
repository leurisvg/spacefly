import 'package:flutter/gestures.dart' show kLongPressTimeout;
import 'package:flutter/material.dart';
import 'package:spacefly_mobile/ui/charts.dart' show SavingsRateChart;
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
        '/api/reports/calendar': report(calendarJson()),
        '/api/reports/calendar/year': report(yearHeatmapJson()),
        '/api/reports/monthly': report(monthlyJson()),
        '/api/reports/annual': report(annualJson()),
        '/api/reports/compare': report(compareJson()),
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

  Future<void> openReport(WidgetTester tester, String entry) async {
    await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text('More')));
    await tester.pumpAndSettle();
    await tester.tap(find.text(entry));
    await tester.pumpAndSettle();
  }

  Map<String, dynamic> lastDrillQuery(TestEnv env) => env.adapter!.requests.lastWhere((r) => r.path == '/api/transactions').queryParameters;

  group('More tab', () {
    testWidgets('lists the reports and opens one over the tab bar', (tester) async {
      await open(tester);
      await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text('More')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('more')), findsOneWidget);
      expect(find.text('Reports'), findsOneWidget);
      for (final entry in ['Monthly summary', 'Annual report', 'Calendar', 'Comparisons']) {
        expect(find.text(entry), findsOneWidget, reason: entry);
      }

      await tester.tap(find.text('Monthly summary'));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('monthly')), findsOneWidget);
      expect(find.byType(NavigationBar), findsNothing);

      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('more')), findsOneWidget);
    });
  });

  group('dashboard calendar', () {
    testWidgets('shows the month, opens a tapped day and links to the full calendar', (tester) async {
      final env = await open(tester);
      expect(find.text('September 2026'), findsWidgets);
      await tester.tap(find.byKey(const Key('day-2026-09-02')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('drill')), findsOneWidget);
      final q = lastDrillQuery(env);
      expect((q['start'], q['end']), ('2026-09-02', '2026-09-02'));

      await closeSheet(tester);
      await tester.pumpAndSettle();
      await tester.tap(find.text('View all').last);
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('calendar')), findsOneWidget);
    });
  });

  group('monthly summary', () {
    testWidgets('shows the highlights, the categories with their change, the budgets and the overview', (tester) async {
      await open(tester);
      await openReport(tester, 'Monthly summary');
      for (final label in ['EARNED', 'SPENT', 'NET CHANGE', 'SAVINGS RATE']) {
        expect(find.text(label), findsWidgets, reason: label);
      }
      expect(find.text('40.0%'), findsOneWidget);
      expect(find.text('Category summary'), findsOneWidget);
      expect(find.text('Food'), findsOneWidget);
      expect(find.text('Uncategorized'), findsOneWidget);
      expect(find.text('vs August 2026'.toUpperCase()), findsOneWidget);
      expect(find.text('New'), findsOneWidget, reason: 'a category without a previous total');
      expect(find.text('−RD\$20.00 ↓50.0%'), findsOneWidget, reason: 'Food went from −40 to −60: spent more (delta −20 is down)');
      expect(find.text('Pets, Gifts'), findsOneWidget);
      final zero = find.ancestor(of: find.text('Pets, Gifts'), matching: find.byType(Row)).first;
      expect(find.descendant(of: zero, matching: find.text('RD\$0.00')), findsOneWidget, reason: 'the categories with nothing add up to zero');
      expect(find.text('Hogar'), findsOneWidget);
      expect(find.text('Ocio'), findsOneWidget);
      expect(find.text('Alquiler'), findsOneWidget);
      expect(find.text('Ahorros'), findsOneWidget);
      expect(find.text('CURRENT NET WORTH'), findsOneWidget);
      expect(find.byKey(const Key('saving-2')), findsOneWidget, reason: 'one small chart per savings account, like the Savings screen');
    });

    testWidgets('opens the transactions of a category and of a budget', (tester) async {
      final env = await open(tester);
      await openReport(tester, 'Monthly summary');
      await tester.tap(find.byKey(const Key('category-1')));
      await tester.pumpAndSettle();
      expect(lastDrillQuery(env)['category'], '1');
      await closeSheet(tester);
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('budget-b1')));
      await tester.pumpAndSettle();
      final q = lastDrillQuery(env);
      expect((q['type'], q['budget']), ('withdrawal', 'b1'));
    });

    testWidgets('unfolds the top transactions of an account', (tester) async {
      await open(tester);
      await openReport(tester, 'Monthly summary');
      expect(find.text('Colmado'), findsNothing);
      await tester.tap(find.byKey(const Key('asset-a1')));
      await tester.pumpAndSettle();
      expect(find.text('Colmado'), findsOneWidget);
      expect(find.text('Top income'.toUpperCase()), findsOneWidget);
      await tester.tap(find.byKey(const Key('asset-a1')));
      await tester.pumpAndSettle();
      expect(find.text('Colmado'), findsNothing);
    });

    testWidgets('says so when the report fails', (tester) async {
      tallScreen(tester);
      final adapter = FakeAdapter((o) => switch (o.path) {
            '/api/reports/monthly' => jsonBody({'error': 'boom'}, 500),
            '/api/meta' => jsonBody(metaJson()),
            '/api/reports/dashboard' => jsonBody(report(dashboardJson())),
            _ => jsonBody({}, 404),
          });
      await TestEnv(config: signedInConfig, adapter: adapter).pumpApp(tester);
      await openReport(tester, 'Monthly summary');
      expect(find.text('Could not load the data'), findsOneWidget);
    });
  });

  group('annual report', () {
    testWidgets('shows the year, the best and worst month and the charts', (tester) async {
      await open(tester);
      await openReport(tester, 'Annual report');
      expect(find.text('Annual report 2026'), findsOneWidget);
      expect(find.text('February 2026'), findsOneWidget);
      expect(find.text('January 2026'), findsOneWidget);
      expect(find.text('Income and expenses by month'), findsOneWidget);
      expect(find.text('Monthly savings rate'), findsOneWidget);
      expect(find.byKey(const Key('matrix')), findsOneWidget);
      expect(find.text('Rent'), findsOneWidget);
      expect(find.byType(SavingsRateChart), findsOneWidget, reason: 'columns, with no column for January: it had no income');
      expect(find.descendant(of: find.byKey(const Key('chart-legend')), matching: find.text('Net')), findsOneWidget);
    });

    testWidgets('holding a matrix cell tells its category, month and amount', (tester) async {
      await open(tester);
      await openReport(tester, 'Annual report');
      final matrix = find.byKey(const Key('matrix'));
      await tester.ensureVisible(matrix);
      await tester.pumpAndSettle();
      // the matrix scrolls sideways: cell (row 2, col 0) is Rent in January
      final gesture = await tester.startGesture(tester.getTopLeft(matrix) + const Offset(22, 18 + 28 * 2 + 14));
      await tester.pump(kLongPressTimeout + const Duration(milliseconds: 100));
      expect(find.text('Rent · January 2026\nRD\$100.00'), findsOneWidget);
      await gesture.up();
    });

    testWidgets('a tapped matrix cell opens its category and month', (tester) async {
      final env = await open(tester);
      await openReport(tester, 'Annual report');
      await tester.ensureVisible(find.byKey(const Key('matrix')));
      await tester.pumpAndSettle();
      final origin = tester.getTopLeft(find.byKey(const Key('matrix')));
      // Header is 18 high, cells 28 × 44: the second month of the third category.
      await tester.tapAt(origin + const Offset(44 + 22, 18 + 28 * 2 + 14));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('drill')), findsOneWidget);
      expect(find.text('Rent · February 2026'), findsOneWidget);
      final q = lastDrillQuery(env);
      expect((q['start'], q['end'], q['category'], q['type']), ('2026-02-01', '2026-02-28', '3', 'withdrawal'));
    });
  });

  group('calendar', () {
    testWidgets('shows the month with its totals, scheduled items and running balance', (tester) async {
      await open(tester);
      await openReport(tester, 'Calendar');
      expect(find.text('Closing balance'.toUpperCase()), findsOneWidget);
      expect(find.text('RD\$60.00'), findsWidgets);
      expect(find.text('Daily cash flow'), findsOneWidget);
      expect(find.text('Running balance'), findsOneWidget);
      expect(find.text('Scheduled this month'), findsOneWidget);
      expect(find.text('Netflix'), findsOneWidget);
      expect(find.text('+RD\$500.00'), findsOneWidget);
      expect(find.text('−RD\$15.00'), findsOneWidget);
    });

    testWidgets('holding a day shows what it holds', (tester) async {
      await open(tester);
      await openReport(tester, 'Calendar');
      await tester.longPress(find.byKey(const Key('day-2026-09-02')));
      await tester.pumpAndSettle();
      final tip = tester.widget<Tooltip>(find.ancestor(of: find.byKey(const Key('day-2026-09-02')), matching: find.byType(Tooltip)).first).message!;
      expect(find.text(tip), findsOneWidget);
      expect(tip, contains('RD\$40.00'));
    });

    testWidgets('holding a day of the year heatmap shows its date and spending', (tester) async {
      await open(tester);
      await openReport(tester, 'Calendar');
      await tester.tap(find.text('Year'));
      await tester.pumpAndSettle();
      final box = find.byKey(const Key('year-heatmap'));
      final cellWidth = (tester.getSize(box).width - 40) / 7;
      final gesture = await tester.startGesture(tester.getTopLeft(box) + Offset(40 + cellWidth * 3 + cellWidth / 2, 18 + 11));
      await tester.pump(kLongPressTimeout + const Duration(milliseconds: 100));
      expect(find.textContaining('January 1, 2026'), findsOneWidget);
      expect(find.textContaining('Expenses'), findsWidgets);
      await gesture.up();
    });

    testWidgets('a tapped day opens its transactions within the chosen account', (tester) async {
      final env = await open(tester);
      await openReport(tester, 'Calendar');
      await tester.tap(find.byKey(const Key('filter-account')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('option-a1')));
      await tester.pumpAndSettle();
      expect(env.adapter!.requests.lastWhere((r) => r.path == '/api/reports/calendar').queryParameters['account'], 'a1');

      await tester.tap(find.byKey(const Key('day-2026-09-02')));
      await tester.pumpAndSettle();
      final q = lastDrillQuery(env);
      expect((q['start'], q['end'], q['account']), ('2026-09-02', '2026-09-02', 'a1'));
    });

    testWidgets('the year view draws the heatmap and a tapped cell opens its day', (tester) async {
      final env = await open(tester);
      await openReport(tester, 'Calendar');
      await tester.tap(find.text('Year'));
      await tester.pumpAndSettle();
      expect(find.text('Spending intensity 2026'), findsOneWidget);
      expect(find.byKey(const Key('year-heatmap')), findsOneWidget);
      expect(env.adapter!.requests.where((r) => r.path == '/api/reports/calendar/year'), isNotEmpty);

      // 2026-01-01 is a Thursday: week 0, column 3. Label column is 40 wide, the weekday header 18 high.
      final box = find.byKey(const Key('year-heatmap'));
      final origin = tester.getTopLeft(box);
      final cellWidth = (tester.getSize(box).width - 40) / 7;
      await tester.tapAt(origin + Offset(40 + cellWidth * 3 + cellWidth / 2, 18 + 11));
      await tester.pumpAndSettle();
      final q = lastDrillQuery(env);
      expect((q['start'], q['end']), ('2026-01-01', '2026-01-01'));
    });
  });

  group('compare', () {
    testWidgets('shows both periods, the biggest changes and the table', (tester) async {
      await open(tester);
      await openReport(tester, 'Comparisons');
      expect(find.text('vs previous period'), findsOneWidget);
      expect(find.text('Biggest changes (A − B)'), findsOneWidget);
      expect(find.byKey(const Key('diverging-0')), findsOneWidget);
      expect(find.byKey(const Key('diverging-1')), findsOneWidget);
      expect(find.byKey(const Key('diverging-2')), findsNothing, reason: 'a category without activity in either period is left out');
      expect(find.text('A RD\$40.00  ·  B RD\$50.00'), findsOneWidget);
      expect(find.text('−20.0%'), findsOneWidget);
      expect(find.text('12-month trend'), findsOneWidget);
    });

    testWidgets('a tapped bar opens its category; income and a custom B refetch', (tester) async {
      final env = await open(tester);
      await openReport(tester, 'Comparisons');
      await tester.tap(find.byKey(const Key('diverging-0')));
      await tester.pumpAndSettle();
      final q = lastDrillQuery(env);
      expect((q['type'], q['category']), ('withdrawal', '1'));
      await closeSheet(tester);
      await tester.pumpAndSettle();

      await tester.tap(find.descendant(of: find.byType(SegmentedButton<String>).first, matching: find.text('Income')));
      await tester.pumpAndSettle();
      expect(env.adapter!.requests.lastWhere((r) => r.path == '/api/reports/compare').queryParameters['kind'], 'income');

      await tester.tap(find.byKey(const Key('mode-yoy')));
      await tester.pumpAndSettle();
      final request = env.adapter!.requests.lastWhere((r) => r.path == '/api/reports/compare').queryParameters;
      expect((request['bStart'], request['bEnd']), ('2025-09-01', '2025-09-30'));

      await tester.tap(find.byKey(const Key('mode-custom')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('period-b')), findsOneWidget);
    });

    testWidgets('groups by another dimension through the picker', (tester) async {
      final env = await open(tester);
      await openReport(tester, 'Comparisons');
      await tester.tap(find.byKey(const Key('group-by')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('option-tag')));
      await tester.pumpAndSettle();
      expect(env.adapter!.requests.lastWhere((r) => r.path == '/api/reports/compare').queryParameters['groupBy'], 'tag');
    });
  });
}
