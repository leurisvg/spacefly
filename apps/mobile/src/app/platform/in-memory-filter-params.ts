import { Injectable, signal } from '@angular/core';
import { FilterParamsSource, type ParamValue } from '@spacefly/client/platform/filter-params-source';

/** The global filters (period, currency, view options) held in memory: there is no URL to keep them in. */
@Injectable()
export class InMemoryFilterParams extends FilterParamsSource {
  private readonly state = signal<Record<string, string>>({});
  override readonly params = this.state.asReadonly();

  override merge(params: Record<string, ParamValue>): void {
    const next = { ...this.state() };
    for (const [key, value] of Object.entries(params)) {
      if (value === null) delete next[key];
      else next[key] = String(value);
    }
    this.state.set(next);
  }
}
