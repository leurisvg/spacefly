import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

/// Where a tooltip of [tip] size goes for a touch at [anchor] inside [area]: centered above the finger and kept inside the area, or
/// under the finger when there is no room above. Pure, so it is tested without drawing.
Offset tipPosition(Offset anchor, Size tip, Size area, {double gap = 14}) {
  final x = (anchor.dx - tip.width / 2).clamp(0.0, math.max(0.0, area.width - tip.width)).toDouble();
  final above = anchor.dy - tip.height - gap;
  final y = above >= 0 ? above : math.min(anchor.dy + gap, math.max(0.0, area.height - tip.height));
  return Offset(x, y);
}

/// The tooltip of a chart: the text on the chart's tooltip color.
class ChartTip extends StatelessWidget {
  const ChartTip({super.key, required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Container(
      key: const Key('chart-tip'),
      constraints: const BoxConstraints(maxWidth: 240),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: tokens.chartTooltip, borderRadius: BorderRadius.circular(6), boxShadow: const [BoxShadow(blurRadius: 6, color: Color(0x33000000))]),
      child: Text(text, style: TextStyle(color: tokens.chartInk, fontSize: 12, height: 1.35)),
    );
  }
}

class _TipLayout extends SingleChildLayoutDelegate {
  _TipLayout(this.anchor);

  final Offset anchor;

  @override
  BoxConstraints getConstraintsForChild(BoxConstraints constraints) => constraints.loosen();

  @override
  Offset getPositionForChild(Size size, Size childSize) => tipPosition(anchor, childSize, size);

  @override
  bool shouldRelayout(_TipLayout old) => old.anchor != anchor;
}

/// Shows a [ChartTip] over [child] while a finger is held on the chart (the touch version of hovering): [builder] gets the function that
/// shows the tip at a point of the child (`null` hides it).
class TipArea extends StatefulWidget {
  const TipArea({super.key, required this.builder});

  final Widget Function(BuildContext context, void Function(({String text, Offset at})? tip) show) builder;

  @override
  State<TipArea> createState() => _TipAreaState();
}

class _TipAreaState extends State<TipArea> {
  ({String text, Offset at})? _tip;

  void _show(({String text, Offset at})? tip) {
    if (tip == _tip) return;
    setState(() => _tip = tip);
  }

  @override
  Widget build(BuildContext context) {
    final tip = _tip;
    return Stack(
      children: [
        widget.builder(context, _show),
        if (tip != null) Positioned.fill(child: IgnorePointer(child: CustomSingleChildLayout(delegate: _TipLayout(tip.at), child: ChartTip(text: tip.text)))),
      ],
    );
  }
}
