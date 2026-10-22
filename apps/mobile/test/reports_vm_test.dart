import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/features/reports/annual_vm.dart';
import 'package:spacefly_mobile/features/reports/calendar_vm.dart';
import 'package:spacefly_mobile/features/reports/compare_vm.dart';
import 'package:spacefly_mobile/features/reports/monthly_vm.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';
import 'package:spacefly_mobile/shared/dates.dart';
import 'package:spacefly_mobile/state/filters_store.dart';
import 'package:spacefly_mobile/state/meta_store.dart';
import 'package:spacefly_mobile/state/tx_detail.dart';

import 'fixtures.dart';
import 'support.dart';

void main() {
  setUpAll(initFormats);
  setUp(() => LocaleSettings.setLocaleSync(AppLocale.en));

  Map<String, Object> routes() => {
        '/api/meta': metaJson(),
        '/api/lookups': lookupsJson(),
        '/api/reports/calendar': report(calendarJson()),
        '/api/reports/calendar/year': report(yearHeatmapJson()),
        '/api/reports/monthly': report(monthlyJson()),
        '/api/reports/annual': report(annualJson()),
        '/api/reports/compare': report(compareJson()),
      };

  (TestEnv, ProviderContainer) container() {
    final env = TestEnv(config: signedInConfig, adapter: fakeServer(routes()));
    return (env, env.container());
  }

  group('calendarMonth', () {
    test('keeps a whole month and snaps anything else to the month of its end', () {
      expect(calendarMonth(const Period('2026-09-01', '2026-09-30')), const Period('2026-09-01', '2026-09-30'));
      expect(calendarMonth(const Period('2026-08-15', '2026-10-10')), const Period('2026-10-01', '2026-10-31'));
    });
  });

  group('calendarViewModel', () {
    Future<(TestEnv, ProviderContainer, CalendarViewModel)> setup() async {
      final (env, c) = container();
      c.listen(calendarViewModelProvider, (_, __) {});
      await c.read(calendarReportProvider.future);
      await c.read(lookupsProvider.future);
      return (env, c, c.read(calendarViewModelProvider));
    }

    test('ends on the last known balance and plots only the known days', () async {
      final (_, c, vm) = await setup();
      expect(vm.endBalance, 60);
      expect(vm.knownDays.map((d) => d.date), ['2026-09-01', '2026-09-02', '2026-09-03']);
      expect(vm.hasBalance, isTrue);
      expect(vm.dayTable!.rows.map((r) => r.first), ['Tue, Sep 1', 'Wed, Sep 2'], reason: 'only the days with movements');
      expect(c.read(calendarViewProvider), CalendarView.month);
    });

    test('asks for the month the period ends in and no year heatmap while showing the month', () async {
      final (env, _, vm) = await setup();
      expect(vm.month, const Period('2026-09-01', '2026-09-30'));
      final calendar = env.adapter!.requests.lastWhere((r) => r.path == '/api/reports/calendar');
      expect((calendar.queryParameters['start'], calendar.queryParameters['end']), ('2026-09-01', '2026-09-30'));
      expect(env.adapter!.requests.where((r) => r.path == '/api/reports/calendar/year'), isEmpty);
    });

    test('opens a day within the active filters', () async {
      final (_, c, vm) = await setup();
      vm.setFilter(CalendarFilter.account, '7');
      expect(c.read(calendarAccountProvider), '7');
      final next = c.read(calendarViewModelProvider);
      next.openDay('2026-09-02');
      expect(c.read(txDetailProvider)!.filter, {'start': '2026-09-02', 'end': '2026-09-02', 'account': '7'});
      next.setFilter(CalendarFilter.account, '');
      expect(c.read(calendarViewModelProvider).account, '');
    });

    test('sends the filters with the request', () async {
      final (env, c, vm) = await setup();
      vm.setFilter(CalendarFilter.category, 'none');
      vm.setFilter(CalendarFilter.tag, 'viaje');
      await c.read(calendarReportProvider.future);
      final request = env.adapter!.requests.lastWhere((r) => r.path == '/api/reports/calendar');
      expect((request.queryParameters['category'], request.queryParameters['tag']), ('none', 'viaje'));
    });

    test('lists the filters’ options, with the uncategorized bucket first', () async {
      final (_, _, vm) = await setup();
      expect(vm.categoryOptions.map((o) => o.label), ['Uncategorized', 'Comida']);
      expect(vm.accountOptions.map((o) => o.value), ['a1']);
      expect(vm.tagOptions.map((o) => o.value), ['viaje']);
    });

    test('fetches the year heatmap only in the year view and opens the day behind a cell', () async {
      final (env, c, vm) = await setup();
      vm.setView(CalendarView.year);
      await c.read(yearHeatmapProvider.future);
      final year = env.adapter!.requests.lastWhere((r) => r.path == '/api/reports/calendar/year');
      expect(year.queryParameters['year'], 2026);
      final next = c.read(calendarViewModelProvider);
      expect(next.heatmap!.cells, hasLength(365));
      expect(next.yearTable!.rows.first, ['January 2026', 'RD\$0.00']);
      expect(next.openHeatmapDay(31 + 28 + 31 + 30 + 31 + 30 + 31 + 31 + 9), isTrue);
      expect(c.read(txDetailProvider)!.filter, {'start': '2026-09-10', 'end': '2026-09-10'});
      expect(next.openHeatmapDay(999), isFalse);
    });
  });

  group('monthly shaping', () {
    test('compares a category with the previous period', () {
      expect(categoryChange(total: -150, previous: -100), const CategoryChange(isNew: false, delta: -50, ratio: 0.5, up: false));
      expect(categoryChange(total: 30, previous: 20), const CategoryChange(isNew: false, delta: 10, ratio: 0.5, up: true));
      expect(categoryChange(total: -40, previous: 0), const CategoryChange(isNew: true, delta: -40, ratio: 0, up: false));
    });

    test('scales the category bars to the largest one', () {
      expect(relativeWidth(-50, 200), 25);
      expect(relativeWidth(200, 200), 100);
    });
  });

  group('monthlyViewModel', () {
    Future<(ProviderContainer, MonthlyViewModel)> setup() async {
      final (_, c) = container();
      c.listen(monthlyViewModelProvider, (_, __) {});
      await c.read(monthlyReportProvider.future);
      return (c, c.read(monthlyViewModelProvider));
    }

    test('fetches the report and the daily calendar', () async {
      final (env, c) = container();
      c.listen(monthlyViewModelProvider, (_, __) {});
      await c.read(monthlyReportProvider.future);
      await c.read(monthlyCalendarProvider.future);
      expect(env.adapter!.requests.map((r) => r.path), containsAll(['/api/reports/monthly', '/api/reports/calendar']));
    });

    test('opens a category (or the unassigned bucket), a budget and a day', () async {
      final (c, vm) = await setup();
      final food = vm.d!.categories[0], none = vm.d!.categories[1];
      expect(vm.relative(food), 100);
      expect(vm.relative(none), closeTo(33.33, 0.01));
      vm.openCategory(food);
      expect(c.read(txDetailProvider)!.title, 'Food');
      expect(c.read(txDetailProvider)!.filter, {'category': '1'});
      vm.openCategory(none);
      expect(c.read(txDetailProvider)!.title, 'Uncategorized');
      expect(c.read(txDetailProvider)!.filter, {'category': 'none'});
      vm.openBudget(vm.d!.budgets.first);
      expect(c.read(txDetailProvider)!.filter, {'type': 'withdrawal', 'budget': 'b1'});
      vm.openDay('2026-09-03');
      expect(c.read(txDetailProvider)!.filter, {'start': '2026-09-03', 'end': '2026-09-03'});
    });

    test('unfolds and folds an account row', () async {
      final (c, vm) = await setup();
      vm.toggleAsset('a1');
      expect(c.read(monthlyExpandedProvider), {'a1'});
      c.read(monthlyViewModelProvider).toggleAsset('a1');
      expect(c.read(monthlyExpandedProvider), isEmpty);
    });
  });

  group('annual shaping', () {
    test('walks the matrix month by month inside each category', () {
      expect(matrixCell(0, 12), (month: 0, category: 0));
      expect(matrixCell(13, 12), (month: 1, category: 1));
      expect(matrixCell(35, 12), (month: 11, category: 2));
    });
  });

  group('annualViewModel', () {
    Future<(ProviderContainer, AnnualViewModel)> setup({int? limit}) async {
      final (_, c) = container();
      c.listen(annualViewModelProvider, (_, __) {});
      await c.read(annualReportProvider.future);
      final vm = c.read(annualViewModelProvider);
      if (limit == null) return (c, vm);
      return (c, AnnualViewModel(year: vm.year, res: vm.res, f: vm.f, t: vm.t, detail: vm.detail, matrixLimit: limit));
    }

    test('asks for the year the period ends in', () async {
      final (env, c) = container();
      c.listen(annualReportProvider, (_, __) {});
      await c.read(annualReportProvider.future);
      expect(env.adapter!.requests.lastWhere((r) => r.path == '/api/reports/annual').queryParameters['year'], 2026);
    });

    test('limits the matrix to the first categories', () async {
      final (_, vm) = await setup(limit: 2);
      expect(vm.shownCategories, hasLength(2));
      expect(vm.matrixCells, hasLength(24));
      expect(vm.matrixTable!.rows, hasLength(3), reason: 'the table lists every category');
      expect(vm.matrixMax, 10);
    });

    test('shapes the months, the table and the matrix cells', () async {
      final (_, vm) = await setup();
      expect(vm.rows, hasLength(12));
      expect(vm.rows.first.net, 300);
      expect(vm.monthTable!.rows.first, ['January 2026', 'RD\$500.00', 'RD\$200.00', 'RD\$300.00', '—']);
      expect(vm.monthTable!.rows[1].last, '60.0%');
      expect(vm.matrixCells[13].row, 1);
      expect(vm.matrixCells[13].col, 1);
      expect(vm.matrixMax, 100);
    });

    test('opens a month and a matrix cell with the right range', () async {
      final (c, vm) = await setup();
      expect(vm.openMonth(1), isTrue);
      expect(c.read(txDetailProvider)!.filter, {'start': '2026-02-01', 'end': '2026-02-28'});
      expect(vm.openCellAt(2 * 12 + 11), isTrue);
      expect(c.read(txDetailProvider)!.title, 'Rent · December 2026');
      expect(c.read(txDetailProvider)!.filter, {'start': '2026-12-01', 'end': '2026-12-31', 'type': 'withdrawal', 'category': '3'});
      vm.openCell(0, 1);
      expect(c.read(txDetailProvider)!.filter['category'], 'none');
      expect(vm.openMonth(40), isFalse);
      expect(vm.openCellAt(999), isFalse);
    });
  });

  group('compare shaping', () {
    const a = Period('2026-09-01', '2026-09-30');

    test('derives period B from the mode', () {
      expect(resolvePeriodB(CompareMode.previous, a, null, null), const Period('2026-08-01', '2026-08-31'));
      expect(resolvePeriodB(CompareMode.yoy, a, null, null), const Period('2025-09-01', '2025-09-30'));
      expect(resolvePeriodB(CompareMode.custom, a, '2026-01-01', '2026-01-31'), const Period('2026-01-01', '2026-01-31'));
      expect(resolvePeriodB(CompareMode.custom, a, '2026-01-01', null), const Period('2026-08-01', '2026-08-31'));
    });

    test('calls spending less or earning more an improvement', () {
      expect(isImprovement(-10, 'expense'), isTrue);
      expect(isImprovement(10, 'expense'), isFalse);
      expect(isImprovement(10, 'income'), isTrue);
      expect(isImprovement(0, 'income'), isFalse);
    });
  });

  group('compareViewModel', () {
    Future<(TestEnv, ProviderContainer, CompareViewModel)> setup() async {
      final (env, c) = container();
      c.listen(compareViewModelProvider, (_, __) {});
      await c.read(compareReportProvider.future);
      return (env, c, c.read(compareViewModelProvider));
    }

    test('compares with the previous period by category by default and hides empty rows', () async {
      final (env, _, vm) = await setup();
      final request = env.adapter!.requests.lastWhere((r) => r.path == '/api/reports/compare');
      expect((request.queryParameters['groupBy'], request.queryParameters['kind']), ('category', 'expense'));
      expect((request.queryParameters['aStart'], request.queryParameters['bStart']), ('2026-09-01', '2026-08-01'));
      expect(vm.mode, CompareMode.previous);
      expect(vm.rows.map(vm.name), ['Food', 'Uncategorized']);
      expect(vm.table!.rows.first, ['Food', 'RD\$40.00', 'RD\$50.00', '−RD\$10.00', '−20.0%']);
    });

    test('opens a row from the table (direct) and from the chart (reversed)', () async {
      final (_, c, vm) = await setup();
      expect(vm.openRow(0), isTrue);
      expect(c.read(txDetailProvider)!.title, 'Food');
      expect(c.read(txDetailProvider)!.filter, {'type': 'withdrawal', 'category': '1'});
      expect(vm.openRow(0, fromChart: true), isTrue);
      expect(c.read(txDetailProvider)!.title, 'Uncategorized');
      expect(c.read(txDetailProvider)!.filter, {'type': 'withdrawal', 'category': 'none'});
      expect(vm.openRow(5), isFalse);
    });

    test('names the empty bucket after what is grouped, and filters by the grouping', () async {
      final (_, c, vm) = await setup();
      vm.setGroupBy('tag');
      var next = c.read(compareViewModelProvider);
      expect(next.name(next.rows[1]), 'Untagged');
      next.openRow(0);
      expect(c.read(txDetailProvider)!.filter, {'type': 'withdrawal', 'tag': '1'});
      next.setGroupBy('budget');
      next = c.read(compareViewModelProvider);
      expect(next.name(next.rows[1]), 'No budget');
      next.setKind('income');
      next = c.read(compareViewModelProvider);
      next.openRow(0);
      expect(c.read(txDetailProvider)!.filter['type'], 'deposit');
    });

    test('keeps the other end of a custom period B when one is typed, and ignores a bad date', () async {
      final (_, c, vm) = await setup();
      vm.setMode(CompareMode.custom);
      var next = c.read(compareViewModelProvider);
      final fallbackEnd = next.b.end;
      next.setB(start: 'nope');
      expect(c.read(compareBStartProvider), isNull);
      next.setB(start: '2026-01-05');
      next = c.read(compareViewModelProvider);
      expect(next.b.start, '2026-01-05');
      expect(next.b.end, fallbackEnd);
    });

    test('sets both ends of period B at once', () async {
      final (_, c, vm) = await setup();
      vm.setMode(CompareMode.custom);
      c.read(compareViewModelProvider).setBRange('2026-01-01', '2026-01-31');
      final next = c.read(compareViewModelProvider);
      expect(next.b, const Period('2026-01-01', '2026-01-31'));
      next.setBRange('2026-02-30', '2026-03-01');
      expect(c.read(compareViewModelProvider).b, const Period('2026-01-01', '2026-01-31'), reason: 'an impossible date is ignored');
    });

    test('follows the global period: A is the filter period', () async {
      final (_, c, _) = await setup();
      c.read(filtersProvider.notifier).setPreset(PeriodPreset.month, anchor: '2026-06-10');
      await c.read(compareReportProvider.future);
      final next = c.read(compareViewModelProvider);
      expect(next.a, const Period('2026-06-01', '2026-06-30'));
      expect(next.b, const Period('2026-05-01', '2026-05-31'));
    });
  });
}
