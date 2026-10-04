import { inject, Injectable, signal } from '@angular/core';
import { KeyValueStorage } from '../platform/key-value-storage';

const PRIVACY_KEY = 'spacefly.privacy';

/**
 * Privacy mode: while on, every monetary amount is shown as 0 so nobody looking at the screen
 * can read it. Persisted locally so a reload doesn't expose the numbers again.
 */
@Injectable({ providedIn: 'root' })
export class PrivacyStore {
  private readonly storage = inject(KeyValueStorage);
  private readonly state = signal(this.storage.get(PRIVACY_KEY) === '1');
  readonly hidden = this.state.asReadonly();

  toggle(): void {
    this.set(!this.state());
  }

  set(hidden: boolean): void {
    this.state.set(hidden);
    this.storage.set(PRIVACY_KEY, hidden ? '1' : '0');
  }
}
