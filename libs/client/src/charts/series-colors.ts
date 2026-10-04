import { Injectable } from '@angular/core';
import { palette } from './palette';

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
      if (map.size >= palette.series.length) return null;
      map.set(key, map.size);
    }
    return map.get(key)!;
  }

  color(kind: string, id: string | null): string {
    const slot = this.slot(kind, id);
    return slot === null ? palette.moneyOther : palette.series[slot];
  }

  other(): string {
    return palette.moneyOther;
  }
}

/** Semantic money colors, identical across every screen. */
export const money = {
  income: () => palette.moneyIncome,
  expense: () => palette.moneyExpense,
  net: () => palette.moneyNet,
  savings: () => palette.moneySavings,
  budget: () => palette.moneyBudget,
  revenue: () => palette.moneyRevenue,
  hub: () => palette.moneyHub,
  deficit: () => palette.moneyDeficit,
  other: () => palette.moneyOther,
  surface: () => palette.chartSurface,
  ink: () => palette.chartInk,
  ink2: () => palette.chartInk2,
  muted: () => palette.chartMuted,
  grid: () => palette.chartGrid,
};
