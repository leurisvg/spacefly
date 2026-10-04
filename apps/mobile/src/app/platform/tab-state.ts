import { Injectable, signal } from '@angular/core';

export type TabName = 'dashboard' | 'transactions' | 'accounts' | 'settings';

/** Which tab of the home screen is showing; detail screens go back to the tab they came from. */
@Injectable({ providedIn: 'root' })
export class TabState {
  readonly current = signal<TabName>('dashboard');
}
