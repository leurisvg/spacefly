import '../api/models.g.dart';
import '../format/formatter.dart';
import '../shared/dates.dart';

/// One day of the calendar grid. Port of `CalendarCell` in libs/client/src/ui-logic/calendar-cells.ts.
class CalendarCell {
  const CalendarCell({
    required this.day,
    required this.num,
    required this.incH,
    required this.expH,
    required this.incInside,
    required this.expInside,
    required this.future,
    required this.today,
    required this.scheduled,
    required this.tip,
  });

  final CalendarDay day;
  final int num;

  /// Bar heights as a percentage of the cell.
  final double incH;
  final double expH;

  /// The value fits inside its bar instead of above it.
  final bool incInside;
  final bool expInside;
  final bool future;
  final bool today;
  final List<ScheduledItem> scheduled;

  /// Plain-text summary of the day (accessibility label).
  final String tip;
}

/// Empty cells before the first day so it lands on its weekday (weeks start on Monday).
int calendarBlanks(List<CalendarDay> days) => days.isEmpty ? 0 : weekdayMon0(days.first.date);

/// One cell per day: an income bar and an expense bar scaled to [scale] (defaults to the largest day shown), plus the day's scheduled
/// bills and recurrences. [currency] is the one the day amounts are in when it isn't the display currency.
List<CalendarCell> buildCalendarCells(
  Formatter f,
  List<CalendarDay> days,
  List<ScheduledItem> scheduledItems, {
  double? scale,
  required String today,
  String? currency,
}) {
  var max = scale ?? 1.0;
  if (scale == null) {
    for (final d in days) {
      if (d.income > max) max = d.income;
      if (d.expense > max) max = d.expense;
    }
  }
  final byDate = <String, List<ScheduledItem>>{};
  for (final s in scheduledItems) {
    byDate.putIfAbsent(s.date, () => []).add(s);
  }
  return [
    for (final day in days)
      () {
        final incH = day.income / max * 100;
        final expH = day.expense / max * 100;
        final scheduled = byDate[day.date] ?? const <ScheduledItem>[];
        final parts = <String>[f.date(day.date, DateStyle.full)];
        if (day.income != 0) parts.add('+${f.money(day.income, currency: currency)}');
        if (day.expense != 0) parts.add('−${f.money(day.expense, currency: currency)}');
        if (day.balance != null) parts.add('= ${f.money(day.balance, currency: currency)}');
        for (final s in scheduled) {
          parts.add('• ${s.name} ${f.money(s.amount)}');
        }
        return CalendarCell(
          day: day,
          num: int.parse(day.date.substring(8, 10)),
          incH: incH,
          expH: expH,
          incInside: incH >= 28,
          expInside: expH >= 28,
          future: day.date.compareTo(today) > 0,
          today: day.date == today,
          scheduled: scheduled,
          tip: parts.join('\n'),
        );
      }(),
  ];
}

/// Same compact labels as the email: 950 / 1.2k (`small` cells drop the decimal from 10k up).
String shortAmount(double v, {required bool hidden, bool small = false}) {
  if (hidden) return '0';
  if (small && v >= 10000) return '${(v / 1000).round()}k';
  return v >= 1000 ? '${(v / 1000).toStringAsFixed(1)}k' : v.round().toString();
}
