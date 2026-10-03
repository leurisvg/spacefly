import { Injectable, signal, type EnvironmentProviders, type Provider } from '@angular/core';
import { provideTransloco, TranslocoService, type TranslocoLoader } from '@jsverse/transloco';
import { BehaviorSubject, of } from 'rxjs';
import { FiltersStore } from '../app/core/state/filters.store';
import { MetaStore } from '../app/core/state/meta.store';

const CURRENCIES = [
  { code: 'DOP', name: 'Peso', symbol: 'RD$', decimals: 2 },
  { code: 'USD', name: 'Dollar', symbol: 'US$', decimals: 2 },
];

let loaded: Record<string, unknown> = {};

@Injectable()
class InMemoryLoader implements TranslocoLoader {
  getTranslation() {
    return of(loaded);
  }
}

/**
 * Test doubles so FormatService and the components built on it need no router, HTTP or i18n files.
 * With `translations`, a real Transloco (in-memory loader) is wired in so `| transloco` works.
 */
export function formatTestProviders(lang = 'es', translations?: Record<string, unknown>) {
  const lang$ = new BehaviorSubject(lang);
  const currency = signal('DOP');
  loaded = translations ?? {};
  const i18n: (Provider | EnvironmentProviders)[] = translations
    ? [provideTransloco({
        config: { availableLangs: ['es', 'en'], defaultLang: lang, reRenderOnLangChange: true },
        loader: InMemoryLoader,
      })]
    : [{ provide: TranslocoService, useValue: { langChanges$: lang$.asObservable(), getActiveLang: () => lang$.value, translate: (key: string) => key } }];
  const providers: (Provider | EnvironmentProviders)[] = [
    ...i18n,
    { provide: FiltersStore, useValue: { currency } },
    { provide: MetaStore, useValue: { currencies: signal(CURRENCIES) } },
  ];
  return { providers, lang$, currency };
}
