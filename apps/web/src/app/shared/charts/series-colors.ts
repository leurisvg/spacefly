import { Injectable } from '@angular/core';
import { cssVar, SERIES_VARS } from './chart-theme';

/**
 * Color follows the entity, never its rank: the first time an entity (category, account…)
 * is drawn it takes the next free categorical slot and keeps it for the whole session, so
 * filters never repaint survivors. Past 8 entities of a kind, charts fold into "Other".
 */
@Injectable({ providedIn: 'root' })
export class SeriesColors {
  private readonly slots = new Map<string, Map<string, number>>();

  slot(kind: string, id: string | null): number | null {
    const key = id ?? '__none__';
    let map = this.slots.get(kind);
    if (!map) this.slots.set(kind, (map = new Map()));
    if (!map.has(key)) {
      if (map.size >= SERIES_VARS.length) return null;
      map.set(key, map.size);
    }
    return map.get(key)!;
  }

  color(kind: string, id: string | null): string {
    const slot = this.slot(kind, id);
    return slot === null ? cssVar('--money-other') : cssVar(SERIES_VARS[slot]);
  }

  other(): string {
    return cssVar('--money-other');
  }
}

/** Semantic money colors, identical across every screen. */
export const money = {
  income: () => cssVar('--money-income'),
  expense: () => cssVar('--money-expense'),
  net: () => cssVar('--money-net'),
  savings: () => cssVar('--money-savings'),
  budget: () => cssVar('--money-budget'),
  revenue: () => cssVar('--money-revenue'),
  hub: () => cssVar('--money-hub'),
  deficit: () => cssVar('--money-deficit'),
  other: () => cssVar('--money-other'),
  surface: () => cssVar('--chart-surface'),
  ink: () => cssVar('--chart-ink'),
  ink2: () => cssVar('--chart-ink-2'),
  muted: () => cssVar('--chart-muted'),
  grid: () => cssVar('--chart-grid'),
};
