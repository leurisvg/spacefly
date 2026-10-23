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

  FakeAdapter server({bool oldFirefly = false}) => FakeAdapter((o) {
        return switch (o.path) {
          '/api/meta' => jsonBody({...metaJson(), if (oldFirefly) 'fireflyVersion': '5.2.0', if (oldFirefly) 'fireflyVersionOk': false}),
          '/api/lookups' => jsonBody(lookupsJson()),
          '/api/lookups/editor' => jsonBody(editorLookupsJson()),
          '/api/reports/dashboard' => jsonBody(report(dashboardJson())),
          '/api/reports/bills' => jsonBody(report(billsJson())),
          '/api/reports/recurrences' => jsonBody(report(recurrencesJson())),
          '/api/reports/piggy-banks' => jsonBody(report(piggyBanksJson())),
          '/api/reports/projection' => jsonBody(report(projectionJson())),
          '/api/transactions' => jsonBody(report({'rows': [txJson(id: '1', description: 'Netflix')], 'totals': {'income': 0, 'expense': 10, 'transfer': 0}})),
          '/api/bills/2' => jsonBody({'id': '2', 'name': 'Seguro', 'amountMin': '40.00', 'amountMax': '60.00', 'currency': 'DOP', 'date': '2026-01-01', 'repeatFreq': 'quarterly', 'skip': 1, 'endDate': null, 'active': true, 'group': null, 'notes': null}),
          '/api/piggy-banks/p1' => jsonBody({'id': 'p1', 'name': 'Viaje', 'currency': 'DOP', 'targetAmount': '1000.00', 'startDate': null, 'targetDate': null, 'group': null, 'notes': null, 'accounts': [{'accountId': '1', 'currentAmount': '400.00'}]}),
          _ => jsonBody({'error': 'not_found'}, 404),
        };
      });

  Future<TestEnv> open(WidgetTester tester, {bool oldFirefly = false}) async {
    tallScreen(tester);
    final env = TestEnv(config: signedInConfig, adapter: server(oldFirefly: oldFirefly));
    await env.pumpApp(tester);
    return env;
  }

  Future<void> openEntry(WidgetTester tester, String entry) async {
    await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text('More')));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text(entry));
    await tester.tap(find.text(entry));
    await tester.pumpAndSettle();
  }

  Map<String, dynamic> lastQuery(TestEnv env, String path) => env.adapter!.requests.lastWhere((r) => r.path == path).queryParameters;

  group('More tab', () {
    testWidgets('lists planning and the about screen, in the order of the web sidebar', (tester) async {
      await open(tester);
      await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text('More')));
      await tester.pumpAndSettle();
      for (final entry in ['Planning', 'Subscriptions', 'Recurring', 'Goals', 'Cash-flow projection', 'System', 'About']) {
        await tester.ensureVisible(find.text(entry).first);
        expect(find.text(entry), findsWidgets, reason: entry);
      }
      final order = [for (final s in ['Reports', 'Analysis', 'Accounts', 'Planning', 'Create', 'System']) tester.getTopLeft(find.text(s).first).dy];
      expect(order, everyElement(isA<double>()));
    });
  });

  group('subscriptions', () {
    testWidgets('shows what they cost, each with its status, and the yearly ranking', (tester) async {
      await open(tester);
      await openEntry(tester, 'Subscriptions');
      expect(find.text('MONTHLY EQUIVALENT COST'), findsOneWidget);
      expect(find.text('PENDING (1)'), findsOneWidget);
      expect(find.byKey(const Key('bill-1')), findsOneWidget);
      expect(find.text('Paid'), findsWidgets);
      expect(find.text('Out of range'), findsOneWidget);
      expect(find.text('Quarterly · every 1'), findsOneWidget);
      expect(find.text('Not due'), findsOneWidget);
      expect(find.text('Yearly cost per subscription'), findsOneWidget);
      expect(find.byKey(const Key('rank-bar-0')), findsOneWidget);
    });

    testWidgets('a subscription opens its payments and a ranking bar opens the year with the period to switch to', (tester) async {
      final env = await open(tester);
      await openEntry(tester, 'Subscriptions');
      await tester.tap(find.byKey(const Key('bill-1')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('drill')), findsOneWidget);
      expect(lastQuery(env, '/api/transactions')['bill'], '1');
      await closeSheet(tester);

      await tester.ensureVisible(find.byKey(const Key('rank-bar-0')));
      await tester.tap(find.byKey(const Key('rank-bar-0')));
      await tester.pumpAndSettle();
      final q = lastQuery(env, '/api/transactions');
      expect((q['bill'], q['start'], q['end']), ('2', '2025-09-16', '2026-09-15'));
      expect(find.text('Last 12 months'), findsOneWidget);
      expect(find.text('Selected period'), findsOneWidget);
      await tester.tap(find.text('Selected period'));
      await tester.pumpAndSettle();
      expect(lastQuery(env, '/api/transactions')['start'], '2026-09-01');
    });

    testWidgets('the plus creates a subscription and the pencil edits one', (tester) async {
      await open(tester);
      await openEntry(tester, 'Subscriptions');
      await tester.tap(find.byKey(const Key('bill-edit-2')));
      await tester.pumpAndSettle();
      expect(find.text('Edit subscription'), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('bill-new')));
      await tester.pumpAndSettle();
      expect(find.text('New subscription'), findsWidgets);
    });
  });

  group('recurring', () {
    testWidgets('shows each recurrence with its amount, kind, repetition and next dates', (tester) async {
      final env = await open(tester);
      await openEntry(tester, 'Recurring');
      expect(lastQuery(env, '/api/reports/recurrences').containsKey('start'), isFalse);
      expect(find.byKey(const Key('recurrence-r1')), findsOneWidget);
      expect(find.text('Empresa SRL → Banco'), findsOneWidget);
      expect(find.text('+RD\$900.00'), findsOneWidget);
      expect(find.text('−RD\$300.00'), findsOneWidget);
      expect(find.text('RD\$50.00'), findsOneWidget, reason: 'a transfer is unsigned');
      expect(find.text('monthly on day 15'), findsOneWidget);
      expect(find.text('Inactive'), findsOneWidget);
      expect(find.text('Until January 1, 2027'), findsOneWidget);
      expect(find.text('Tue, Sep 15'), findsNothing);
      expect(find.text('Sep 15'), findsOneWidget);
    });
  });

  group('goals', () {
    testWidgets('shows what is saved, each goal with its progress, pace and whether it is on track', (tester) async {
      await open(tester);
      await openEntry(tester, 'Goals');
      expect(find.text('TOTAL SAVED'), findsOneWidget);
      expect(find.text('Viaje'), findsOneWidget);
      expect(find.text('Vacaciones · Banco, Ahorros'), findsOneWidget);
      expect(find.text('40%'), findsOneWidget);
      expect(tester.widget<LinearProgressIndicator>(find.byKey(const Key('goal-progress-p1'))).value, 0.4);
      expect(find.text('Behind'), findsOneWidget);
      expect(find.text('Estimated: no recent contributions'), findsOneWidget);
      expect(find.text('RD\$100.00/month'), findsOneWidget);
    });

    testWidgets('the plus creates a goal and the pencil edits one', (tester) async {
      await open(tester);
      await openEntry(tester, 'Goals');
      await tester.tap(find.byKey(const Key('goal-edit-p1')));
      await tester.pumpAndSettle();
      expect(find.text('Edit goal'), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('goal-new')));
      await tester.pumpAndSettle();
      expect(find.text('New goal'), findsWidgets);
    });
  });

  group('projection', () {
    testWidgets('shows today, each horizon, the chart, its lowest point and what is scheduled', (tester) async {
      final env = await open(tester);
      await openEntry(tester, 'Cash-flow projection');
      expect(lastQuery(env, '/api/reports/projection')['days'], '90');
      expect(find.text('BALANCE TODAY'), findsOneWidget);
      expect(find.text('IN 30 DAYS'), findsOneWidget);
      expect(find.text('Lowest point: RD\$950.00 on September 16, 2026'), findsOneWidget);
      expect(find.text('Luz'), findsOneWidget);
      expect(find.text('−RD\$50.00'), findsOneWidget);
      expect(find.text('+RD\$900.00'), findsOneWidget);
    });

    testWidgets('a horizon asks again', (tester) async {
      final env = await open(tester);
      await openEntry(tester, 'Cash-flow projection');
      await tester.tap(find.byKey(const Key('days-180')));
      await tester.pumpAndSettle();
      expect(lastQuery(env, '/api/reports/projection')['days'], '180');
    });
  });

  group('about and version', () {
    testWidgets('shows the versions, the user and the instance', (tester) async {
      await open(tester);
      await openEntry(tester, 'About');
      expect(find.text('0.1.0'), findsOneWidget);
      expect(find.text('6.1.0'), findsOneWidget);
      expect(find.text('Supported (≥ 6.0.0)'), findsOneWidget);
      expect(find.text('Peso dominicano (DOP)'), findsOneWidget);
      expect(find.text('a@b.c'), findsOneWidget);
      expect(find.text('https://ff.test'), findsOneWidget);
      expect(find.byKey(const Key('version-banner')), findsNothing);
    });

    testWidgets('a Firefly that is too old is flagged on the screen and above the tabs', (tester) async {
      await open(tester, oldFirefly: true);
      expect(find.byKey(const Key('version-banner')), findsOneWidget);
      expect(find.textContaining('Your Firefly III is 5.2.0; SpaceFly requires 6.0.0 or newer.'), findsOneWidget);
      await openEntry(tester, 'About');
      expect(find.text('Unsupported (< 6.0.0)'), findsOneWidget);
    });
  });
}
