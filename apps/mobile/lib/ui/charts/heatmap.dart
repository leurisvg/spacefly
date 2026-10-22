import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../api/models.g.dart' show YearHeatmapReportDay;
import '../../shared/dates.dart';
import '../../theme/app_theme.dart';

/// One filled square of a [HeatmapGrid]: its place in the grid and its value.
class HeatCell {
  const HeatCell({required this.row, required this.col, required this.value});
  final int row;
  final int col;
  final double value;
}

/// Where the cells of a heatmap sit. Pure, so it is tested without drawing: the painter only draws what this says.
class HeatmapGeometry {
  const HeatmapGeometry({required this.rows, required this.cols, required this.cellWidth, required this.cellHeight, this.gap = 2, this.labelWidth = 0, this.headerHeight = 0});

  final int rows;
  final int cols;
  final double cellWidth;
  final double cellHeight;

  /// Space left between two cells (half on each side).
  final double gap;

  /// Room to the left of the grid for row labels, and above it for column labels.
  final double labelWidth;
  final double headerHeight;

  double get width => labelWidth + cols * cellWidth;
  double get height => headerHeight + rows * cellHeight;

  Rect rect(int row, int col) => Rect.fromLTWH(labelWidth + col * cellWidth + gap / 2, headerHeight + row * cellHeight + gap / 2, cellWidth - gap, cellHeight - gap);

  /// The grid position under a point, or `null` outside the cells (labels included).
  ({int row, int col})? cellAt(Offset p) {
    final x = p.dx - labelWidth, y = p.dy - headerHeight;
    if (x < 0 || y < 0) return null;
    final col = x ~/ cellWidth, row = y ~/ cellHeight;
    if (col >= cols || row >= rows) return null;
    return (row: row, col: col);
  }
}

/// The color of a value on the scale from [lo] (nothing) to [hi] (the maximum).
Color heatColor(Color lo, Color hi, double value, double max) {
  if (max <= 0 || value <= 0) return lo;
  return Color.lerp(lo, hi, (value / max).clamp(0.0, 1.0))!;
}

/// The year as a vertical calendar: one row per week (Monday first), seven columns, each day a cell in the order of the report's days.
class YearGridLayout {
  const YearGridLayout({required this.cells, required this.weeks, required this.monthRows});

  /// One per day of the report, in the same order.
  final List<HeatCell> cells;
  final int weeks;

  /// The row in which each month (0–11) begins.
  final List<int> monthRows;
}

YearGridLayout yearGridLayout(int year, List<YearHeatmapReportDay> days) {
  final jan1 = DateTime.utc(year, 1, 1);
  final lead = weekdayMon0(toIso(jan1));
  int slot(String date) => parseIso(date).difference(jan1).inDays + lead;
  final cells = [for (final d in days) HeatCell(row: slot(d.date) ~/ 7, col: slot(d.date) % 7, value: d.expense)];
  final lastSlot = slot('$year-12-31');
  return YearGridLayout(
    cells: cells,
    weeks: lastSlot ~/ 7 + 1,
    monthRows: [for (var m = 1; m <= 12; m++) slot('$year-${m.toString().padLeft(2, '0')}-01') ~/ 7],
  );
}

/// A grid of colored squares drawn on a canvas. Tapping a cell calls [onCell] with its index in [cells].
class HeatmapGrid extends StatelessWidget {
  const HeatmapGrid({
    super.key,
    required this.rows,
    required this.cols,
    required this.cells,
    required this.max,
    this.cellWidth,
    this.cellHeight = 20,
    this.labelWidth = 0,
    this.rowLabels = const {},
    this.colLabels = const [],
    this.cellLabel,
    this.onCell,
    this.semanticsLabel,
  });

  final int rows;
  final int cols;
  final List<HeatCell> cells;

  /// The value drawn in the darkest color.
  final double max;

  /// `null` fills the available width.
  final double? cellWidth;
  final double cellHeight;
  final double labelWidth;

  /// Text for some rows (by row number) and for the columns.
  final Map<int, String> rowLabels;
  final List<String> colLabels;

