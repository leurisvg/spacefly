import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/shared/dates.dart';
import 'package:spacefly_mobile/state/filters_store.dart';

import 'support.dart';

void main() {
  group('filters store on the mobile platform (in-memory, persisted currency)', () {
    test('defaults to the current month in the primary currency', () {
      final c = TestEnv().container();
      final f = c.read(filtersProvider);
      expect(f.preset, PeriodPreset.month);
      expect(f.period, const Period('2026-09-01', '2026-09-30'));
      expect(c.read(currencyProvider), 'DOP');
    });

    test('writes presets and shifts', () {
      final c = TestEnv().container();
      final n = c.read(filtersProvider.notifier);
      n.setPreset(PeriodPreset.quarter, anchor: '2026-05-20');
      expect(c.read(filtersProvider).period, const Period('2026-04-01', '2026-06-30'));
      n.setCustom(const Period('2026-01-01', '2026-01-31'));
      expect(c.read(filtersProvider).preset, PeriodPreset.custom);
      n.shift(-1);
      expect(c.read(filtersProvider).period, const Period('2025-12-01', '2025-12-31'));
    });

    test('persists the chosen currency in the platform storage and puts it in the query', () async {
      final env = TestEnv();
      final c = env.container();
      await c.read(filtersProvider.notifier).setCurrency('USD');
      expect(c.read(currencyProvider), 'USD');
      expect(env.prefs.values['spacefly.currency'], 'USD');
      expect(c.read(filterQueryProvider), {'start': '2026-09-01', 'end': '2026-09-30', 'currency': 'USD', '_r': 0});
    });

    test('uses the stored currency when it is valid, and ignores a bad one', () async {
      final good = TestEnv();
      await good.prefs.setString('spacefly.currency', 'EUR');
      expect(good.container().read(currencyProvider), 'EUR');

      final bad = TestEnv();
      await bad.prefs.setString('spacefly.currency', 'usd');
      expect(bad.container().read(currencyProvider), 'DOP');
    });

    test('bumps the refresh tick so reports refetch', () {
      final c = TestEnv().container();
      final before = c.read(filterQueryProvider)['_r'] as int;
      c.read(filtersProvider.notifier).refresh();
      expect(c.read(filterQueryProvider)['_r'], before + 1);
    });
  });
}
