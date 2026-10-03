import { HttpClient, httpResource } from '@angular/common/http';
import { computed, inject, Injectable, linkedSignal, type Signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Report, ReportMeta } from '@shared';
import { FiltersStore } from '../state/filters.store';

export type Params = Record<string, string | number | boolean>;

export interface ReportResource<T> {
  /** Latest data; keeps the previous value while a new request is in flight (no flash). */
  data: Signal<T | undefined>;
  meta: Signal<ReportMeta | undefined>;
  loading: Signal<boolean>;
  /** True only before the first response. */
  initialLoading: Signal<boolean>;
  error: Signal<unknown>;
  reload: () => void;
}

/**
 * `httpResource` for a `/api/reports/*` endpoint, parameterised by the global filters plus
 * optional extra params. Return `null` from `extra` to pause the request.
 */
export function reportResource<T>(
  path: string,
  extra?: () => Params | null,
  options: { global?: boolean } = {},
): ReportResource<T> {
  const filters = inject(FiltersStore);
  const ref = httpResource<Report<T>>(() => {
    const e = extra ? extra() : {};
    if (e === null) return undefined;
    const base = options.global === false ? { currency: filters.currency(), _r: filters.refreshTick() } : filters.query();
    return { url: `/api/${path}`, params: { ...base, ...e } };
  });
  const latest = computed(() => (ref.hasValue() ? ref.value() : undefined));
  const kept = linkedSignal<Report<T> | undefined, Report<T> | undefined>({
    source: latest,
    computation: (value, previous) => value ?? previous?.value,
  });
  return {
    data: computed(() => kept()?.data),
    meta: computed(() => kept()?.meta),
    loading: ref.isLoading,
    initialLoading: computed(() => ref.isLoading() && !kept()),
    error: ref.error,
    reload: () => ref.reload(),
  };
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly filters = inject(FiltersStore);

  /** Invalidates the server cache for the user and refetches every visible report. */
  async refresh(): Promise<void> {
    await firstValueFrom(this.http.post('/api/refresh', {}));
    this.filters.refresh();
  }
}
