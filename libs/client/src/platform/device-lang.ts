import { InjectionToken } from '@angular/core';

/** The device/browser language tag (`es-DO`, `en-US`), used to pick the first language. */
export const DEVICE_LANG = new InjectionToken<string | null>('DEVICE_LANG');
