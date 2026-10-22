import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

/// One bar of a [DivergingBars] chart.
class DivergingRow {
  const DivergingRow({required this.name, required this.delta, required this.label, required this.color});
  final String name;
  final double delta;

  /// The value written next to the bar.
  final String label;
  final Color color;
}

/// Where the bars of a diverging chart sit, as fractions (0–1) of the width of the plot area: the zero line, and the start and
/// end of every bar. Pure so it is tested without drawing. The scale covers the largest absolute change, so the longest bar fills
/// the room on its side of the zero line.
class DivergingLayout {
  const DivergingLayout({required this.zero, required this.bars});

  /// Position of the zero line.
  final double zero;

  /// Start and end of each bar (start < end), in the order of the input.
  final List<({double start, double end})> bars;
}

DivergingLayout divergingLayout(List<double> deltas) {
  final lowest = deltas.fold<double>(0, (m, d) => d < m ? d : m);
  final highest = deltas.fold<double>(0, (m, d) => d > m ? d : m);
  final span = highest - lowest;
  if (span == 0) return DivergingLayout(zero: 0.5, bars: [for (final _ in deltas) (start: 0.5, end: 0.5)]);
  final zero = -lowest / span;
  return DivergingLayout(zero: zero, bars: [for (final d in deltas) d >= 0 ? (start: zero, end: zero + d / span) : (start: zero + d / span, end: zero)]);
}

/// Horizontal bars growing left (negative) or right (positive) from a zero line, one row per item with its name above. Tapping a
/// row calls [onRow] with its position in [rows].
class DivergingBars extends StatelessWidget {
  const DivergingBars({super.key, required this.rows, required this.onRow});

  final List<DivergingRow> rows;
  final void Function(int index) onRow;

  static const _barHeight = 14.0;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final layout = divergingLayout([for (final r in rows) r.delta]);
    return Column(
      children: [
        for (final (i, r) in rows.indexed)
          InkWell(
            key: Key('diverging-$i'),
            onTap: () => onRow(i),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 5),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(child: Text(r.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13))),
                      Text(r.label, style: TextStyle(fontSize: 12, color: tokens.chartInk2, fontFeatures: const [FontFeature.tabularFigures()])),
                    ],
                  ),
                  const SizedBox(height: 4),
                  LayoutBuilder(
                    builder: (context, c) {
                      final bar = layout.bars[i];
                      return SizedBox(
                        height: _barHeight,
                        width: c.maxWidth,
                        child: Stack(
                          children: [
                            Positioned(left: bar.start * c.maxWidth, width: (bar.end - bar.start) * c.maxWidth, top: 0, bottom: 0, child: DecoratedBox(decoration: BoxDecoration(color: r.color, borderRadius: BorderRadius.circular(3)))),
                            Positioned(left: layout.zero * c.maxWidth - 0.5, width: 1, top: 0, bottom: 0, child: ColoredBox(color: tokens.chartAxis)),
                          ],
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
