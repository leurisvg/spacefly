import { effect, inject, signal, type WritableSignal } from '@angular/core';
import { KeyValueStorage } from '../platform/key-value-storage';

/**
 * A signal persisted in the platform storage (JSON). Call it from an injection context: the effect that
 * writes changes back lives as long as the component or service that created it.
 */
export function localPref<T>(key: string, fallback: T, isValid: (v: unknown) => v is T = (v): v is T => typeof v === typeof fallback): WritableSignal<T> {
  const storage = inject(KeyValueStorage);
  let initial = fallback;
  try {
    const raw = storage.get(key);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (isValid(parsed)) initial = parsed;
    }
  } catch {
    /* unreadable or blocked storage: use the fallback */
  }
  const pref = signal<T>(initial);
  effect(() => {
    const value = pref();
    try {
      storage.set(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked */
    }
  });
  return pref;
}
