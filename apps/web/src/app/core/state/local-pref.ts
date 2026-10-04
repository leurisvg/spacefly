import { effect, signal, type WritableSignal } from '@angular/core';

/**
 * A signal persisted in localStorage (JSON). Call it from an injection context: the effect that
 * writes changes back lives as long as the component or service that created it.
 */
export function localPref<T>(key: string, fallback: T, isValid: (v: unknown) => v is T = (v): v is T => typeof v === typeof fallback): WritableSignal<T> {
  let initial = fallback;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
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
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked */
    }
  });
  return pref;
}
