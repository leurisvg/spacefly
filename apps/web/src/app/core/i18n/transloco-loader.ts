import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Translation, TranslocoLoader } from '@jsverse/transloco';

/**
 * The server stamps the page with a hash of the catalogs (`<meta name="sf-i18n">`). Asking for `?v=<hash>` makes a new
 * deploy a new URL, so no browser or CDN can keep serving old texts. Without the tag (`ng serve`) the plain URL is used.
 */
export function catalogUrl(lang: string, version: string | null | undefined): string {
  return version ? `/i18n/${lang}.json?v=${encodeURIComponent(version)}` : `/i18n/${lang}.json`;
}

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);
  private readonly version = document.querySelector('meta[name="sf-i18n"]')?.getAttribute('content');

  getTranslation(lang: string) {
    return this.http.get<Translation>(catalogUrl(lang, this.version));
  }
}
