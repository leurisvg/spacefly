import type { Signal } from '@angular/core';

export type ParamValue = string | number | boolean | null;

/**
 * Where the global filters (period, currency, view options) live. Web: the URL query string, so views
 * are shareable and the back button works. Mobile: an in-memory signal.
 */
export abstract class FilterParamsSource {
  abstract readonly params: Signal<Record<string, string>>;
  /** Merges `params` into the current ones; `null` removes a key. */
  abstract merge(params: Record<string, ParamValue>): void;
}
