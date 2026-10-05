import { DestroyRef, effect, inject, Injectable, signal } from '@angular/core';

/**
 * The name of the record the current screen is about (an account, a transaction…), shown as the last breadcrumb. A screen
 * calls `track()` from its constructor with a reader of that name; until it is known the breadcrumb keeps the screen's
 * generic label, and the name is dropped when the screen is destroyed.
 */
@Injectable({ providedIn: 'root' })
export class BreadcrumbLeaf {
  private readonly state = signal<string | null>(null);
  readonly label = this.state.asReadonly();
  private owner: object | null = null;

  /** Injection context only. */
  track(name: () => string | null | undefined): void {
    const me = {};
    this.owner = me;
    effect(() => {
      const value = name()?.trim() || null;
      if (this.owner === me) this.state.set(value);
    });
    inject(DestroyRef).onDestroy(() => {
      // A screen that replaced this one has already taken over; only clear our own name.
      if (this.owner === me) {
        this.owner = null;
        this.state.set(null);
      }
    });
  }
}
