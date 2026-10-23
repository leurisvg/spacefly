import 'package:flutter/material.dart';

import '../format/formatter.dart';

/// The range the web's slider has: 0–10 % of the income in steps of 0.5 %.
const thresholdMax = 0.1;
const thresholdStep = 0.005;

/// The share of income under which the Sankey groups flows into "Others", as a slider with its value beside it. The value follows the
/// finger; [onChanged] is called when it is let go (a change asks the server again, so it must not fire while dragging).
class ThresholdSlider extends StatefulWidget {
  const ThresholdSlider({super.key, required this.value, required this.onChanged, required this.f});

  final double value;
  final void Function(double value) onChanged;
  final Formatter f;

  @override
  State<ThresholdSlider> createState() => _ThresholdSliderState();
}

class _ThresholdSliderState extends State<ThresholdSlider> {
  late double _value = widget.value.clamp(0.0, thresholdMax);

  @override
  void didUpdateWidget(ThresholdSlider old) {
    super.didUpdateWidget(old);
    if (old.value != widget.value) _value = widget.value.clamp(0.0, thresholdMax);
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Slider(
            key: const Key('threshold-slider'),
            semanticFormatterCallback: (v) => widget.f.pct(v, decimals: 1, mask: false),
            value: _value,
            max: thresholdMax,
            divisions: (thresholdMax / thresholdStep).round(),
            label: widget.f.pct(_value, decimals: 1, mask: false),
            onChanged: (v) => setState(() => _value = v),
            onChangeEnd: (v) => widget.onChanged(double.parse(v.toStringAsFixed(3))),
          ),
        ),
        SizedBox(width: 48, child: Text(widget.f.pct(_value, decimals: 1, mask: false), key: const Key('threshold-value'), textAlign: TextAlign.end, style: const TextStyle(fontSize: 12, fontFeatures: [FontFeature.tabularFigures()]))),
      ],
    );
  }
}
