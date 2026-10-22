import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

/// A budget (inner ring) with the categories spent in it (outer ring).
class SunburstGroup {
  const SunburstGroup({required this.name, required this.color, required this.children});
  final String name;
  final Color color;
  final List<SunburstChild> children;

  double get total => children.fold(0, (a, c) => a + c.value);
}

class SunburstChild {
  const SunburstChild({required this.name, required this.value});
  final String name;
  final double value;
}

/// One slice of the rings: angles in radians from the top, clockwise, and radii as a fraction (0–1) of the chart's radius.
class SunburstArc {
  const SunburstArc({required this.group, required this.child, required this.start, required this.sweep, required this.inner, required this.outer, required this.value});

  /// Position of its group; [child] is the position inside it, or -1 for a slice of the inner ring.
  final int group;
  final int child;
  final double start;
  final double sweep;
  final double inner;
  final double outer;
  final double value;

  bool get isGroup => child < 0;

  double get middle => start + sweep / 2;
}

const sunburstHole = 0.12;
const sunburstSplit = 0.45;
const sunburstEdge = 0.92;

/// The slices of both rings. Groups run clockwise from the top, each taking the angle its total deserves, and its categories split
/// that angle between them. Empty groups and categories without value are left out. Pure so it is tested without drawing.
List<SunburstArc> sunburstArcs(List<SunburstGroup> groups) {
  final total = groups.fold<double>(0, (a, g) => a + g.children.where((c) => c.value > 0).fold<double>(0, (s, c) => s + c.value));
  if (total <= 0) return const [];
  final arcs = <SunburstArc>[];
  var angle = -math.pi / 2;
  for (final (gi, g) in groups.indexed) {
    final sum = g.children.where((c) => c.value > 0).fold<double>(0, (s, c) => s + c.value);
    if (sum <= 0) continue;
    final sweep = sum / total * 2 * math.pi;
    arcs.add(SunburstArc(group: gi, child: -1, start: angle, sweep: sweep, inner: sunburstHole, outer: sunburstSplit, value: sum));
    var a = angle;
    for (final (ci, c) in g.children.indexed) {
      if (c.value <= 0) continue;
      final s = c.value / total * 2 * math.pi;
      arcs.add(SunburstArc(group: gi, child: ci, start: a, sweep: s, inner: sunburstSplit, outer: sunburstEdge, value: c.value));
      a += s;
    }
    angle += sweep;
  }
  return arcs;
}

/// The slice under a point, given the chart's [radius] and [center]; `null` in the hole or outside the rings.
SunburstArc? sunburstArcAt(List<SunburstArc> arcs, Offset point, {required Offset center, required double radius}) {
  final d = point - center;
  final r = d.distance / radius;
  if (r < sunburstHole || r > sunburstEdge) return null;
  var angle = math.atan2(d.dy, d.dx);
  for (final a in arcs) {
    if (r < a.inner || r > a.outer) continue;
    var rel = angle - a.start;
    while (rel < 0) {
      rel += 2 * math.pi;
    }
    while (rel >= 2 * math.pi) {
      rel -= 2 * math.pi;
    }
    if (rel <= a.sweep) return a;
  }
  return null;
}

/// Two rings: budgets inside, the categories spent in each outside. Tapping a slice calls [onArc] with it (`null` for the hole or
/// outside the rings); the screen says what it is.
class Sunburst extends StatelessWidget {
  const Sunburst({super.key, required this.groups, required this.onArc, this.size = 300, this.semanticsLabel});

  final List<SunburstGroup> groups;

  final void Function(SunburstArc? arc) onArc;
  final double size;
  final String? semanticsLabel;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final arcs = sunburstArcs(groups);
    return LayoutBuilder(
      builder: (context, box) {
        final side = math.min(size, box.maxWidth);
        final radius = side / 2;
        return Semantics(
          label: semanticsLabel,
          child: Center(
            child: SizedBox(
              width: side,
              height: side,
              child: GestureDetector(
                key: const Key('sunburst'),
                behavior: HitTestBehavior.opaque,
                onTapUp: (d) => onArc(sunburstArcAt(arcs, d.localPosition, center: Offset(radius, radius), radius: radius)),
                child: CustomPaint(size: Size(side, side), painter: _SunburstPainter(groups: groups, arcs: arcs, surface: tokens.chartSurface, ink: tokens.chartOnFill)),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _SunburstPainter extends CustomPainter {
  _SunburstPainter({required this.groups, required this.arcs, required this.surface, required this.ink});

  final List<SunburstGroup> groups;
  final List<SunburstArc> arcs;
  final Color surface;
  final Color ink;

  @override
  void paint(Canvas canvas, Size size) {
    final radius = size.width / 2;
    final c = Offset(radius, radius);
    for (final a in arcs) {
      final color = groups[a.group].color;
      final path = Path()
        ..arcTo(Rect.fromCircle(center: c, radius: a.outer * radius), a.start, a.sweep, true)
        ..arcTo(Rect.fromCircle(center: c, radius: a.inner * radius), a.start + a.sweep, -a.sweep, false)
        ..close();
      canvas.drawPath(path, Paint()..color = a.isGroup ? color : color.withValues(alpha: 0.85));
      canvas.drawPath(
        path,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2
          ..color = surface,
      );
      // The name of a budget, when its slice is wide enough to hold it.
      if (a.isGroup && a.sweep > 0.45) {
        final mid = (a.inner + a.outer) / 2 * radius;
        final tp = TextPainter(
          text: TextSpan(text: groups[a.group].name, style: TextStyle(fontSize: 10.5, color: ink, fontWeight: FontWeight.w600)),
          textDirection: TextDirection.ltr,
          maxLines: 1,
          ellipsis: '…',
        )..layout(maxWidth: (a.outer - a.inner) * radius * 1.1);
        final p = c + Offset(math.cos(a.middle), math.sin(a.middle)) * mid;
        tp.paint(canvas, p - Offset(tp.width / 2, tp.height / 2));
      }
    }
  }

  @override
  bool shouldRepaint(_SunburstPainter old) => old.groups != groups || old.surface != surface;
}
