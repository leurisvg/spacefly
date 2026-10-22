/// Port of libs/client/src/ui-logic/budget-status.ts.
enum MeterStatus { good, warning, critical }

/// Green below 80 % of the limit, amber from 80 %, red from 100 %. No limit → good.
MeterStatus budgetStatus(double? ratio) {
  if (ratio == null) return MeterStatus.good;
  return ratio >= 1 ? MeterStatus.critical : (ratio >= 0.8 ? MeterStatus.warning : MeterStatus.good);
}

class MeterModel {
  const MeterModel({required this.status, required this.fill, required this.percent});

  final MeterStatus status;

  /// Bar fill, 0–100.
  final double fill;

  /// Rounded percentage for assistive tech, 0 or more.
  final int percent;
}

/// In privacy mode the bar, its status and its percentage would all reveal the hidden ratio.
MeterModel meterModel(double? ratio, {required bool hidden}) => MeterModel(
      status: budgetStatus(ratio),
      fill: hidden ? 0 : ((ratio ?? 0) * 100).clamp(0, 100).toDouble(),
      percent: hidden ? 0 : ((ratio ?? 0) * 100).round(),
    );
