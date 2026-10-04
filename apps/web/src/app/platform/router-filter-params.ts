import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { FilterParamsSource, type ParamValue } from '@spacefly/client/platform/filter-params-source';

function readParams(url: string): Record<string, string> {
  const q = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '';
  return Object.fromEntries(new URLSearchParams(q));
}

/** The URL query string, so every view is shareable and the browser back button works. */
@Injectable()
export class RouterFilterParams extends FilterParamsSource {
  private readonly router = inject(Router);

  override readonly params = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => readParams(this.router.url)),
    ),
    { initialValue: readParams(typeof location !== 'undefined' ? location.search : '') },
  );

  override merge(params: Record<string, ParamValue>): void {
    void this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge', replaceUrl: false });
  }
}
