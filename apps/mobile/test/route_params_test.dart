import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/features/accounts/account_detail_vm.dart';
import 'package:spacefly_mobile/features/accounts/accounts_vm.dart';
import 'package:spacefly_mobile/features/accounts/net_worth_vm.dart';
import 'package:spacefly_mobile/features/accounts/savings_vm.dart';
import 'package:spacefly_mobile/features/analysis/budgets_vm.dart';
import 'package:spacefly_mobile/features/analysis/ranking_vm.dart';
import 'package:spacefly_mobile/features/planning/projection_vm.dart';
import 'package:spacefly_mobile/features/reports/calendar_vm.dart';
import 'package:spacefly_mobile/features/reports/compare_vm.dart';
import 'package:spacefly_mobile/features/reports/flow_vm.dart';
import 'package:spacefly_mobile/features/route_params.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';
import 'package:spacefly_mobile/router.dart';
import 'package:spacefly_mobile/shared/dates.dart';
import 'package:spacefly_mobile/state/filters_store.dart';

import 'fixtures.dart';
import 'support.dart';

void main() {
  setUpAll(initFormats);
  setUp(() => LocaleSettings.setLocaleSync(AppLocale.en));

  ProviderContainer container() => TestEnv(config: signedInConfig, adapter: fakeServer({'/api/meta': metaJson()})).container();

  group('applyRouteParams', () {
    test('does nothing without a query', () {
      final c = container();
      applyRouteParams(c.read, Uri.parse('/reports/flow'));
      expect((c.read(flowModeProvider), c.read(flowThresholdProvider)), (FlowMode.budget, null));
    });

    test('puts the flow options of a link in place, and ignores what is not valid', () {
      final c = container();
      applyRouteParams(c.read, Uri.parse('/reports/flow?mode=tags&budgets=0&incomeCategories=1&threshold=2.5'));
      expect((c.read(flowModeProvider), c.read(flowBudgetsProvider), c.read(flowIncomeCategoriesProvider), c.read(flowThresholdProvider)), (FlowMode.tags, false, true, 2.5));
      applyRouteParams(c.read, Uri.parse('/reports/flow?threshold=abc'));
      expect(c.read(flowThresholdProvider), 0, reason: 'like the web: a threshold that is not a number is 0');
      applyRouteParams(c.read, Uri.parse('/reports/flow?mode=other'));
      expect(c.read(flowModeProvider), FlowMode.budget);
    });

    test('calendar, compare, budgets and projection', () {
      final c = container();
      applyRouteParams(c.read, Uri.parse('/reports/calendar?view=year&account=3&category=none&tag=viaje'));
      expect((c.read(calendarViewProvider), c.read(calendarAccountProvider), c.read(calendarCategoryProvider), c.read(calendarTagProvider)), (CalendarView.year, '3', 'none', 'viaje'));

      applyRouteParams(c.read, Uri.parse('/reports/compare?cmp=custom&groupBy=tag&kind=income&bStart=2026-01-01&bEnd=2026-01-31'));
      expect((c.read(compareModeProvider), c.read(compareGroupProvider), c.read(compareKindProvider), c.read(compareBStartProvider), c.read(compareBEndProvider)),
          (CompareMode.custom, 'tag', 'income', '2026-01-01', '2026-01-31'));
      applyRouteParams(c.read, Uri.parse('/reports/compare?cmp=nope&groupBy=nope&kind=nope'));
      expect((c.read(compareModeProvider), c.read(compareGroupProvider), c.read(compareKindProvider)), (CompareMode.custom, 'tag', 'income'), reason: 'invalid values leave it as it was');

      applyRouteParams(c.read, Uri.parse('/analysis/budgets?budget=b1'));
      expect(c.read(selectedBudgetProvider), 'b1');
      applyRouteParams(c.read, Uri.parse('/planning/projection?days=180'));
      expect(c.read(projectionDaysProvider), '180');
      applyRouteParams(c.read, Uri.parse('/planning/projection?days=7'));
      expect(c.read(projectionDaysProvider), '180');
    });

    test('the months of the accounts screens', () {
      final c = container();
      applyRouteParams(c.read, Uri.parse('/accounts?months=36'));
      applyRouteParams(c.read, Uri.parse('/accounts/net-worth?months=6'));
      applyRouteParams(c.read, Uri.parse('/accounts/savings?months=24'));
      expect((c.read(accountsMonthsProvider), c.read(netWorthMonthsProvider), c.read(savingsMonthsProvider)), ('36', '6', '24'));
      applyRouteParams(c.read, Uri.parse('/accounts?months=5'));
      expect(c.read(accountsMonthsProvider), '36');
    });

    test('ranking: the side and the view of that route only', () {
      final c = container();
      applyRouteParams(c.read, Uri.parse('/analysis/categories?kind=income&view=treemap'));
      expect(c.read(rankingKindProvider(rankingCategories)), RankingKind.income);
      expect(c.read(rankingViewProvider(rankingCategories)), RankingView.treemap);
      expect(c.read(rankingKindProvider(rankingTags)), RankingKind.expense, reason: 'another route');
      applyRouteParams(c.read, Uri.parse('/analysis/merchants?kind=income'));
      expect(c.read(rankingKindProvider(rankingMerchants)), RankingKind.expense, reason: 'the route pins its side');
    });

    test('an account takes its tab, and keeps its own period', () {
      final c = container();
      final before = c.read(filtersProvider);
      applyRouteParams(c.read, Uri.parse('/accounts/12?tab=deposit&p=year'));
      expect(c.read(accountTabProvider('12')), 'deposit');
      expect(c.read(accountTabProvider('13')), 'all');
      expect(c.read(filtersProvider).preset, before.preset, reason: 'an account opens on its own period');
      applyRouteParams(c.read, Uri.parse('/accounts/12?tab=nope'));
      expect(c.read(accountTabProvider('12')), 'deposit');
    });

    test('the shared filters: preset, dates and currency', () {
      final env = TestEnv(config: signedInConfig, adapter: fakeServer({'/api/meta': metaJson()}));
      final c = env.container();
      applyRouteParams(c.read, Uri.parse('/transactions?p=year&cur=USD'));
      final f = c.read(filtersProvider);
      expect(f.preset, PeriodPreset.year);
      expect(c.read(currencyProvider), 'USD');
      expect(env.prefs.getString(currencyKey), isNull, reason: 'not saved');

      applyRouteParams(c.read, Uri.parse('/?start=2026-02-01&end=2026-02-28'));
      expect((c.read(filtersProvider).preset, c.read(filtersProvider).period), (PeriodPreset.custom, const Period('2026-02-01', '2026-02-28')));

      applyRouteParams(c.read, Uri.parse('/?start=2026-03-10&end=2026-03-01&cur=usd'));
      expect(c.read(filtersProvider).period, const Period('2026-02-01', '2026-02-28'), reason: 'a backwards range is ignored');
      expect(c.read(currencyProvider), 'USD', reason: 'a currency that is not a code is ignored');
    });

    test('what a link set outlives the screen', () async {
      final c = container();
      applyRouteParams(c.read, Uri.parse('/reports/flow?mode=tags'));
      applyRouteParams(c.read, Uri.parse('/accounts/12?tab=deposit'));
      await Future<void>.delayed(Duration.zero); // nothing listens: an autoDispose provider would be gone by now
      expect(c.read(flowModeProvider), FlowMode.tags);
      expect(c.read(accountTabProvider('12')), 'deposit');
    });
  });

  group('links in the app', () {
    testWidgets('a location with a query opens the screen with those options, and they are kept when it is opened again', (tester) async {
      tester.view.physicalSize = const Size(1080, 4800);
      tester.view.devicePixelRatio = 2;
      addTearDown(tester.view.reset);
      final env = TestEnv(
        config: signedInConfig,
        adapter: fakeServer({'/api/meta': metaJson(), '/api/lookups': lookupsJson(), '/api/reports/dashboard': report(dashboardJson()), '/api/reports/sankey': report(sankeyJson())}),
      );
      await env.pumpApp(tester);
      final c = ProviderScope.containerOf(tester.element(find.byType(MaterialApp)));
      c.read(routerProvider).go('/reports/flow?mode=tags&threshold=2.5&budgets=0');
      await tester.pumpAndSettle();
      final query = env.adapter!.requests.lastWhere((r) => r.path == '/api/reports/sankey').queryParameters;
      expect((query['mode'], query['budgets'], query['threshold']), ('tags', '0', 2.5));

      // back to the dashboard and to the flow by hand: the options are still the link's
      c.read(routerProvider).go('/');
      await tester.pumpAndSettle();
      c.read(routerProvider).go('/reports/flow');
      await tester.pumpAndSettle();
      final again = env.adapter!.requests.lastWhere((r) => r.path == '/api/reports/sankey').queryParameters;
      expect((again['mode'], again['budgets'], again['threshold']), ('tags', '0', 2.5));
    });
  });
}
