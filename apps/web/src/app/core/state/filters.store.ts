import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { isIsoDate, presetPeriod, shiftPeriod, todayIso, type Period, type PeriodPreset } from '@spacefly/shared';

const PRESETS: PeriodPreset[] = ['month', 'quarter', 'year', 'ytd', 'custom'];
const CURRENCY_KEY = 'spacefly.currency';

function readParams(url: string): Record<string, string> {
  const q = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '';
  return Object.fromEntries(new URLSearchParams(q));
}

/**
 * Global report filters (period, display currency) living in the URL query string, so every
 * view is shareable and the browser back button works: `?p=month&start=2026-09-01&end=…&cur=USD`.
 */
@Injectable({ providedIn: 'root' })
export class FiltersStore {
  private readonly router = inject(Router);

  private readonly params = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => readParams(this.router.url)),
    ),
    { initialValue: readParams(typeof location !== 'undefined' ? location.search : '') },
  );

  /** Currency the user prefers when the URL doesn't say (persisted locally). */
  private readonly preferredCurrency = signal<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem(CURRENCY_KEY) : null,
  );
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
      if (pref) localStorage.setItem(CURRENCY_KEY, pref);
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

  setParams(params: Record<string, string | number | boolean | null>): void {
    this.navigate(params);
  }

  refresh(): void {
    this.refreshTick.update((n) => n + 1);
  }

  private navigate(queryParams: Record<string, string | number | boolean | null>): void {
    void this.router.navigate([], { queryParams, queryParamsHandling: 'merge', replaceUrl: false });
  }
}
