import { Injectable } from '@angular/core';
import type { Translation, TranslocoLoader } from '@jsverse/transloco';
import en from '@spacefly/i18n/en.json';
import es from '@spacefly/i18n/es.json';
import { of } from 'rxjs';

const CATALOGS: Record<string, Translation> = { es, en };

/** The catalogs are bundled into the app (no network, works offline); the web app fetches the same files over HTTP. */
@Injectable({ providedIn: 'root' })
export class StaticTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string) {
    return of(CATALOGS[lang] ?? es);
  }
}
