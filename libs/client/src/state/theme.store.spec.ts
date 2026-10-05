import { TestBed } from '@angular/core/testing';
import { MemoryStorage, RecordingThemeHost } from '../../testing/fakes';
import { activeTheme, palette, paletteOf, setPaletteTheme } from '../charts/palette';
import { KeyValueStorage } from '../platform/key-value-storage';
import { ThemeHost } from '../platform/theme-host';
import { THEME_KEY, ThemeStore } from './theme.store';

describe('ThemeStore', () => {
  afterEach(() => setPaletteTheme('midnight'));

  function bootWith(saved?: string) {
    const storage = new MemoryStorage();
    if (saved !== undefined) storage.set(THEME_KEY, saved);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: KeyValueStorage, useValue: storage }, RecordingThemeHost, { provide: ThemeHost, useExisting: RecordingThemeHost }] });
    return { storage, host: TestBed.inject(RecordingThemeHost) };
  }

  it('starts in midnight and applies it to the host', () => {
    const { host } = bootWith();
    expect(TestBed.inject(ThemeStore).theme()).toBe('midnight');
    expect(host.applied).toEqual(['midnight']);
  });

  it('restores the saved theme', () => {
    const { host } = bootWith('earth');
    expect(TestBed.inject(ThemeStore).theme()).toBe('earth');
    expect(activeTheme()).toBe('earth');
    expect(host.applied).toEqual(['earth']);
  });

  it('falls back to midnight on an unknown saved value', () => {
    bootWith('solar');
    expect(TestBed.inject(ThemeStore).theme()).toBe('midnight');
    expect(activeTheme()).toBe('midnight');
  });

  it('persists the choice, applies it to the host and switches the chart palette', () => {
    const { storage, host } = bootWith();
    const store = TestBed.inject(ThemeStore);
    expect(palette.chartSurface).toBe(paletteOf('midnight').chartSurface);
    store.set('earth');
    expect(store.theme()).toBe('earth');
    expect(storage.get(THEME_KEY)).toBe('earth');
    expect(host.applied).toEqual(['midnight', 'earth']);
    expect(palette.chartSurface).toBe('#3f4e4f');
    expect(palette.series).toBe(paletteOf('earth').series);
  });
});
