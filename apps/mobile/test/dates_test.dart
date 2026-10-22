import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/shared/dates.dart';

void main() {
  test('todayIso follows the calendar of the clock it is given', () {
    expect(todayIso(DateTime(2026, 9, 15, 23, 59)), '2026-09-15');
    expect(todayIso(DateTime(2026, 1, 1, 0, 0)), '2026-01-01');
  });

  test('addMonths clamps the day to the target month, across years', () {
    expect(addMonths('2026-01-31', 1), '2026-02-28');
    expect(addMonths('2024-01-31', 1), '2024-02-29');
    expect(addMonths('2026-11-15', 3), '2027-02-15');
    expect(addMonths('2026-02-15', -3), '2025-11-15');
    expect(addMonths('2026-03-31', -1), '2026-02-28');
  });

  test('month, quarter and year boundaries', () {
    expect(endOfMonth('2026-02-10'), '2026-02-28');
    expect(endOfMonth('2024-02-10'), '2024-02-29');
    expect(startOfQuarter('2026-08-20'), '2026-07-01');
    expect(endOfQuarter('2026-08-20'), '2026-09-30');
    expect(startOfYear('2026-08-20'), '2026-01-01');
    expect(endOfYear('2026-08-20'), '2026-12-31');
  });

  test('addDays and daysBetween do not drift across month ends and clock changes', () {
    expect(addDays('2026-02-28', 1), '2026-03-01');
    expect(addDays('2026-03-01', -1), '2026-02-28');
    expect(daysBetween('2026-09-01', '2026-09-30'), 30);
    expect(daysBetween('2026-03-01', '2026-03-01'), 1);
    expect(daysBetween('2026-03-07', '2026-03-09'), 3);
  });

  test('isIsoDate rejects impossible dates and other formats', () {
    expect(isIsoDate('2026-09-15'), isTrue);
    expect(isIsoDate('2026-02-30'), isFalse);
    expect(isIsoDate('2026-9-1'), isFalse);
    expect(isIsoDate('nope'), isFalse);
    expect(isIsoDate(null), isFalse);
  });

  group('presetPeriod', () {
    const anchor = '2026-09-15';
    test('calendar presets', () {
      expect(presetPeriod(PeriodPreset.month, anchor), const Period('2026-09-01', '2026-09-30'));
      expect(presetPeriod(PeriodPreset.quarter, anchor), const Period('2026-07-01', '2026-09-30'));
      expect(presetPeriod(PeriodPreset.year, anchor), const Period('2026-01-01', '2026-12-31'));
      expect(presetPeriod(PeriodPreset.ytd, anchor), const Period('2026-01-01', '2026-09-15'));
    });

    test('rolling windows end on the anchor, today included', () {
      expect(presetPeriod(PeriodPreset.last30, anchor), const Period('2026-08-17', '2026-09-15'));
      expect(presetPeriod(PeriodPreset.last6m, anchor), const Period('2026-03-16', '2026-09-15'));
    });

    test('a custom period has no anchor', () {
      expect(() => presetPeriod(PeriodPreset.custom, anchor), throwsArgumentError);
    });
  });

  group('shiftPeriod', () {
    test('moves calendar presets by whole units', () {
      expect(shiftPeriod(PeriodPreset.month, const Period('2026-09-01', '2026-09-30'), -1), const Period('2026-08-01', '2026-08-31'));
      expect(shiftPeriod(PeriodPreset.month, const Period('2026-12-01', '2026-12-31'), 1), const Period('2027-01-01', '2027-01-31'));
      expect(shiftPeriod(PeriodPreset.quarter, const Period('2026-07-01', '2026-09-30'), -1), const Period('2026-04-01', '2026-06-30'));
      expect(shiftPeriod(PeriodPreset.year, const Period('2026-01-01', '2026-12-31'), 1), const Period('2027-01-01', '2027-12-31'));
      expect(shiftPeriod(PeriodPreset.ytd, const Period('2026-01-01', '2026-09-15'), -1), const Period('2025-01-01', '2025-09-15'));
    });

    test('moves rolling and custom ranges by their own length', () {
      expect(shiftPeriod(PeriodPreset.last30, const Period('2026-08-17', '2026-09-15'), -1), const Period('2026-07-18', '2026-08-16'));
      expect(shiftPeriod(PeriodPreset.custom, const Period('2026-01-01', '2026-01-31'), -1), const Period('2025-12-01', '2025-12-31'));
      expect(shiftPeriod(PeriodPreset.last6m, const Period('2026-03-16', '2026-09-15'), -1), const Period('2025-09-16', '2026-03-15'));
    });
  });
}
