import { Injectable } from '@angular/core';
import { KeyValueStorage } from '@spacefly/client/platform/key-value-storage';

/** localStorage, tolerant of blocked storage (private mode, disabled cookies). */
@Injectable()
export class WebKeyValueStorage extends KeyValueStorage {
  override get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  override set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage full or blocked */
    }
  }

  override remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* storage blocked */
    }
  }
}
