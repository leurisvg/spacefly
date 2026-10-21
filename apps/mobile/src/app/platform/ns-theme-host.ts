import { Injectable } from '@angular/core';
import { Application, type EventData, type View } from '@nativescript/core';
import { THEME_IDS, type ThemeId } from '@spacefly/client/charts/palette';
import { ThemeHost } from '@spacefly/client/platform/theme-host';

const CLASSES = THEME_IDS.map((id) => `theme-${id}`);

/**
 * Puts `theme-<id>` on the root view; app.css declares each theme's variables on that class and the rules below read
 * them. The saved theme is applied during the asynchronous bootstrap, when there is no root view yet (or only a placeholder
 * that `resetRootView` replaces later) and `displayed` may already have fired. So the id is kept and painted on every root
 * view NativeScript initializes (`initRootView`), as well as on the current one.
 */
@Injectable()
export class NsThemeHost extends ThemeHost {
  private current: ThemeId | null = null;

  constructor() {
    super();
    Application.on('initRootView', (args: EventData) => this.paint((args as EventData & { rootView?: View }).rootView));
  }

  override apply(id: ThemeId): void {
    this.current = id;
    this.paint(Application.getRootView());
  }

  private paint(root: View | null | undefined): void {
    if (root && this.current) Application.applyCssClass(root, CLASSES, `theme-${this.current}`);
  }
}
