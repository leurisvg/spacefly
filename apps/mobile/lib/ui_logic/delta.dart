/// Semantic color of a figure; the UI maps it to its theme colors. Port of libs/client/src/ui-logic/delta.ts.
enum Tone { positive, negative, neutral }

enum Direction { up, down, flat }

class DeltaModel {
  const DeltaModel({required this.diff, required this.ratio, required this.direction, required this.tone, required this.pointsLabel});

  final double diff;

  /// Absolute relative change, or `null` when there is nothing to compare with.
  final double? ratio;
  final Direction direction;
  final Tone tone;

  /// Percentage-point difference label ("1.2 pp"), for rates.
  final String pointsLabel;
}

/// Signed change vs a reference. Tone = direction × whether "up" is good. In privacy mode direction and tone would give away the
/// hidden change, so it is shown flat and neutral.
DeltaModel deltaModel(double value, double? previous, {required bool upIsGood, required bool hidden}) {
  final diff = previous == null ? 0.0 : value - previous;
  final ratio = previous == null || previous == 0 ? null : (diff / previous).abs();
  final flat = hidden || diff == 0 || previous == null;
  return DeltaModel(
    diff: diff,
    ratio: ratio,
    direction: hidden ? Direction.flat : (diff > 0 ? Direction.up : (diff < 0 ? Direction.down : Direction.flat)),
    tone: flat ? Tone.neutral : ((diff > 0) == upIsGood ? Tone.positive : Tone.negative),
    pointsLabel: '${(hidden ? 0 : diff.abs()).toStringAsFixed(1)} pp',
  );
}
