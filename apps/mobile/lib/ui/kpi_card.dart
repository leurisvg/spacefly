import 'package:flutter/material.dart';

import '../format/formatter.dart';
import '../i18n/strings.g.dart';
import '../ui_logic/delta.dart';
import 'charts.dart';
import 'common.dart';

enum KpiFormat { money, pct }

/// Stat tile: label · value · change vs the previous period · 12-point trend.
/// Port of apps/web/src/app/shared/components/kpi-card.ts.
class KpiCard extends StatelessWidget {
  const KpiCard({
    super.key,
    required this.label,
    required this.f,
    required this.accent,
    this.value,
    this.previous,
    this.spark,
    this.format = KpiFormat.money,
    this.upIsGood = true,
    this.loading = false,
  });

  final String label;
  final Formatter f;
  final Color accent;
  final double? value;
  final double? previous;
  final List<double>? spark;
  final KpiFormat format;
  final bool upIsGood;
  final bool loading;

  String _show(double v) => format == KpiFormat.pct ? f.pct(v / 100) : f.money(v);

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final negative = !f.hidden && (value ?? 0) < 0;
    final delta = previous == null || loading ? null : deltaModel(value ?? 0, previous, upIsGood: upIsGood, hidden: f.hidden);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          Positioned.fill(child: Align(alignment: Alignment.centerLeft, child: Container(width: 4, color: accent))),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 12, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(label.toUpperCase(), maxLines: 1, overflow: TextOverflow.ellipsis, style: text.labelSmall?.copyWith(color: scheme.onSurfaceVariant, letterSpacing: 0.6))),
                    if (delta != null) _DeltaChip(delta: delta, points: format == KpiFormat.pct, f: f),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: loading || value == null
                          ? const Align(alignment: Alignment.centerLeft, child: Skeleton(width: 110, height: 26))
                          : FittedBox(
                              fit: BoxFit.scaleDown,
                              alignment: Alignment.centerLeft,
                              child: Text(_show(value!), style: numStyle(context, size: 22, weight: FontWeight.w600, color: negative ? scheme.error : scheme.onSurface)),
                            ),
                    ),
                    if (spark != null && !loading) Padding(padding: const EdgeInsets.only(left: 8), child: SizedBox(width: 48, height: 26, child: SparkLine(values: spark!, color: accent))),
                  ],
                ),
                const SizedBox(height: 6),
                if (previous != null && !loading)
                  Text(
                    '${context.t.kpi.vsPrevious} ${format == KpiFormat.pct ? f.pct(previous! / 100) : f.compact(previous)}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DeltaChip extends StatelessWidget {
  const _DeltaChip({required this.delta, required this.points, required this.f});

  final DeltaModel delta;
  final bool points;
  final Formatter f;

  @override
  Widget build(BuildContext context) {
    final color = toneColor(context, delta.tone);
    final icon = switch (delta.direction) {
      Direction.up => Icons.arrow_drop_up,
      Direction.down => Icons.arrow_drop_down,
      Direction.flat => Icons.remove,
    };
    final label = points ? delta.pointsLabel : (delta.ratio == null ? '' : f.pct(delta.ratio));
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 18, color: color),
        if (label.isNotEmpty) Text(label, style: numStyle(context, size: 11, weight: FontWeight.w600, color: color)),
      ],
    );
  }
}
