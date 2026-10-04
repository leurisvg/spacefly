import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Injectable } from '@angular/core';
import type { CurrencyInfo, MetaResponse } from '@spacefly/shared';
import { FiltersStore } from './filters.store';

export interface Lookups {
  categories: { id: string; name: string }[];
  tags: { id: string; name: string }[];
  budgets: { id: string; name: string }[];
  accounts: { id: string; name: string; savings: boolean }[];
}

/** Firefly/server metadata and lookup lists, loaded once per session. */
@Injectable({ providedIn: 'root' })
export class MetaStore {
  private readonly filters = inject(FiltersStore);
  private readonly metaRef = httpResource<MetaResponse>(() => '/api/meta');
  private readonly lookupsRef = httpResource<Lookups>(() => ({ url: '/api/lookups', params: { _r: this.filters.refreshTick() } }));

  readonly meta = computed(() => (this.metaRef.hasValue() ? this.metaRef.value() : undefined));
  readonly lookups = computed(() => (this.lookupsRef.hasValue() ? this.lookupsRef.value() : undefined));
  readonly primary = computed(() => this.meta()?.primaryCurrency.code ?? 'DOP');
  readonly currencies = computed<CurrencyInfo[]>(
    () =>
      this.meta()?.displayCurrencies ?? [
        { code: 'DOP', name: 'Peso dominicano', symbol: 'RD$', decimals: 2 },
        { code: 'USD', name: 'US Dollar', symbol: 'US$', decimals: 2 },
      ],
  );

  constructor() {
    effect(() => this.filters.primaryCurrency.set(this.primary()));
  }

  /** Deep link to a transaction in Firefly. */
  fireflyUrl(path: string): string | null {
    const base = this.meta()?.fireflyPublicUrl;
    return base ? `${base}${path}` : null;
  }
}
