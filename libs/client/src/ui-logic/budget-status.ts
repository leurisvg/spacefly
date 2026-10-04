export type MeterStatus = 'good' | 'warning' | 'critical';

/** Green below 80 % of the limit, amber from 80 %, red from 100 %. No limit → good. */
export function budgetStatus(ratio: number | null): MeterStatus {
  if (ratio === null) return 'good';
  return ratio >= 1 ? 'critical' : ratio >= 0.8 ? 'warning' : 'good';
}

export interface MeterModel {
  status: MeterStatus;
  /** Bar fill, 0–100. */
  fill: number;
  /** Rounded percentage for assistive tech, 0 or more. */
  percent: number;
}

/** In privacy mode the bar, its status and its percentage would all reveal the hidden ratio. */
export function meterModel(ratio: number | null, hidden: boolean): MeterModel {
  return {
    status: budgetStatus(ratio),
    fill: hidden ? 0 : Math.min((ratio ?? 0) * 100, 100),
    percent: hidden ? 0 : Math.round((ratio ?? 0) * 100),
  };
}
