import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { FilterParamsSource, type ParamValue } from '../platform/filter-params-source';
import { KeyValueStorage } from '../platform/key-value-storage';
import { isIsoDate, presetPeriod, shiftPeriod, todayIso, type Period, type PeriodPreset } from '@spacefly/shared';

const PRESETS: PeriodPreset[] = ['month', 'quarter', 'year', 'ytd', 'custom'];
const CURRENCY_KEY = 'spacefly.currency';

/**
 * Global report filters (period, display currency). Where they live is the platform's call
 * (`FilterParamsSource`): on web the URL query string, so every view is shareable and the browser back
 * button works: `?p=month&start=2026-09-01&end=…&cur=USD`.
 */
@Injectable({ providedIn: 'root' })
export class FiltersStore {
  private readonly source = inject(FilterParamsSource);
  private readonly storage = inject(KeyValueStorage);
  private readonly params = this.source.params;

  /** Currency the user prefers when the URL doesn't say (persisted locally). */
  private readonly preferredCurrency = signal<string | null>(this.storage.get(CURRENCY_KEY));
  readonly primaryCurrency = signal('DOP');
  /** Bumped by "Refresh" so every report resource refetches. */
  readonly refreshTick = signal(0);

  /**
   * A period owned by the screen being shown: it wins over the query string and is dropped when the
   * screen releases it, so it never leaks to the next page through preserved query params.
   */
  private readonly pageScope = signal<{ preset: PeriodPreset; period: Period } | null>(null);

  readonly preset = computed<PeriodPreset>(() => {
    const scoped = this.pageScope();
    if (scoped) return scoped.preset;
    const p = this.params()['p'] as PeriodPreset | undefined;
    return p && PRESETS.includes(p) ? p : 'month';
  });

  readonly period = computed<Period>(() => {
    const scoped = this.pageScope();
    if (scoped) return scoped.period;
    const { start, end } = this.params();
    if (isIsoDate(start) && isIsoDate(end) && start <= end) return { start, end };
    const preset = this.preset();
    return presetPeriod(preset === 'custom' ? 'month' : preset, todayIso());
  });

  readonly currency = computed(() => {
    const cur = this.params()['cur'];
    if (cur && /^[A-Z]{3}$/.test(cur)) return cur;
    return this.preferredCurrency() ?? this.primaryCurrency();
  });

  /** Query parameters shared by every report request. */
  readonly query = computed(() => ({
    start: this.period().start,
    end: this.period().end,
    currency: this.currency(),
    _r: this.refreshTick(),
  }));

  constructor() {
    effect(() => {
      const pref = this.preferredCurrency();
      if (pref) this.storage.set(CURRENCY_KEY, pref);
    });
  }

  /** Feature-specific query param (e.g. Sankey options), read from the URL. */
  param(name: string) {
    return computed(() => this.params()[name] ?? null);
  }

  /**
   * Shows `period` as a custom range until the returned function is called (call it when the screen
   * is destroyed). While it is held the period picker edits it instead of the URL.
   */
  scopePeriod(period: Period): () => void {
    this.pageScope.set({ preset: 'custom', period });
    return () => this.pageScope.set(null);
  }

  setPreset(preset: Exclude<PeriodPreset, 'custom'>, anchor = todayIso()): void {
    this.setPeriod(preset, presetPeriod(preset, anchor));
  }

  setCustom(period: Period): void {
    this.setPeriod('custom', period);
  }

  shift(steps: number): void {
    this.setPeriod(this.preset(), shiftPeriod(this.preset(), this.period(), steps));
  }

  private setPeriod(preset: PeriodPreset, period: Period): void {
    if (this.pageScope()) this.pageScope.set({ preset, period });
    else this.navigate({ p: preset, ...period });
  }

  setCurrency(code: string): void {
    this.preferredCurrency.set(code);
    this.navigate({ cur: code });
  }

  setParams(params: Record<string, ParamValue>): void {
    this.navigate(params);
  }

  refresh(): void {
    this.refreshTick.update((n) => n + 1);
  }

  private navigate(params: Record<string, ParamValue>): void {
    this.source.merge(params);
  }
}
