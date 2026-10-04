import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import type { EditorLookups } from '@spacefly/shared';
import { FiltersStore } from './filters.store';

/** Everything the editors pick from (accounts of every kind, categories, tags…), refetched after each write. */
@Injectable({ providedIn: 'root' })
export class EditorLookupsStore {
  private readonly filters = inject(FiltersStore);
  private readonly ref = httpResource<EditorLookups>(() => ({ url: '/api/lookups/editor', params: { _r: this.filters.refreshTick() } }));

  readonly lookups = computed(() => (this.ref.hasValue() ? this.ref.value() : undefined));
  readonly loading = computed(() => this.ref.isLoading() && !this.lookups());
  readonly error = this.ref.error;
  readonly accounts = computed(() => this.lookups()?.accounts ?? []);
  readonly categories = computed(() => this.lookups()?.categories ?? []);
  readonly tags = computed(() => this.lookups()?.tags ?? []);
  readonly budgets = computed(() => this.lookups()?.budgets ?? []);
  readonly bills = computed(() => this.lookups()?.bills ?? []);
  readonly currencies = computed(() => this.lookups()?.currencies ?? []);
  readonly defaultAccountId = computed(() => this.lookups()?.defaultAccountId ?? null);

  reload(): void {
    this.ref.reload();
  }
}
