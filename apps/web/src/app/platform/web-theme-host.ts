import { Injectable } from '@angular/core';
import type { ThemeId } from '@spacefly/client/charts/palette';
import { ThemeHost } from '@spacefly/client/platform/theme-host';

/** `data-theme` on `<html>` switches the CSS variables; the browser chrome color follows the theme's `--background`. */
@Injectable()
export class WebThemeHost extends ThemeHost {
  override apply(id: ThemeId): void {
    const root = document.documentElement;
    root.dataset['theme'] = id;
    const background = getComputedStyle(root).getPropertyValue('--background').trim();
    if (background) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
  }
}
