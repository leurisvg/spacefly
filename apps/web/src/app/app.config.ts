import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { isDevMode, provideAppInitializer, provideBrowserGlobalErrorListeners, type ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { provideHlmSidebarConfig } from '@spartan-ng/helm/sidebar';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { provideEchartsCore } from 'ngx-echarts';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { initialLang, LANGS, TranslocoHttpLoader } from './core/i18n/transloco-loader';

const lang = initialLang();

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideTransloco({
      config: {
        availableLangs: [...LANGS],
        defaultLang: lang,
        fallbackLang: 'es',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        missingHandler: { useFallbackTranslation: true, logMissingKey: isDevMode() },
      },
      loader: TranslocoHttpLoader,
    }),
    // ECharts is loaded lazily on the first chart (keeps it out of the initial bundle).
    provideEchartsCore({ echarts: () => import('./shared/charts/echarts-setup').then((m) => m.default) }),
    provideSpartanHlm(),
    provideHlmSidebarConfig({ sidebarCookieName: 'spacefly_sidebar', sidebarWidth: '15.5rem' }),
    provideAppInitializer(() => {
      document.documentElement.lang = lang;
    }),
  ],
};
