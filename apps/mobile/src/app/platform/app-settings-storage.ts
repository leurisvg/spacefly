import { Injectable } from '@angular/core';
import { ApplicationSettings } from '@nativescript/core';
import { KeyValueStorage } from '@spacefly/client/platform/key-value-storage';

/** Preferences in the platform's own store (SharedPreferences / NSUserDefaults). */
@Injectable()
export class AppSettingsStorage extends KeyValueStorage {
  override get(key: string): string | null {
    return ApplicationSettings.hasKey(key) ? (ApplicationSettings.getString(key) ?? null) : null;
  }

  override set(key: string, value: string): void {
    ApplicationSettings.setString(key, value);
  }

  override remove(key: string): void {
    ApplicationSettings.remove(key);
  }
}
