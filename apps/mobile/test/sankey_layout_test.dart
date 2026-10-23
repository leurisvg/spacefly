import 'dart:math' as math;

import 'package:flutter/painting.dart' show Color, Offset, Rect;
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/ui/charts/ranking_bars.dart';
import 'package:spacefly_mobile/ui/charts/sankey.dart';
import 'package:spacefly_mobile/ui/charts/sunburst.dart';
import 'package:spacefly_mobile/ui/charts/treemap.dart';

void main() {
  group('sankeyLayout', () {
    // income 100 → hub → budget 60 → category 60, hub → savings 40, and a second source feeding the hub
    const nodes = [
      SankeyInNode('a', 70),
      SankeyInNode('b', 30),
      SankeyInNode('hub', 100),
      SankeyInNode('budget', 60),
      SankeyInNode('cat1', 35),
      SankeyInNode('cat2', 25),
      SankeyInNode('savings', 40),
    ];
    const links = [
      SankeyInLink('a', 'hub', 70),
      SankeyInLink('b', 'hub', 30),
      SankeyInLink('hub', 'budget', 60),
      SankeyInLink('budget', 'cat1', 35),
      SankeyInLink('budget', 'cat2', 25),
      SankeyInLink('hub', 'savings', 40),
    ];
    SankeyLayout layout({double breadth = 300, double length = 400}) => sankeyLayout(nodes: nodes, links: links, breadth: breadth, length: length);

    test('finds the band under a point, on its curve, and nothing away from it', () {
      final l = layout();
      for (final (i, band) in l.links.indexed) {
        expect(l.linkAt(SankeyLayout.bandPoint(band, 0.5)), i, reason: 'the middle of band $i');
      }
      expect(l.linkAt(const Offset(-50, -50)), isNull);
    });

    test('lights up a node with its bands and the nodes at their other ends', () {
      final l = layout();
      final budget = l.nodes.firstWhere((n) => n.id == 'budget').index;
      final focus = l.focusNode(budget);
      expect({for (final i in focus.nodes) l.nodes.firstWhere((n) => n.index == i).id}, {'budget', 'hub', 'cat1', 'cat2'});
      expect(focus.links, hasLength(3));
      for (final i in focus.links) {
        expect([l.links[i].source, l.links[i].target], contains(budget));
      }
    });

    test('lights up a band with its two nodes only', () {
      final l = layout();
      final focus = l.focusLink(0);
      expect(focus.links, {0});
      expect(focus.nodes, {l.links[0].source, l.links[0].target});
    });

    test('puts nodes in layers by their longest path and what nothing leaves in the last one', () {
      final l = layout();
      final layer = {for (final n in l.nodes) n.id: n.layer};
      expect(layer, {'a': 0, 'b': 0, 'hub': 1, 'budget': 2, 'cat1': 3, 'cat2': 3, 'savings': 3});
      expect(l.layers, 4);
    });

    test('sizes a node by the flow through it, the same scale for every node', () {
      final l = layout();
      final size = {for (final n in l.nodes) n.id: n.size};
      expect(size['hub']! / size['budget']!, closeTo(100 / 60, 1e-9));
      expect(size['a']! / size['b']!, closeTo(70 / 30, 1e-9));
      expect(size['cat1']! + size['cat2']! + size['savings']!, closeTo(size['hub']!, 1e-9), reason: 'what leaves the hub is what reaches the last layer');
    });

    test('keeps every node inside the room and apart from its neighbours in the layer', () {
      final l = layout();
      for (final n in l.nodes) {
        expect(n.b0, greaterThanOrEqualTo(-1e-6));
        expect(n.b1, lessThanOrEqualTo(300 + 1e-6));
      }
      for (var layer = 0; layer < l.layers; layer++) {
        final inLayer = l.nodes.where((n) => n.layer == layer).toList()..sort((x, y) => x.b0.compareTo(y.b0));
        for (var i = 1; i < inLayer.length; i++) {
          expect(inLayer[i].b0 - inLayer[i - 1].b1, greaterThanOrEqualTo(12 - 1e-6), reason: 'layer $layer');
        }
      }
    });

    test('runs the layers along the length, one node thickness each, from the start to the end', () {
      final l = layout();
      final byLayer = <int, double>{};
      for (final n in l.nodes) {
        byLayer[n.layer] = n.l0;
        expect(n.l1 - n.l0, 14);
      }
      expect(byLayer[0], 0);
      expect(byLayer[3], closeTo(400 - 14, 1e-9));
      expect(byLayer[1]! - byLayer[0]!, closeTo(byLayer[2]! - byLayer[1]!, 1e-9));
    });

    test('lays each link as a band that leaves its source and reaches its target inside their ranges', () {
      final l = layout();
      for (final band in l.links) {
        final s = l.nodes[band.source], t = l.nodes[band.target];
        expect(band.sourceB - band.width / 2, greaterThanOrEqualTo(s.b0 - 1e-6));
        expect(band.sourceB + band.width / 2, lessThanOrEqualTo(s.b1 + 1e-6));
        expect(band.targetB - band.width / 2, greaterThanOrEqualTo(t.b0 - 1e-6));
        expect(band.targetB + band.width / 2, lessThanOrEqualTo(t.b1 + 1e-6));
        expect(band.l0, s.l1);
        expect(band.l1, t.l0);
      }
      // the bands leaving a node do not overlap
      final fromHub = l.links.where((b) => l.nodes[b.source].id == 'hub').toList()..sort((x, y) => x.sourceB.compareTo(y.sourceB));
      for (var i = 1; i < fromHub.length; i++) {
        expect(fromHub[i].sourceB - fromHub[i].width / 2, greaterThanOrEqualTo(fromHub[i - 1].sourceB + fromHub[i - 1].width / 2 - 1e-6));
      }
    });

    test('is stable: the same input gives the same layout', () {
      final a = layout(), b = layout();
      expect([for (final n in a.nodes) (n.b0, n.b1)], [for (final n in b.nodes) (n.b0, n.b1)]);
    });

    test('drops links to unknown nodes, to themselves and without value, and copes with no links at all', () {
      final l = sankeyLayout(
        nodes: const [SankeyInNode('x', 5), SankeyInNode('y', 5)],
        links: const [SankeyInLink('x', 'zzz', 3), SankeyInLink('x', 'x', 3), SankeyInLink('x', 'y', 0)],
        breadth: 100,
        length: 100,
      );
      expect(l.links, isEmpty);
      expect(l.layers, 1);
      expect(l.nodes.map((n) => n.size), everyElement(greaterThan(0)), reason: 'nodes without links keep their own value');
    });

    test('finds the node under a point, with some room for thin ones', () {
      final l = layout();
      final hub = l.nodes.firstWhere((n) => n.id == 'hub');
      expect(l.nodeAt(Offset((hub.b0 + hub.b1) / 2, (hub.l0 + hub.l1) / 2))?.id, 'hub');
      expect(l.nodeAt(Offset(hub.b1 + 3, hub.l0 + 1))?.id, 'hub');
      expect(l.nodeAt(const Offset(-50, -50)), isNull);
    });

    test('asks for a wider chart when a layer is crowded', () {
      expect(sankeyMinWidth(3), 76);
      expect(sankeyMinWidth(20), 416);
    });
  });

  group('squarify', () {
    const area = Rect.fromLTWH(0, 0, 300, 200);

    test('gives each value an area in proportion to it, filling the whole room', () {
      final values = <double>[60, 30, 20, 10, 5];
      final rects = squarify(values, area);
      final total = values.reduce((a, b) => a + b);
      for (final (i, r) in rects.indexed) {
        expect(r.width * r.height, closeTo(values[i] / total * 300 * 200, 1e-6));
      }
      expect(rects.fold<double>(0, (a, r) => a + r.width * r.height), closeTo(300 * 200, 1e-6));
    });

    test('keeps every rectangle inside the room and apart from the others', () {
      final rects = squarify(<double>[40, 25, 15, 10, 6, 4], area);
      for (final r in rects) {
        expect(area.inflate(1e-6).contains(r.topLeft) && area.inflate(1e-6).contains(r.bottomRight), isTrue);
      }
      for (var i = 0; i < rects.length; i++) {
        for (var j = i + 1; j < rects.length; j++) {
          final overlap = rects[i].intersect(rects[j]);
          expect(overlap.width <= 1e-6 || overlap.height <= 1e-6 || overlap.isEmpty, isTrue, reason: '$i and $j');
        }
      }
    });

    test('keeps the order of the input and gives nothing to values that are not positive', () {
      final rects = squarify(<double>[10, 0, 30, -5], area);
      expect(rects[1].isEmpty, isTrue);
      expect(rects[3].isEmpty, isTrue);
      expect(rects[2].width * rects[2].height, greaterThan(rects[0].width * rects[0].height));
      expect(squarify(<double>[], area), isEmpty);
      expect(squarify(<double>[0, 0], area).every((r) => r.isEmpty), isTrue);
    });

    test('makes squarish cells', () {
      final rects = squarify(<double>[6, 6, 4, 3, 2, 2, 1], const Rect.fromLTWH(0, 0, 600, 400));
      for (final r in rects) {
        expect(math.max(r.width / r.height, r.height / r.width), lessThan(4));
      }
    });
  });

  group('sunburstArcs', () {
    const groups = [
      SunburstGroup(name: 'A', color: Color(0xFF000000), children: [SunburstChild(name: 'a1', value: 30), SunburstChild(name: 'a2', value: 10)]),
      SunburstGroup(name: 'B', color: Color(0xFF000000), children: [SunburstChild(name: 'b1', value: 60)]),
      SunburstGroup(name: 'Empty', color: Color(0xFF000000), children: [SunburstChild(name: 'x', value: 0)]),
    ];

    test('gives each group the angle of its total and splits it between its categories', () {
      final arcs = sunburstArcs(groups);
      final inner = arcs.where((a) => a.isGroup).toList();
      expect(inner.map((a) => a.group), [0, 1], reason: 'the empty group is left out');
      expect(inner[0].sweep, closeTo(0.4 * 2 * math.pi, 1e-9));
      expect(inner[1].sweep, closeTo(0.6 * 2 * math.pi, 1e-9));
      expect(inner.fold<double>(0, (a, x) => a + x.sweep), closeTo(2 * math.pi, 1e-9));
      final outer0 = arcs.where((a) => !a.isGroup && a.group == 0).toList();
      expect(outer0.fold<double>(0, (a, x) => a + x.sweep), closeTo(inner[0].sweep, 1e-9));
      expect(outer0[0].start, closeTo(inner[0].start, 1e-9));
      expect(outer0[1].start, closeTo(outer0[0].start + outer0[0].sweep, 1e-9));
    });

    test('starts at the top and puts budgets inside, categories outside', () {
      final arcs = sunburstArcs(groups);
      expect(arcs.first.start, closeTo(-math.pi / 2, 1e-9));
      expect(arcs.where((a) => a.isGroup).every((a) => a.outer == sunburstSplit), isTrue);
      expect(arcs.where((a) => !a.isGroup).every((a) => a.inner == sunburstSplit && a.outer == sunburstEdge), isTrue);
      expect(sunburstArcs(const []), isEmpty);
    });

    test('finds the slice under a point', () {
      final arcs = sunburstArcs(groups);
      const center = Offset(100, 100);
      // just right of the top, in the inner ring: group A (it starts at the top and runs clockwise for 40 %)
      final inA = sunburstArcAt(arcs, center + const Offset(8, -40), center: center, radius: 100);
      expect((inA?.group, inA?.isGroup), (0, true));
      // far left, outer ring: group B (60 % from 40 % on covers the whole left side)
      final inB = sunburstArcAt(arcs, center + const Offset(-80, 0), center: center, radius: 100);
      expect((inB?.group, inB?.child), (1, 0));
      expect(sunburstArcAt(arcs, center, center: center, radius: 100), isNull, reason: 'the hole');
      expect(sunburstArcAt(arcs, center + const Offset(99, 0), center: center, radius: 100), isNull, reason: 'outside the rings');
    });
  });

  test('barFractions makes the largest value fill the room', () {
    expect(barFractions(<double>[50, 25, 0, -3]), [1.0, 0.5, 0.0, 0.0]);
    expect(barFractions(<double>[0, 0]), [0.0, 0.0]);
    expect(barFractions(<double>[]), isEmpty);
  });
}
