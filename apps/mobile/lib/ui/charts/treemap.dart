import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

/// Splits [bounds] into one rectangle per value, each of an area proportional to its value, as square as can be (the squarified
/// treemap of Bruls, Huizing and van Wijk). The rectangles come back in the order of [values]; a value that is not positive gets an
/// empty one. Pure so it is tested without drawing.
List<Rect> squarify(List<double> values, Rect bounds) {
  final result = List<Rect>.filled(values.length, Rect.zero);
  final order = [for (var i = 0; i < values.length; i++) if (values[i] > 0) i]..sort((a, b) => values[b].compareTo(values[a]));
  final total = order.fold<double>(0, (a, i) => a + values[i]);
  if (order.isEmpty || bounds.width <= 0 || bounds.height <= 0) return result;
  final scale = bounds.width * bounds.height / total;

  var free = bounds;
  var row = <int>[];
  var rowArea = 0.0;

  double worst(List<int> items, double area, double side) {
    var lo = double.infinity, hi = 0.0;
    for (final i in items) {
      final a = values[i] * scale;
      lo = math.min(lo, a);
      hi = math.max(hi, a);
    }
    final s2 = side * side, a2 = area * area;
    return math.max(s2 * hi / a2, a2 / (s2 * lo));
  }

  void layoutRow() {
    if (row.isEmpty) return;
    final horizontal = free.width >= free.height;
    final side = horizontal ? free.height : free.width;
    final thickness = rowArea / side;
    var offset = 0.0;
    for (final i in row) {
      final length = values[i] * scale / thickness;
      result[i] = horizontal
          ? Rect.fromLTWH(free.left, free.top + offset, thickness, length)
          : Rect.fromLTWH(free.left + offset, free.top, length, thickness);
      offset += length;
    }
    free = horizontal ? Rect.fromLTRB(free.left + thickness, free.top, free.right, free.bottom) : Rect.fromLTRB(free.left, free.top + thickness, free.right, free.bottom);
    row = [];
    rowArea = 0;
  }

  for (final i in order) {
    final side = math.min(free.width, free.height);
    final area = values[i] * scale;
    if (row.isEmpty || worst([...row, i], rowArea + area, side) <= worst(row, rowArea, side)) {
      row.add(i);
      rowArea += area;
    } else {
      layoutRow();
      row.add(i);
      rowArea = area;
    }
  }
  layoutRow();
  return result;
}

/// One cell of a [Treemap].
class TreemapItem {
  const TreemapItem({required this.name, required this.value, required this.label, required this.color});
  final String name;
  final double value;

  /// The amount written under the name.
  final String label;
  final Color color;
}

/// Rectangles whose area is the value, drawn on a canvas. Tapping one calls [onItem] with its index in [items].
class Treemap extends StatelessWidget {
  const Treemap({super.key, required this.items, required this.onItem, this.height = 300, this.semanticsLabel});

  final List<TreemapItem> items;
  final void Function(int index) onItem;
  final double height;
  final String? semanticsLabel;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return LayoutBuilder(
      builder: (context, box) {
        final rects = squarify([for (final i in items) i.value], Offset.zero & Size(box.maxWidth, height));
        return Semantics(
          label: semanticsLabel,
          child: GestureDetector(
            key: const Key('treemap'),
            behavior: HitTestBehavior.opaque,
            onTapUp: (d) {
              final index = rects.indexWhere((r) => r.contains(d.localPosition));
              if (index >= 0) onItem(index);
            },
            child: CustomPaint(size: Size(box.maxWidth, height), painter: _TreemapPainter(items: items, rects: rects, surface: tokens.chartSurface, ink: tokens.chartOnFill)),
          ),
        );
      },
    );
  }
}

class _TreemapPainter extends CustomPainter {
  _TreemapPainter({required this.items, required this.rects, required this.surface, required this.ink});

  final List<TreemapItem> items;
  final List<Rect> rects;
  final Color surface;
  final Color ink;

  @override
  void paint(Canvas canvas, Size size) {
    for (final (i, item) in items.indexed) {
      final r = rects[i].deflate(1.5);
      if (r.isEmpty) continue;
      final rrect = RRect.fromRectAndRadius(r, const Radius.circular(4));
      canvas.drawRRect(rrect, Paint()..color = item.color);
      if (r.width < 44 || r.height < 28) continue;
      canvas.save();
      canvas.clipRRect(rrect);
      final tp = TextPainter(
        text: TextSpan(
          style: TextStyle(color: ink, fontSize: 12, height: 1.3),
          children: [TextSpan(text: '${item.name}\n', style: const TextStyle(fontWeight: FontWeight.w600)), TextSpan(text: item.label, style: const TextStyle(fontSize: 11))],
        ),
        textDirection: TextDirection.ltr,
        maxLines: 2,
        ellipsis: '…',
      )..layout(maxWidth: r.width - 12);
      tp.paint(canvas, r.topLeft + const Offset(6, 5));
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(_TreemapPainter old) => old.items != items || old.rects != rects || old.surface != surface;
}
