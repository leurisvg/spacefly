import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../api/models.g.dart' show SankeyNodeKind;
import '../../theme/app_theme.dart';
import '../../theme/tokens.g.dart';

/// The color of a node by what it is. Port of `SANKEY_COLORS` in libs/client/src/charts/builders.ts.
Color sankeyColor(ThemeTokens tokens, SankeyNodeKind kind) => switch (kind) {
      SankeyNodeKind.REVENUE => tokens.moneyRevenue,
      SankeyNodeKind.INCOME_CAT => tokens.moneyIncome,
      SankeyNodeKind.HUB => tokens.moneyHub,
      SankeyNodeKind.BUDGET || SankeyNodeKind.TAG => tokens.moneyBudget,
      SankeyNodeKind.CATEGORY => tokens.moneyExpense,
      SankeyNodeKind.SAVINGS => tokens.moneySavings,
      SankeyNodeKind.DEFICIT => tokens.moneyDeficit,
      SankeyNodeKind.OTHER => tokens.moneyOther,
    };

/// A node to lay out: its id and the value it carries when no link says otherwise.
class SankeyInNode {
  const SankeyInNode(this.id, this.value);
  final String id;
  final double value;
}

class SankeyInLink {
  const SankeyInLink(this.source, this.target, this.value);
  final String source;
  final String target;
  final double value;
}

/// A node placed on the plane. The "breadth" axis is the one the nodes are spread along (the width of a vertical chart), the "length"
/// axis is the one the flow runs along (its height).
class SankeyBox {
  const SankeyBox({required this.id, required this.index, required this.layer, required this.value, required this.b0, required this.b1, required this.l0, required this.l1});
  final String id;

  /// Position in the input list.
  final int index;
  final int layer;

  /// What flows through it: the larger of what comes in and what goes out.
  final double value;
  final double b0;
  final double b1;
  final double l0;
  final double l1;

  double get size => b1 - b0;
}

/// A link as a band: it leaves its source at [sourceB] and reaches its target at [targetB] (the middle of the band on each side), and is
/// [width] wide.
class SankeyBand {
  const SankeyBand({required this.source, required this.target, required this.value, required this.width, required this.sourceB, required this.targetB, required this.l0, required this.l1});
  final int source;
  final int target;
  final double value;
  final double width;
  final double sourceB;
  final double targetB;

  /// Where the band starts (the end of its source) and ends (the start of its target) along the length axis.
  final double l0;
  final double l1;
}

class SankeyLayout {
  const SankeyLayout({required this.nodes, required this.links, required this.layers});
  final List<SankeyBox> nodes;
  final List<SankeyBand> links;
  final int layers;

  /// The node under a point of the vertical chart (x = breadth, y = length), allowing [slop] of room around thin nodes.
  SankeyBox? nodeAt(Offset p, {double slop = 4}) {
    SankeyBox? best;
    var bestDistance = double.infinity;
    for (final n in nodes) {
      final dx = p.dx < n.b0 ? n.b0 - p.dx : (p.dx > n.b1 ? p.dx - n.b1 : 0.0);
      final dy = p.dy < n.l0 ? n.l0 - p.dy : (p.dy > n.l1 ? p.dy - n.l1 : 0.0);
      if (dx > slop || dy > slop) continue;
      final d = dx * dx + dy * dy;
      if (d < bestDistance) {
        best = n;
        bestDistance = d;
      }
    }
    return best;
  }
}

class _Node {
  _Node(this.index, this.id, this.given);
  final int index;
  final String id;
  final double given;
  double value = 0;
  int layer = 0;
  double b0 = 0;
  double b1 = 0;
  final List<_Link> out = [];
  final List<_Link> into = [];
}

class _Link {
  _Link(this.index, this.source, this.target, this.value);
  final int index;
  final _Node source;
  final _Node target;
  final double value;
  double width = 0;
  double sourceB = 0;
  double targetB = 0;
}

