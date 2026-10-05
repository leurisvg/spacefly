import { inject, Injectable, provideAppInitializer, signal, type EnvironmentProviders } from '@angular/core';
import { DEFAULT_THEME, isThemeId, setPaletteTheme, type ThemeId } from '../charts/palette';
import { KeyValueStorage } from '../platform/key-value-storage';
import { ThemeHost } from '../platform/theme-host';

export const THEME_KEY = 'spacefly.theme';

/**
 * The color theme. Persisted locally as a raw string (the web page reads it before Angular boots, to avoid a flash
 * of the default theme). Applying it means three things: the charts' palette, the host UI, and the signal itself.
 */
@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly storage = inject(KeyValueStorage);
  private readonly host = inject(ThemeHost);
  private readonly state = signal<ThemeId>(DEFAULT_THEME);
  readonly theme = this.state.asReadonly();

  constructor() {
    const saved = this.storage.get(THEME_KEY);
    this.activate(isThemeId(saved) ? saved : DEFAULT_THEME);
  }

  set(id: ThemeId): void {
    this.storage.set(THEME_KEY, id);
    this.activate(id);
  }

  private activate(id: ThemeId): void {
    this.state.set(id);
    setPaletteTheme(id);
    this.host.apply(id);
  }
}

/** Instantiates the store at startup so the saved theme is applied before the first chart is drawn. */
export function provideTheme(): EnvironmentProviders {
  return provideAppInitializer(() => {
    inject(ThemeStore);
  });
}
