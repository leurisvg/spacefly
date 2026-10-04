import { DestroyRef, inject, Injectable, signal } from '@angular/core';

/** Reactive viewport breakpoints (Tailwind's sm / lg). */
@Injectable({ providedIn: 'root' })
export class BreakpointService {
  readonly mobile = signal(false);
  readonly desktop = signal(true);

  constructor() {
    if (typeof matchMedia !== 'function') return;
    const sm = matchMedia('(max-width: 639px)');
    const lg = matchMedia('(min-width: 1024px)');
    const update = () => {
      this.mobile.set(sm.matches);
      this.desktop.set(lg.matches);
    };
    update();
    sm.addEventListener('change', update);
    lg.addEventListener('change', update);
    inject(DestroyRef).onDestroy(() => {
      sm.removeEventListener('change', update);
      lg.removeEventListener('change', update);
    });
  }
}
