import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/api/models.g.dart';
import 'package:spacefly_mobile/format/formatter.dart';
import 'package:spacefly_mobile/ui_logic/calendar_cells.dart';

CalendarDay day(String date, {double income = 0, double expense = 0, double? balance}) =>
    CalendarDay(date: date, income: income, expense: expense, count: 0, balance: balance);

void main() {
  final f = Formatter(languageCode: 'en', currency: 'DOP');

  test('puts the first day on its weekday, weeks starting on Monday', () {
    expect(calendarBlanks([day('2026-09-01')]), 1); // Tuesday
    expect(calendarBlanks([day('2026-06-01')]), 0); // Monday
    expect(calendarBlanks([day('2026-02-01')]), 6); // Sunday
    expect(calendarBlanks(const []), 0);
  });

  test('scales the bars to the largest day, or to a given scale', () {
    final days = [day('2026-09-01', income: 100), day('2026-09-02', expense: 50), day('2026-09-03')];
    final cells = buildCalendarCells(f, days, const [], today: '2026-09-02');
    expect([cells[0].incH, cells[0].expH], [100, 0]);
    expect([cells[1].incH, cells[1].expH], [0, 50]);
    expect(cells[0].incInside, isTrue);
    expect(cells[1].expInside, isTrue);
    expect(cells.map((c) => c.num), [1, 2, 3]);

    final scaled = buildCalendarCells(f, days, const [], scale: 400, today: '2026-09-02');
    expect(scaled[0].incH, 25);
    expect(scaled[0].incInside, isFalse, reason: 'a short bar leaves the value above it');
  });

  test('never divides by a zero scale on a month without movements', () {
    final cells = buildCalendarCells(f, [day('2026-09-01')], const [], today: '2026-09-02');
    expect([cells[0].incH, cells[0].expH], [0, 0]);
  });

  test('marks today and the future', () {
    final cells = buildCalendarCells(f, [day('2026-09-14'), day('2026-09-15'), day('2026-09-16')], const [], today: '2026-09-15');
    expect(cells.map((c) => c.today), [false, true, false]);
    expect(cells.map((c) => c.future), [false, false, true]);
  });

  test('attaches the scheduled items to their day and writes a summary of it', () {
    final bill = ScheduledItem(amount: 15, date: '2026-09-03', id: 'b', kind: Kind.BILL, name: 'Netflix', type: TxKind.WITHDRAWAL);
    final cells = buildCalendarCells(f, [day('2026-09-02', income: 10, expense: 4, balance: 6), day('2026-09-03')], [bill], today: '2026-09-15');
    expect(cells[0].scheduled, isEmpty);
    expect(cells[1].scheduled, [bill]);
    expect(cells[0].tip, 'Wednesday, September 2, 2026\n+RD\$10.00\n−RD\$4.00\n= RD\$6.00');
    expect(cells[1].tip, contains('• Netflix RD\$15.00'));
  });

  test('writes compact amounts like the email: 950 / 1.2k, hidden as 0', () {
    expect(shortAmount(950, hidden: false), '950');
    expect(shortAmount(1234, hidden: false), '1.2k');
    expect(shortAmount(15000, hidden: false), '15.0k');
    expect(shortAmount(15000, hidden: false, small: true), '15k');
    expect(shortAmount(950.4, hidden: false), '950');
    expect(shortAmount(5000, hidden: true), '0');
  });
}
