import { isDevMode, type Type } from '@angular/core';
import { provideTransloco, type TranslocoLoader } from '@jsverse/transloco';
import { LANGS, type Lang } from './lang';

/** The Transloco setup both apps share; each app only decides how translation files are loaded. */
export function provideClientCore(options: {
  lang: Lang;
  loader: Type<TranslocoLoader>;
}): ReturnType<typeof provideTransloco> {
  return provideTransloco({
    config: {
      availableLangs: [...LANGS],
      defaultLang: options.lang,
      fallbackLang: 'es',
      reRenderOnLangChange: true,
      prodMode: !isDevMode(),
      missingHandler: { useFallbackTranslation: true, logMissingKey: isDevMode() },
    },
    loader: options.loader,
  });
}
