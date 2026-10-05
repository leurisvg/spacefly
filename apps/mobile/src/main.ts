import { inject, provideAppInitializer, provideZonelessChangeDetection } from '@angular/core';
import { withInterceptors } from '@angular/common/http';
import { bootstrapApplication, provideNativeScriptHttpClient, provideNativeScriptRouter, runNativeScriptAngularApp } from '@nativescript/angular';
import { ApplicationSettings, Device } from '@nativescript/core';
import { TranslocoService } from '@jsverse/transloco';
import { CLIENT_INTERCEPTORS } from '@spacefly/client/auth/auth.interceptor';
import { initialLang, LANG_KEY } from '@spacefly/client/i18n/lang';
import { provideClientCore } from '@spacefly/client/i18n/provide-client-core';
import { baseUrlInterceptor } from '@spacefly/client/platform/api-base-url';
import { provideTheme } from '@spacefly/client/state/theme.store';
import { AppComponent } from './app/app.component';
import { bearerInterceptor } from './app/platform/bearer.interceptor';
import { ensureIntl } from './app/platform/intl-polyfill';
import { provideMobilePlatform } from './app/platform/provide-mobile-platform';
import { StaticTranslocoLoader } from './app/platform/static-loader';
import { routes } from './app/app.routes';
import { firstValueFrom } from 'rxjs';

const lang = initialLang(ApplicationSettings.getString(LANG_KEY) ?? null, Device.language);

runNativeScriptAngularApp({
  appModuleBootstrap: async () => {
    await ensureIntl();
    return bootstrapApplication(AppComponent, {
      providers: [
        provideZonelessChangeDetection(),
        // The bearer interceptor must see `/api/…` paths, and the base URL is added last.
        provideNativeScriptHttpClient(withInterceptors([...CLIENT_INTERCEPTORS, bearerInterceptor, baseUrlInterceptor])),
        provideNativeScriptRouter(routes),
        provideClientCore({ lang, loader: StaticTranslocoLoader }),
        provideMobilePlatform(),
        provideTheme(),
        // The screens translate through `I18n.t()`, which never triggers a load: have the catalog ready before the first render.
        provideAppInitializer(() => firstValueFrom(inject(TranslocoService).load(lang))),
      ],
    });
  },
});
