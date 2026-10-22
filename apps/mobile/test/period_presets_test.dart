import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/shared/dates.dart';
import 'package:spacefly_mobile/shared/period_presets.dart';

String date(String iso, String style) => '$style:$iso';

String label(PeriodPreset preset, Period p) => periodLabel(preset, p, date: date, quarterShort: 'Q', ytdShort: 'YTD');

void main() {
  test('labels each preset', () {
    expect(label(PeriodPreset.month, const Period('2026-09-01', '2026-09-30')), 'month:2026-09-01');
    expect(label(PeriodPreset.quarter, const Period('2026-07-01', '2026-09-30')), 'Q3 2026');
    expect(label(PeriodPreset.year, const Period('2026-01-01', '2026-12-31')), '2026');
    expect(label(PeriodPreset.ytd, const Period('2026-01-01', '2026-10-20')), 'YTD 2026');
    expect(label(PeriodPreset.custom, const Period('2026-09-03', '2026-09-09')), 'short:2026-09-03 – long:2026-09-09');
  });

  test('recognises the option that produced the current period', () {
    const today = '2026-09-15';
    final thisMonth = periodPresetOptions.firstWhere((o) => o.key == 'thisMonth');
    final lastMonth = periodPresetOptions.firstWhere((o) => o.key == 'lastMonth');
    final current = thisMonth.period(today);
    expect(isPresetSelected(thisMonth, PeriodPreset.month, current, today), isTrue);
    expect(isPresetSelected(thisMonth, PeriodPreset.year, current, today), isFalse);
    expect(isPresetSelected(lastMonth, PeriodPreset.month, current, today), isFalse);
  });

  test('lists the eight presets of the web picker, in order', () {
    expect(periodPresetOptions.map((o) => o.key), ['thisMonth', 'lastMonth', 'last30', 'last6m', 'thisQuarter', 'thisYear', 'lastYear', 'ytd']);
    expect(periodPresetOptions.firstWhere((o) => o.key == 'lastYear').period('2026-09-15'), const Period('2025-01-01', '2025-12-31'));
  });
}
