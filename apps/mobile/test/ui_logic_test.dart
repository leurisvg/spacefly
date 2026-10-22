import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';
import 'package:spacefly_mobile/theme/tokens.g.dart';
import 'package:spacefly_mobile/ui_logic/budget_status.dart';
import 'package:spacefly_mobile/ui_logic/delta.dart';
import 'package:spacefly_mobile/ui_logic/names.dart';
import 'package:spacefly_mobile/ui_logic/series_colors.dart';

void main() {
  test('grades budget usage at 80 % and 100 %', () {
    expect([null, 0.5, 0.8, 0.99, 1.0, 2.0].map(budgetStatus), [
      MeterStatus.good,
      MeterStatus.good,
      MeterStatus.warning,
      MeterStatus.warning,
      MeterStatus.critical,
      MeterStatus.critical,
    ]);
    final shown = meterModel(1.5, hidden: false);
    expect((shown.status, shown.fill, shown.percent), (MeterStatus.critical, 100.0, 150));
    final hidden = meterModel(1.5, hidden: true);
    expect((hidden.status, hidden.fill, hidden.percent), (MeterStatus.critical, 0.0, 0));
  });

  group('deltaModel', () {
    test('turns a change into direction and tone, neutral in privacy mode', () {
      final up = deltaModel(120, 100, upIsGood: true, hidden: false);
      expect((up.direction, up.tone), (Direction.up, Tone.positive));
      expect(up.ratio, closeTo(0.2, 1e-9));
      expect(deltaModel(120, 100, upIsGood: false, hidden: false).tone, Tone.negative);
      final down = deltaModel(80, 100, upIsGood: true, hidden: false);
      expect((down.direction, down.tone), (Direction.down, Tone.negative));
      final none = deltaModel(5, null, upIsGood: true, hidden: false);
      expect((none.direction, none.tone, none.ratio), (Direction.flat, Tone.neutral, null));
      final hidden = deltaModel(120, 100, upIsGood: true, hidden: true);
      expect((hidden.direction, hidden.tone, hidden.pointsLabel), (Direction.flat, Tone.neutral, '0.0 pp'));
    });
  });

  group('series colors', () {
    test('a color follows its entity, not its rank, and past eight entities everything is "other"', () {
      final colors = SeriesColors(() => themeMidnight);
      final first = colors.color('category', 'a');
      expect(first, themeMidnight.series[0]);
      expect(colors.color('category', 'b'), themeMidnight.series[1]);
      expect(colors.color('category', 'a'), first, reason: 'asking again does not move it');
      expect(colors.color('account', 'a'), themeMidnight.series[0], reason: 'each kind has its own slots');
      for (var i = 0; i < 6; i++) {
        colors.color('category', 'x$i');
      }
      expect(colors.color('category', 'overflow'), themeMidnight.moneyOther);
      expect(colors.color('category', null), themeMidnight.moneyOther, reason: '"no category" is just another entity');
    });

    test('follows the theme at the time a color is asked for', () {
      var tokens = themeMidnight;
      final colors = SeriesColors(() => tokens);
      expect(colors.color('category', 'a'), themeMidnight.series[0]);
      tokens = themeEarth;
      expect(colors.color('category', 'a'), themeEarth.series[0]);
    });
  });

  group('entityName', () {
    setUp(() => LocaleSettings.setLocaleSync(AppLocale.en));

    test('shows the name, or the fallback text for an empty one, or "Others"', () {
      expect(entityName(t, 'Food', '1'), 'Food');
      expect(entityName(t, '', null), 'Uncategorized');
      expect(entityName(t, null, '3', fallback: (t) => t.common.untagged), 'Untagged');
      expect(entityName(t, 'ignored', othersId), 'Others');
    });
  });
}
