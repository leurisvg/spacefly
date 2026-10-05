import { type EnvironmentProviders, type Provider } from '@angular/core';
import { API_BASE_URL } from '@spacefly/client/platform/api-base-url';
import { AuthPlatform } from '@spacefly/client/platform/auth-platform';
import { BackNavigation } from '@spacefly/client/platform/back-navigation';
import { Confirm } from '@spacefly/client/platform/confirm';
import { DEVICE_LANG } from '@spacefly/client/platform/device-lang';
import { FilterParamsSource } from '@spacefly/client/platform/filter-params-source';
import { KeyValueStorage } from '@spacefly/client/platform/key-value-storage';
import { ThemeHost } from '@spacefly/client/platform/theme-host';
import { Toast } from '@spacefly/client/platform/toast';
import { RouterFilterParams } from './router-filter-params';
import { WebAuthPlatform } from './web-auth-platform';
import { WebBackNavigation } from './web-back-navigation';
import { WebConfirm } from './web-confirm';
import { WebKeyValueStorage } from './web-key-value-storage';
import { WebThemeHost } from './web-theme-host';
import { WebToast } from './web-toast';

/** Everything `libs/client` expects the host platform to provide, for the browser. */
export function provideWebPlatform(): (Provider | EnvironmentProviders)[] {
  return [
    { provide: KeyValueStorage, useClass: WebKeyValueStorage },
    { provide: API_BASE_URL, useValue: '' },
    { provide: AuthPlatform, useClass: WebAuthPlatform },
    { provide: FilterParamsSource, useClass: RouterFilterParams },
    { provide: Toast, useClass: WebToast },
    { provide: Confirm, useClass: WebConfirm },
    { provide: BackNavigation, useClass: WebBackNavigation },
    { provide: ThemeHost, useClass: WebThemeHost },
    { provide: DEVICE_LANG, useFactory: () => (typeof navigator !== 'undefined' ? navigator.language : null) },
  ];
}