/// Lays a Sankey diagram out the way d3-sankey does (justified layers, node sizes proportional to the flow, relaxation of the
/// positions towards the nodes they are linked to). [breadth] is the room across the flow and [length] along it. Links to unknown
/// nodes, to themselves or without value are dropped. Pure: the painter only draws what this says.
SankeyLayout sankeyLayout({
  required List<SankeyInNode> nodes,
  required List<SankeyInLink> links,
  required double breadth,
  required double length,
  double nodeThickness = 14,
  double nodeGap = 12,
  int iterations = 32,
}) {
  final list = [for (final (i, n) in nodes.indexed) _Node(i, n.id, n.value)];
  final byId = {for (final n in list) n.id: n};
  final all = <_Link>[];
  for (final l in links) {
    final s = byId[l.source], t = byId[l.target];
    if (s == null || t == null || identical(s, t) || !(l.value > 0)) continue;
    final link = _Link(all.length, s, t, l.value);
    all.add(link);
    s.out.add(link);
    t.into.add(link);
  }
  for (final n in list) {
    final out = n.out.fold<double>(0, (a, l) => a + l.value), into = n.into.fold<double>(0, (a, l) => a + l.value);
    n.value = math.max(out, into);
    if (n.value == 0) n.value = math.max(0, n.given);
  }

  // Depth: the longest path from a source. The passes are bounded so a cycle cannot loop for ever.
  for (var pass = 0; pass < list.length; pass++) {
    var changed = false;
    for (final l in all) {
      if (l.target.layer < l.source.layer + 1) {
        l.target.layer = l.source.layer + 1;
        changed = true;
      }
    }
    if (!changed) break;
  }
  final maxDepth = list.fold<int>(0, (m, n) => math.max(m, n.layer));
  // "Justify": what nothing leaves from sits in the last layer.
  for (final n in list) {
    if (n.out.isEmpty) n.layer = maxDepth;
  }
  final columns = [for (var i = 0; i <= maxDepth; i++) <_Node>[]];
  for (final n in list) {
    columns[n.layer].add(n);
  }

  // Scale: the busiest layer decides how many units a pixel of breadth is worth.
  var ky = double.infinity;
  for (final c in columns) {
    final sum = c.fold<double>(0, (a, n) => a + n.value);
    if (c.isEmpty || sum <= 0) continue;
    ky = math.min(ky, math.max(0, breadth - (c.length - 1) * nodeGap) / sum);
  }
  if (ky == double.infinity) ky = 0;

  for (final c in columns) {
    var y = 0.0;
    for (final n in c) {
      n.b0 = y;
      n.b1 = y + n.value * ky;
      y = n.b1 + nodeGap;
      for (final l in n.out) {
        l.width = l.value * ky;
      }
    }
    final spread = (breadth - y + nodeGap) / (c.length + 1);
    for (final (i, n) in c.indexed) {
      n.b0 += spread * (i + 1);
      n.b1 += spread * (i + 1);
    }
    _reorderLinks(c);
  }

  for (var i = 0; i < iterations; i++) {
    final alpha = math.pow(0.99, i).toDouble();
    final beta = math.max(1 - alpha, (i + 1) / iterations);
    _relaxRightToLeft(columns, alpha, beta, nodeGap, breadth);
    _relaxLeftToRight(columns, alpha, beta, nodeGap, breadth);
  }

  for (final n in list) {
    var s = n.b0, t = n.b0;
    for (final l in n.out) {
      l.sourceB = s + l.width / 2;
      s += l.width;
    }
    for (final l in n.into) {
      l.targetB = t + l.width / 2;
      t += l.width;
    }
  }

  final step = maxDepth == 0 ? 0.0 : (length - nodeThickness) / maxDepth;
  final boxes = [for (final n in list) SankeyBox(id: n.id, index: n.index, layer: n.layer, value: n.value, b0: n.b0, b1: n.b1, l0: n.layer * step, l1: n.layer * step + nodeThickness)];
  final bands = [
    for (final l in all)
      SankeyBand(source: l.source.index, target: l.target.index, value: l.value, width: l.width, sourceB: l.sourceB, targetB: l.targetB, l0: boxes[l.source.index].l1, l1: boxes[l.target.index].l0),
  ];
  return SankeyLayout(nodes: boxes, links: bands, layers: maxDepth + 1);
}

void _reorderLinks(List<_Node> nodes) {
  for (final n in nodes) {
    n.out.sort((a, b) => _byBreadth(a.target, b.target) != 0 ? _byBreadth(a.target, b.target) : a.index - b.index);
    n.into.sort((a, b) => _byBreadth(a.source, b.source) != 0 ? _byBreadth(a.source, b.source) : a.index - b.index);
  }
}

int _byBreadth(_Node a, _Node b) => a.b0.compareTo(b.b0);

void _reorderNodeLinks(_Node node) {
  for (final l in node.into) {
    l.source.out.sort((a, b) => _byBreadth(a.target, b.target) != 0 ? _byBreadth(a.target, b.target) : a.index - b.index);
  }
  for (final l in node.out) {
    l.target.into.sort((a, b) => _byBreadth(a.source, b.source) != 0 ? _byBreadth(a.source, b.source) : a.index - b.index);
  }
}

