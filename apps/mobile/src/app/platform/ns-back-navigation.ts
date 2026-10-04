import { inject, Injectable } from '@angular/core';
import { RouterExtensions } from '@nativescript/angular';
import { BackNavigation } from '@spacefly/client/platform/back-navigation';
import { TabState, type TabName } from './tab-state';

const TABS: Record<string, TabName> = { '/': 'dashboard', '/transactions': 'transactions', '/accounts': 'accounts', '/settings': 'settings' };

/** The native navigation stack. The shared fallback routes (`/transactions`…) are tabs of the home screen here. */
@Injectable()
export class NsBackNavigation extends BackNavigation {
  private readonly router = inject(RouterExtensions);
  private readonly tabs = inject(TabState);

  override get canGoBack(): boolean {
    return this.router.canGoBack();
  }

  override back(fallback: string): void {
    if (this.canGoBack) {
      this.router.back();
      return;
    }
    const tab = TABS[fallback];
    if (tab) this.tabs.current.set(tab);
    void this.router.navigate(['/'], { clearHistory: true });
  }
}
