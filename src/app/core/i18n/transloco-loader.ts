import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Translation, TranslocoLoader } from '@jsverse/transloco';

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(lang: string) {
    return this.http.get<Translation>(`/i18n/${lang}.json`);
  }
}

export const LANG_KEY = 'spacefly.lang';
export const LANGS = ['es', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export function initialLang(): Lang {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(LANG_KEY) : null;
  if (saved === 'es' || saved === 'en') return saved;
  return typeof navigator !== 'undefined' && navigator.language.startsWith('en') ? 'en' : 'es';
}