double _targetTop(_Node source, _Node target, double gap) {
  var y = source.b0 - (source.out.length - 1) * gap / 2;
  for (final l in source.out) {
    if (identical(l.target, target)) break;
    y += l.width + gap;
  }
  for (final l in target.into) {
    if (identical(l.source, source)) break;
    y -= l.width;
  }
  return y;
}

double _sourceTop(_Node source, _Node target, double gap) {
  var y = target.b0 - (target.into.length - 1) * gap / 2;
  for (final l in target.into) {
    if (identical(l.source, source)) break;
    y += l.width + gap;
  }
  for (final l in source.out) {
    if (identical(l.target, target)) break;
    y -= l.width;
  }
  return y;
}

void _relaxLeftToRight(List<List<_Node>> columns, double alpha, double beta, double gap, double breadth) {
  for (var i = 1; i < columns.length; i++) {
    final column = columns[i];
    for (final target in column) {
      var y = 0.0, w = 0.0;
      for (final l in target.into) {
        final v = l.value * (target.layer - l.source.layer);
        y += _targetTop(l.source, target, gap) * v;
        w += v;
      }
      if (!(w > 0)) continue;
      final dy = (y / w - target.b0) * alpha;
      target.b0 += dy;
      target.b1 += dy;
      _reorderNodeLinks(target);
    }
    column.sort(_byBreadth);
    _resolveCollisions(column, beta, gap, breadth);
  }
}

void _relaxRightToLeft(List<List<_Node>> columns, double alpha, double beta, double gap, double breadth) {
  for (var i = columns.length - 2; i >= 0; i--) {
    final column = columns[i];
    for (final source in column) {
      var y = 0.0, w = 0.0;
      for (final l in source.out) {
        final v = l.value * (l.target.layer - source.layer);
        y += _sourceTop(source, l.target, gap) * v;
        w += v;
      }
      if (!(w > 0)) continue;
      final dy = (y / w - source.b0) * alpha;
      source.b0 += dy;
      source.b1 += dy;
      _reorderNodeLinks(source);
    }
    column.sort(_byBreadth);
    _resolveCollisions(column, beta, gap, breadth);
  }
}

void _resolveCollisions(List<_Node> nodes, double alpha, double gap, double breadth) {
  if (nodes.isEmpty) return;
  final i = nodes.length >> 1;
  final subject = nodes[i];
  _bottomToTop(nodes, subject.b0 - gap, i - 1, alpha, gap);
  _topToBottom(nodes, subject.b1 + gap, i + 1, alpha, gap);
  _bottomToTop(nodes, breadth, nodes.length - 1, alpha, gap);
  _topToBottom(nodes, 0, 0, alpha, gap);
}

void _topToBottom(List<_Node> nodes, double y, int i, double alpha, double gap) {
  for (; i < nodes.length; i++) {
    final n = nodes[i];
    final dy = (y - n.b0) * alpha;
    if (dy > 1e-6) {
      n.b0 += dy;
      n.b1 += dy;
    }
    y = n.b1 + gap;
  }
}

void _bottomToTop(List<_Node> nodes, double y, int i, double alpha, double gap) {
  for (; i >= 0; i--) {
    final n = nodes[i];
    final dy = (n.b1 - y) * alpha;
    if (dy > 1e-6) {
      n.b0 -= dy;
      n.b1 -= dy;
    }
    y = n.b0 - gap;
  }
}

/// How wide a vertical chart has to be for [maxInLayer] nodes to be told apart, with their rotated labels side by side.
double sankeyMinWidth(int maxInLayer, {double pitch = 20, double margin = 16}) => maxInLayer * pitch + margin;

/// A node of the chart as the painter needs it.
class SankeyChartNode {
  const SankeyChartNode({required this.id, required this.label, required this.value, required this.color});
  final String id;
  final String label;
  final double value;
  final Color color;
}

class SankeyChartLink {
  const SankeyChartLink(this.source, this.target, this.value);
  final String source;
  final String target;
  final double value;
}

/// The money flow as a vertical Sankey: nodes are bars across the width, links are bands between layers, and the labels run down from
/// each node. It scrolls sideways when there are too many nodes in a layer to fit the width. Tapping a node calls [onNode] with its id.
class SankeyChart extends StatelessWidget {
  const SankeyChart({super.key, required this.nodes, required this.links, required this.onNode, this.height = 420, this.labelRoom = 120, this.semanticsLabel});

