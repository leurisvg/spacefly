import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

/// One bar of a [RankingBars] chart.
class RankBar {
  const RankBar({required this.name, required this.value, required this.label});
  final String name;
  final double value;

  /// The value written at the end of the name.
  final String label;
}

/// How long each bar is, as a fraction (0–1) of the room: the largest value fills it. Negative values count as nothing. Pure so it is
/// tested without drawing.
List<double> barFractions(List<double> values) {
  final top = values.fold<double>(0, (m, v) => v > m ? v : m);
  return [for (final v in values) top <= 0 || v <= 0 ? 0.0 : v / top];
}

/// Horizontal bars, one row per item with its name and value above the bar, biggest first. Tapping a row calls [onRow] with its
/// position in [rows].
class RankingBars extends StatelessWidget {
  const RankingBars({super.key, required this.rows, required this.color, required this.onRow});

  final List<RankBar> rows;
  final Color color;
  final void Function(int index) onRow;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final fractions = barFractions([for (final r in rows) r.value]);
    return Column(
      children: [
        for (final (i, r) in rows.indexed)
          InkWell(
            key: Key('rank-bar-$i'),
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
                    builder: (context, c) => Stack(
                      children: [
                        Container(height: 12, width: c.maxWidth, decoration: BoxDecoration(color: tokens.chartGrid.withValues(alpha: 0.35), borderRadius: BorderRadius.circular(3))),
                        Container(height: 12, width: c.maxWidth * fractions[i], decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(3))),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
