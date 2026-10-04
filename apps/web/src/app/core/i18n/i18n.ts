import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

/**
 * Signal-friendly translate: `t()` inside a `computed` re-runs when the language changes
 * *and* its file has loaded (chart options, table headers built in TS).
 */
@Injectable({ providedIn: 'root' })
export class I18n {
  private readonly transloco = inject(TranslocoService);
  private readonly version = signal(0);

  constructor() {
    const sub = this.transloco.events$.subscribe((e) => {
      if (e.type === 'translationLoadSuccess' || e.type === 'langChanged') this.version.update((v) => v + 1);
    });
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }

  t = (key: string, params?: Record<string, unknown>): string => {
    this.version();
    return this.transloco.translate(key, params);
  };

  /** Display name for an entity whose name may be empty (uncategorized, untagged, "others"…). */
  name = (name: string | null | undefined, id: string | null | undefined, fallbackKey = 'common.uncategorized'): string => {
    if (id === '__others__') return this.t('common.others');
    return name || this.t(fallbackKey);
  };
}
