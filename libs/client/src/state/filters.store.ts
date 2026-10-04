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

  readonly preset = computed<PeriodPreset>(() => {
    const p = this.params()['p'] as PeriodPreset | undefined;
    return p && PRESETS.includes(p) ? p : 'month';
  });

  readonly period = computed<Period>(() => {
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

  setPreset(preset: Exclude<PeriodPreset, 'custom'>, anchor = todayIso()): void {
    this.navigate({ p: preset, ...presetPeriod(preset, anchor) });
  }

  setCustom(period: Period): void {
    this.navigate({ p: 'custom', ...period });
  }

  shift(steps: number): void {
    this.navigate({ p: this.preset(), ...shiftPeriod(this.preset(), this.period(), steps) });
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
