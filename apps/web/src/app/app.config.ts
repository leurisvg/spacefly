import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAppInitializer, provideBrowserGlobalErrorListeners, type ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { baseUrlInterceptor } from '@spacefly/client/platform/api-base-url';
import { CLIENT_INTERCEPTORS } from '@spacefly/client/auth/auth.interceptor';
import { LANG_KEY, initialLang } from '@spacefly/client/i18n/lang';
import { provideClientCore } from '@spacefly/client/i18n/provide-client-core';
import { provideTheme } from '@spacefly/client/state/theme.store';
import { provideHlmSidebarConfig } from '@spartan-ng/helm/sidebar';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { provideEchartsCore } from 'ngx-echarts';
import { routes } from './app.routes';
import { TranslocoHttpLoader } from './core/i18n/transloco-loader';
import { accessRenewInterceptor } from './platform/access-renew.interceptor';
import { provideWebPlatform } from './platform/provide-web-platform';

const lang = initialLang(localStorage.getItem(LANG_KEY), navigator.language);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withFetch(), withInterceptors([...CLIENT_INTERCEPTORS, accessRenewInterceptor, baseUrlInterceptor])),
    provideClientCore({ lang, loader: TranslocoHttpLoader }),
    ...provideWebPlatform(),
    provideTheme(),
    // ECharts is loaded lazily on the first chart (keeps it out of the initial bundle).
    provideEchartsCore({ echarts: () => import('./shared/charts/echarts-setup').then((m) => m.default) }),
    provideSpartanHlm(),
    provideHlmSidebarConfig({ sidebarCookieName: 'spacefly_sidebar', sidebarWidth: '15.5rem' }),
    provideAppInitializer(() => {
      document.documentElement.lang = lang;
    }),
  ],
};
