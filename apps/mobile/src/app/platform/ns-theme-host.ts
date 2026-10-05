import { Injectable } from '@angular/core';
import { Application } from '@nativescript/core';
import { THEME_IDS, type ThemeId } from '@spacefly/client/charts/palette';
import { ThemeHost } from '@spacefly/client/platform/theme-host';

const CLASSES = THEME_IDS.map((id) => `theme-${id}`);

/**
 * Puts `theme-<id>` on the root view; app.css declares each theme's variables on that class and the rules below read
 * them. The theme is applied at startup, before NativeScript has a root view, so the first id waits for `displayed`.
 */
@Injectable()
export class NsThemeHost extends ThemeHost {
  private pending: ThemeId | null = null;

  override apply(id: ThemeId): void {
    const root = Application.getRootView();
    if (root) {
      Application.applyCssClass(root, CLASSES, `theme-${id}`);
      return;
    }
    const firstWait = this.pending === null;
    this.pending = id;
    if (firstWait) Application.once('displayed', () => this.flush());
  }

  private flush(): void {
    const id = this.pending;
    this.pending = null;
    if (id) this.apply(id);
  }
}
