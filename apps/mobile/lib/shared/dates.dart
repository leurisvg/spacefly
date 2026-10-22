/// Pure date helpers on ISO calendar dates (`YYYY-MM-DD`). Port of libs/shared/src/utils/dates.ts.
/// All math is done in UTC so results never depend on the device's timezone.
library;

/// Inclusive calendar range, both ends formatted `YYYY-MM-DD`.
class Period {
  const Period(this.start, this.end);
  final String start;
  final String end;

  @override
  bool operator ==(Object other) => other is Period && other.start == start && other.end == end;

  @override
  int get hashCode => Object.hash(start, end);

  @override
  String toString() => 'Period($start, $end)';
}

/// `last30` / `last6m` are rolling windows ending on the anchor (today): the last 30 days and the last 6 months, today included.
enum PeriodPreset { month, quarter, year, ytd, last30, last6m, custom }

DateTime parseIso(String date) {
  final parts = date.substring(0, 10).split('-').map(int.parse).toList();
  return DateTime.utc(parts[0], parts[1], parts[2]);
}

String toIso(DateTime date) => date.toUtc().toIso8601String().substring(0, 10);

/// Today in the device's calendar, as an ISO date. `now` is injectable for tests.
String todayIso([DateTime? now]) {
  final n = now ?? DateTime.now();
  return toIso(DateTime.utc(n.year, n.month, n.day));
}

String addDays(String date, int days) => toIso(parseIso(date).add(Duration(days: days)));

int daysInMonth(String date) {
  final d = parseIso(date);
  return DateTime.utc(d.year, d.month + 1, 0).day;
}

/// Adds months clamping the day to the target month length (Jan 31 + 1 = Feb 28/29).
String addMonths(String date, int months) {
  final d = parseIso(date);
  final target = DateTime.utc(d.year, d.month + months, 1);
  final last = daysInMonth(toIso(target));
  return toIso(DateTime.utc(target.year, target.month, d.day < last ? d.day : last));
}

String startOfMonth(String date) => '${date.substring(0, 7)}-01';

String endOfMonth(String date) => '${date.substring(0, 7)}-${daysInMonth(date).toString().padLeft(2, '0')}';

String startOfYear(String date) => '${date.substring(0, 4)}-01-01';

String endOfYear(String date) => '${date.substring(0, 4)}-12-31';

String startOfQuarter(String date) {
  final month = int.parse(date.substring(5, 7));
  final first = ((month - 1) ~/ 3) * 3 + 1;
  return '${date.substring(0, 4)}-${first.toString().padLeft(2, '0')}-01';
}

String endOfQuarter(String date) => endOfMonth(addMonths(startOfQuarter(date), 2));

/// Inclusive number of days between two dates.
int daysBetween(String start, String end) => (parseIso(end).difference(parseIso(start)).inHours / 24).round() + 1;

String monthKey(String date) => date.substring(0, 7);

bool isIsoDate(Object? value) {
  if (value is! String || !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(value)) return false;
  return toIso(parseIso(value)) == value; // an impossible date (02-30) rolls over into another one
}

/// Builds the period for a preset anchored at a given date.
Period presetPeriod(PeriodPreset preset, String anchor) {
  switch (preset) {
    case PeriodPreset.month:
      return Period(startOfMonth(anchor), endOfMonth(anchor));
    case PeriodPreset.quarter:
      return Period(startOfQuarter(anchor), endOfQuarter(anchor));
    case PeriodPreset.year:
      return Period(startOfYear(anchor), endOfYear(anchor));
    case PeriodPreset.ytd:
      return Period(startOfYear(anchor), anchor);
    case PeriodPreset.last30:
      return Period(addDays(anchor, -29), anchor);
    case PeriodPreset.last6m:
      return Period(addDays(addMonths(anchor, -6), 1), anchor);
    case PeriodPreset.custom:
      throw ArgumentError('A custom period has no anchor: build it from its dates');
  }
}

/// Shifts a preset period by n steps (◀ ▶ navigation).
Period shiftPeriod(PeriodPreset preset, Period p, int steps) {
  switch (preset) {
    case PeriodPreset.month:
      return presetPeriod(PeriodPreset.month, addMonths(p.start, steps));
    case PeriodPreset.quarter:
      return presetPeriod(PeriodPreset.quarter, addMonths(p.start, steps * 3));
    case PeriodPreset.year:
      return presetPeriod(PeriodPreset.year, addMonths(p.start, steps * 12));
    case PeriodPreset.ytd:
      return Period(addMonths(p.start, steps * 12), addMonths(p.end, steps * 12));
    case PeriodPreset.last30:
      return Period(addDays(p.start, steps * 30), addDays(p.end, steps * 30));
    case PeriodPreset.last6m:
      return presetPeriod(PeriodPreset.last6m, addMonths(p.end, steps * 6));
    case PeriodPreset.custom:
      final length = daysBetween(p.start, p.end);
      return Period(addDays(p.start, steps * length), addDays(p.end, steps * length));
  }
}

/// Monday = 0 … Sunday = 6.
int weekdayMon0(String date) => (parseIso(date).weekday - 1) % 7;

/// Month keys (`YYYY-MM`) touched by the range, in order.
List<String> monthsInRange(String start, String end) {
  final out = <String>[];
  var cur = startOfMonth(start);
  while (cur.compareTo(end) <= 0) {
    out.add(monthKey(cur));
    cur = addMonths(cur, 1);
  }
  return out;
}

bool isFullMonth(Period p) => p.start == startOfMonth(p.start) && p.end == endOfMonth(p.start);

/// Period of the same "shape" immediately before the given one.
Period previousPeriod(Period p) {
  if (isFullMonth(p)) {
    final start = addMonths(p.start, -1);
    return Period(start, endOfMonth(start));
  }
  final span = monthsInRange(p.start, p.end).length;
  if (p.start == startOfMonth(p.start) && p.end == endOfMonth(p.end)) {
    final start = addMonths(p.start, -span);
    return Period(start, endOfMonth(addMonths(start, span - 1)));
  }
  final length = daysBetween(p.start, p.end);
  return Period(addDays(p.start, -length), addDays(p.start, -1));
}

Period samePeriodLastYear(Period p) {
  final start = addMonths(p.start, -12);
  final end = p.end == endOfMonth(p.end) ? endOfMonth(addMonths(p.end, -12)) : addMonths(p.end, -12);
  return Period(start, end);
}