  /// Short text drawn inside the cell, if any.
  final String? Function(int index)? cellLabel;
  final void Function(int index)? onCell;
  final String? semanticsLabel;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return LayoutBuilder(
      builder: (context, constraints) {
        final cw = cellWidth ?? (constraints.maxWidth - labelWidth) / cols;
        final geometry = HeatmapGeometry(rows: rows, cols: cols, cellWidth: cw, cellHeight: cellHeight, labelWidth: labelWidth, headerHeight: colLabels.isEmpty ? 0 : 18);
        final byPosition = {for (final (i, c) in cells.indexed) (c.row, c.col): i};
        return Semantics(
          label: semanticsLabel,
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTapUp: onCell == null
                ? null
                : (d) {
                    final at = geometry.cellAt(d.localPosition);
                    final index = at == null ? null : byPosition[(at.row, at.col)];
                    if (index != null) onCell!(index);
                  },
            child: CustomPaint(
              size: Size(geometry.width, geometry.height),
              painter: _HeatmapPainter(
                geometry: geometry,
                cells: cells,
                max: max,
                lo: tokens.chartGrid,
                hi: tokens.moneyExpense,
                ink: tokens.chartInk,
                muted: tokens.chartMuted,
                rowLabels: rowLabels,
                colLabels: colLabels,
                cellLabel: cellLabel,
              ),
            ),
          ),
        );
      },
    );
  }
}

class _HeatmapPainter extends CustomPainter {
  _HeatmapPainter({required this.geometry, required this.cells, required this.max, required this.lo, required this.hi, required this.ink, required this.muted, required this.rowLabels, required this.colLabels, required this.cellLabel});

  final HeatmapGeometry geometry;
  final List<HeatCell> cells;
  final double max;
  final Color lo;
  final Color hi;
  final Color ink;
  final Color muted;
  final Map<int, String> rowLabels;
  final List<String> colLabels;
  final String? Function(int index)? cellLabel;

  void _text(Canvas canvas, String text, Offset at, {required Color color, double size = 10, bool centered = false, double? maxWidth}) {
    final tp = TextPainter(
      text: TextSpan(text: text, style: TextStyle(color: color, fontSize: size)),
      textDirection: TextDirection.ltr,
      maxLines: 1,
      ellipsis: '…',
    )..layout(maxWidth: maxWidth ?? double.infinity);
    tp.paint(canvas, centered ? at - Offset(tp.width / 2, tp.height / 2) : at - Offset(0, tp.height / 2));
  }

  @override
  void paint(Canvas canvas, Size size) {
    final g = geometry;
    for (var c = 0; c < colLabels.length && c < g.cols; c++) {
      _text(canvas, colLabels[c], Offset(g.labelWidth + c * g.cellWidth + g.cellWidth / 2, g.headerHeight / 2), color: muted, centered: true, maxWidth: g.cellWidth);
    }
    rowLabels.forEach((row, label) => _text(canvas, label, Offset(0, g.headerHeight + row * g.cellHeight + g.cellHeight / 2), color: ink, size: 11, maxWidth: g.labelWidth - 4));
    final paint = Paint();
    for (final (i, cell) in cells.indexed) {
      final r = g.rect(cell.row, cell.col);
      final color = heatColor(lo, hi, cell.value, max);
      canvas.drawRRect(RRect.fromRectAndRadius(r, const Radius.circular(3)), paint..color = color);
      final label = cellLabel?.call(i);
      if (label != null && label.isNotEmpty) {
        _text(canvas, label, r.center, color: onColor(color), size: math.min(10, r.height - 6), centered: true, maxWidth: r.width);
      }
    }
  }

  @override
  bool shouldRepaint(_HeatmapPainter old) =>
      old.geometry != geometry || old.cells != cells || old.max != max || old.lo != lo || old.hi != hi || old.rowLabels != rowLabels || old.colLabels != colLabels;
}

/// "0 ▮▮▮▮ max": the color scale of a heatmap.
class HeatLegend extends StatelessWidget {
  const HeatLegend({super.key, required this.maxLabel, required this.zeroLabel});
  final String maxLabel;
  final String zeroLabel;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final style = TextStyle(fontSize: 11, color: tokens.chartMuted);
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(zeroLabel, style: style),
        const SizedBox(width: 8),
        Container(
          width: 120,
          height: 10,
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(3), gradient: LinearGradient(colors: [tokens.chartGrid, tokens.moneyExpense])),
        ),
        const SizedBox(width: 8),
        Text(maxLabel, style: style),
      ],
    );
  }
}