  final List<SankeyChartNode> nodes;
  final List<SankeyChartLink> links;
  final void Function(String id) onNode;

  /// Total height, labels included.
  final double height;

  /// Room kept under the last layer for its labels.
  final double labelRoom;
  final String? semanticsLabel;

  static const _margin = 8.0;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return LayoutBuilder(
      builder: (context, box) {
        final byLayer = <int, int>{};
        // A first pass at the layers only to know how crowded the busiest one is.
        final probe = sankeyLayout(nodes: [for (final n in nodes) SankeyInNode(n.id, n.value)], links: [for (final l in links) SankeyInLink(l.source, l.target, l.value)], breadth: 100, length: 100, iterations: 0);
        for (final n in probe.nodes) {
          byLayer[n.layer] = (byLayer[n.layer] ?? 0) + 1;
        }
        final crowded = byLayer.values.fold<int>(0, math.max);
        final width = math.max(box.maxWidth, sankeyMinWidth(crowded));
        final layout = sankeyLayout(
          nodes: [for (final n in nodes) SankeyInNode(n.id, n.value)],
          links: [for (final l in links) SankeyInLink(l.source, l.target, l.value)],
          breadth: width - 2 * _margin,
          length: height - labelRoom - _margin,
        );
        final chart = GestureDetector(
          key: const Key('sankey'),
          behavior: HitTestBehavior.opaque,
          onTapUp: (d) {
            final hit = layout.nodeAt(Offset(d.localPosition.dx - _margin, d.localPosition.dy - _margin));
            if (hit != null) onNode(hit.id);
          },
          child: CustomPaint(
            size: Size(width, height),
            painter: _SankeyPainter(layout: layout, nodes: nodes, tokens: tokens, labelRoom: labelRoom, margin: _margin),
          ),
        );
        return Semantics(
          label: semanticsLabel,
          child: SizedBox(
            height: height,
            child: width > box.maxWidth ? SingleChildScrollView(scrollDirection: Axis.horizontal, child: chart) : chart,
          ),
        );
      },
    );
  }
}

class _SankeyPainter extends CustomPainter {
  _SankeyPainter({required this.layout, required this.nodes, required this.tokens, required this.labelRoom, required this.margin});

  final SankeyLayout layout;
  final List<SankeyChartNode> nodes;
  final ThemeTokens tokens;
  final double labelRoom;
  final double margin;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.translate(margin, margin);
    for (final l in layout.links) {
      final from = nodes[l.source].color, to = nodes[l.target].color;
      final x0 = l.sourceB, y0 = l.l0, x1 = l.targetB, y1 = l.l1;
      final mid = (y0 + y1) / 2;
      final path = Path()
        ..moveTo(x0, y0)
        ..cubicTo(x0, mid, x1, mid, x1, y1);
      final paint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = math.max(l.width, 0.6)
        ..shader = LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [from.withValues(alpha: 0.32), to.withValues(alpha: 0.32)]).createShader(Rect.fromLTRB(math.min(x0, x1), y0, math.max(x0, x1) + 1, y1));
      canvas.drawPath(path, paint);
    }
    final lastLayer = layout.layers - 1;
    final layerStep = layout.layers > 1 ? layout.nodes.firstWhere((n) => n.layer == 1, orElse: () => layout.nodes.first).l0 : 0.0;
    for (final b in layout.nodes) {
      final node = nodes[b.index];
      canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTRB(b.b0, b.l0, math.max(b.b1, b.b0 + 1.5), b.l1), const Radius.circular(2)), Paint()..color = node.color);
      final room = b.layer == lastLayer ? labelRoom - 8 : math.max(0.0, layerStep - (b.l1 - b.l0) - 6);
      if (room < 24 || node.label.isEmpty) continue;
      final tp = TextPainter(
        text: TextSpan(text: node.label, style: TextStyle(fontSize: 10.5, color: tokens.chartInk)),
        textDirection: TextDirection.ltr,
        maxLines: 1,
        ellipsis: '…',
      )..layout(maxWidth: room);
      // Written downwards from under the node, centered on it.
      canvas.save();
      canvas.translate((b.b0 + b.b1) / 2 + tp.height / 2, b.l1 + 4);
      canvas.rotate(math.pi / 2);
      tp.paint(canvas, Offset.zero);
      canvas.restore();
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(_SankeyPainter old) => old.layout != layout || old.nodes != nodes || old.tokens != tokens;
}
