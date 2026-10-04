/** Semantic color of a figure; each app maps it to its own styling (Tailwind classes, NativeScript css). */
export type Tone = 'positive' | 'negative' | 'neutral';

export interface DeltaModel {
  diff: number;
  /** Absolute relative change, or `null` when there is nothing to compare with. */
  ratio: number | null;
  direction: 'up' | 'down' | 'flat';
  tone: Tone;
  /** Percentage-point difference label ("1.2 pp"), for rates. */
  pointsLabel: string;
}

/**
 * Signed change vs a reference. Tone = direction × whether "up" is good. In privacy mode direction and
 * tone would give away the hidden change, so it is shown flat and neutral.
 */
export function deltaModel(value: number, previous: number | null, upIsGood: boolean, hidden: boolean): DeltaModel {
  const diff = previous === null ? 0 : value - previous;
  const ratio = previous === null || previous === 0 ? null : Math.abs(diff / previous);
  const flat = hidden || diff === 0 || previous === null;
  return {
    diff,
    ratio,
    direction: hidden ? 'flat' : diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat',
    tone: flat ? 'neutral' : diff > 0 === upIsGood ? 'positive' : 'negative',
    pointsLabel: `${(hidden ? 0 : Math.abs(diff)).toFixed(1)} pp`,
  };
}
