import type { ThemeId } from '../charts/palette';

/**
 * Makes the host UI wear a theme. Web: `data-theme` on `<html>` (and the browser chrome color); mobile: a
 * `theme-<id>` class on the root view. The charts follow through `setPaletteTheme`, which `ThemeStore` calls.
 */
export abstract class ThemeHost {
  abstract apply(id: ThemeId): void;
}
