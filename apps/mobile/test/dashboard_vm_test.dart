import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/api/models.g.dart';
import 'package:spacefly_mobile/features/dashboard/dashboard_vm.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';
import 'package:spacefly_mobile/state/tx_detail.dart';
import 'package:spacefly_mobile/theme/tokens.g.dart';
import 'package:spacefly_mobile/ui_logic/series_colors.dart';

import 'fixtures.dart';
import 'support.dart';

void main() {
  setUpAll(initFormats);
  setUp(() => LocaleSettings.setLocaleSync(AppLocale.en));

  group('dashboard shaping', () {
    test('finds a month’s first and last day, leap years included', () {
      expect(monthRange('2026-09'), (start: '2026-09-01', end: '2026-09-30'));
      expect(monthRange('2024-02'), (start: '2024-02-01', end: '2024-02-29'));
      expect(monthRange('2026-12'), (start: '2026-12-01', end: '2026-12-31'));
    });

    test('colors each category by identity and grays out "others"', () {
      final colors = SeriesColors(() => themeMidnight);
      final top = [
        TopCategory(id: '1', name: 'Food', value: 10, children: const []),
        TopCategory(id: null, name: '', value: 5, children: const []),
        TopCategory(id: '__others__', name: '', value: 2, children: const []),
      ];
      final slices = categorySlices(top, t, colors);
      expect(slices.map((s) => s.name), ['Food', 'Uncategorized', 'Others']);
      expect(slices.map((s) => s.value), [10, 5, 2]);
      expect(slices[0].color, themeMidnight.series[0]);
      expect(slices[1].color, themeMidnight.series[1]);
      expect(slices[2].color, themeMidnight.moneyOther);
    });
  });

  group('dashboardViewModel', () {
    Future<(ProviderContainer, DashboardViewModel)> setup() async {
      final env = TestEnv(config: signedInConfig, adapter: fakeServer({'/api/reports/dashboard': report(dashboardJson()), '/api/meta': metaJson()}));
      final c = env.container();
      c.listen(dashboardViewModelProvider, (_, __) {}); // keeps the autoDispose providers alive
      await c.read(dashboardReportProvider.future);
      return (c, c.read(dashboardViewModelProvider));
    }

    test('turns the report into tables and slices', () async {
      final (_, vm) = await setup();
      expect(vm.initialLoading, isFalse);
      expect(vm.monthsTable?.rows.first, ['August 2026', 'RD\$100.00', 'RD\$40.00', 'RD\$60.00']);
      expect(vm.monthsTable?.columns, ['Month', 'Income', 'Expenses', 'Net']);
      expect(vm.slices.map((s) => s.name), ['Food', 'Others']);
      expect(vm.slicesTotal, 40);
      expect(vm.categoriesTable?.columns, hasLength(2));
      expect(vm.netWorth, hasLength(1));
      expect(vm.nwTable?.columns, ['Month', 'Net worth']);
      expect(vm.nwTable?.rows, hasLength(1));
      expect(vm.nwTable?.rows.first.first, 'August 2026');
    });

    test('is loading, with nothing to show, before the first answer', () async {
      final env = TestEnv(config: signedInConfig, adapter: fakeServer({'/api/reports/dashboard': report(dashboardJson())}));
      final c = env.container();
      c.listen(dashboardViewModelProvider, (_, __) {});
      final vm = c.read(dashboardViewModelProvider);
      expect(vm.initialLoading, isTrue);
      expect(vm.slices, isEmpty);
      expect(vm.monthsTable, isNull);
      expect(vm.nwTable, isNull);
    });

    test('opens the drill-down for a month, a category, the folded others and a day', () async {
      final (c, vm) = await setup();
      TxDetailRequest? request() => c.read(txDetailProvider);

      vm.openMonth(0);
      expect(request()!.filter, {'start': '2026-08-01', 'end': '2026-08-31'});
      expect(request()!.title, 'August 2026');

      vm.openCategory(0);
      expect(request()!.title, 'Food');
      expect(request()!.filter, {'type': 'withdrawal', 'category': '1'});

      vm.openCategory(1);
      expect(request()!.breakdown!.map((r) => (r.id, r.name, r.value)), [('7', 'Pets', 4.0)]);
      expect(request()!.filter, {'type': 'withdrawal', 'categories': '7'});

      vm.openDay('2026-09-03');
      expect(request()!.filter, {'start': '2026-09-03', 'end': '2026-09-03'});
      expect(request()!.title, 'Thursday, September 3, 2026');
    });

    test('ignores taps outside the data', () async {
      final (c, vm) = await setup();
      vm.openMonth(9);
      vm.openCategory(-1);
      expect(c.read(txDetailProvider), isNull);
    });
  });
}
