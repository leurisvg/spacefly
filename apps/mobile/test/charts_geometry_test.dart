import 'package:flutter/painting.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/api/models.g.dart';
import 'package:spacefly_mobile/ui/charts/diverging_bars.dart';
import 'package:spacefly_mobile/ui/charts/heatmap.dart';

void main() {
  group('HeatmapGeometry', () {
    const g = HeatmapGeometry(rows: 3, cols: 4, cellWidth: 10, cellHeight: 20, gap: 2, labelWidth: 30, headerHeight: 18);

    test('measures the grid with its labels', () {
      expect(g.width, 70);
      expect(g.height, 78);
    });

    test('places a cell inside its slot, with half the gap on each side', () {
      expect(g.rect(0, 0), const Rect.fromLTWH(31, 19, 8, 18));
      expect(g.rect(2, 3), const Rect.fromLTWH(61, 59, 8, 18));
    });

    test('finds the cell under a point, and nothing over the labels or outside', () {
      expect(g.cellAt(const Offset(31, 19)), (row: 0, col: 0));
      expect(g.cellAt(const Offset(69, 77)), (row: 2, col: 3));
      expect(g.cellAt(const Offset(10, 30)), isNull, reason: 'row labels');
      expect(g.cellAt(const Offset(40, 5)), isNull, reason: 'column labels');
      expect(g.cellAt(const Offset(71, 30)), isNull);
      expect(g.cellAt(const Offset(40, 79)), isNull);
    });
  });

  test('colors a value along the scale from the empty color to the maximum', () {
    const lo = Color(0xFF000000), hi = Color(0xFFFFFFFF);
    expect(heatColor(lo, hi, 0, 100), lo);
    expect(heatColor(lo, hi, 100, 100), hi);
    expect(heatColor(lo, hi, 500, 100), hi, reason: 'above the maximum is clamped');
    expect(heatColor(lo, hi, 50, 100).r, closeTo(0.5, 0.01));
    expect(heatColor(lo, hi, 10, 0), lo, reason: 'no maximum, no scale');
  });

  group('yearGridLayout', () {
    List<YearHeatmapReportDay> daysOf(int year) => [
          for (var d = DateTime.utc(year, 1, 1); d.year == year; d = d.add(const Duration(days: 1)))
            YearHeatmapReportDay(date: d.toIso8601String().substring(0, 10), expense: d.day.toDouble(), income: 0),
        ];

    test('lays 2026 out week by week, Monday first', () {
      final layout = yearGridLayout(2026, daysOf(2026));
      expect(layout.cells, hasLength(365));
      // 2026-01-01 is a Thursday.
      expect((layout.cells.first.row, layout.cells.first.col), (0, 3));
      expect((layout.cells[4].row, layout.cells[4].col), (1, 0), reason: 'the next Monday starts week 1');
      // 2026-12-31 is a Thursday, day 365 of the year.
      expect((layout.cells.last.row, layout.cells.last.col), (52, 3));
      expect(layout.weeks, 53);
    });

    test('keeps one cell per report day, in the same order, with the day’s expense', () {
      final days = daysOf(2026);
      final layout = yearGridLayout(2026, days);
      expect(layout.cells.map((c) => c.value), days.map((d) => d.expense));
    });

    test('says in which row each month begins, never the same one twice', () {
      final layout = yearGridLayout(2026, daysOf(2026));
      expect(layout.monthRows.first, 0);
      expect(layout.monthRows[1], 4, reason: 'Feb 1 is the Sunday of week 4');
      expect(layout.monthRows.toSet(), hasLength(12));
      expect([...layout.monthRows]..sort(), layout.monthRows);
    });

    test('starts a year that begins on a Monday in the first column', () {
      // 2024-01-01 was a Monday, and 2024 is a leap year.
      final layout = yearGridLayout(2024, daysOf(2024));
      expect((layout.cells.first.row, layout.cells.first.col), (0, 0));
      expect(layout.cells, hasLength(366));
      expect(layout.weeks, 53);
    });
  });

  group('divergingLayout', () {
    test('puts the zero line where the negatives end and scales to the largest change', () {
      final l = divergingLayout([-10, 30]);
      expect(l.zero, closeTo(0.25, 1e-9));
      expect(l.bars[0].start, closeTo(0, 1e-9));
      expect(l.bars[0].end, closeTo(0.25, 1e-9));
      expect(l.bars[1].start, closeTo(0.25, 1e-9));
      expect(l.bars[1].end, closeTo(1, 1e-9));
    });

    test('puts the zero line at an edge when every change has the same sign', () {
      expect(divergingLayout([-5, -10]).zero, 1);
      expect(divergingLayout([5, 10]).zero, 0);
    });

    test('has nothing to draw when nothing changed', () {
      final l = divergingLayout([0, 0]);
      expect(l.zero, 0.5);
      expect(l.bars.map((b) => b.end - b.start), [0, 0]);
      expect(divergingLayout(const []).bars, isEmpty);
    });

    test('never draws a bar outside the plot', () {
      for (final b in divergingLayout([-3, 7, -9, 1]).bars) {
        expect(b.start, inInclusiveRange(0, 1));
        expect(b.end, inInclusiveRange(0, 1));
        expect(b.end, greaterThanOrEqualTo(b.start));
      }
    });
  });
}
