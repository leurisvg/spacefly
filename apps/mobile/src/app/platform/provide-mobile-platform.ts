import { inject, type EnvironmentProviders, type Provider } from '@angular/core';
import { Device } from '@nativescript/core';
import { API_BASE_URL } from '@spacefly/client/platform/api-base-url';
import { AuthPlatform } from '@spacefly/client/platform/auth-platform';
import { BackNavigation } from '@spacefly/client/platform/back-navigation';
import { Confirm } from '@spacefly/client/platform/confirm';
import { DEVICE_LANG } from '@spacefly/client/platform/device-lang';
import { FilterParamsSource } from '@spacefly/client/platform/filter-params-source';
import { KeyValueStorage } from '@spacefly/client/platform/key-value-storage';
import { ThemeHost } from '@spacefly/client/platform/theme-host';
import { Toast } from '@spacefly/client/platform/toast';
import { AppSettingsStorage } from './app-settings-storage';
import { InMemoryFilterParams } from './in-memory-filter-params';
import { MobileAuthPlatform } from './mobile-auth-platform';
import { NsBackNavigation } from './ns-back-navigation';
import { NsConfirm } from './ns-confirm';
import { NsThemeHost } from './ns-theme-host';
import { NsToast } from './ns-toast';
import { ServerConfig } from './server-config';

/** Everything `libs/client` expects the host platform to provide, for the NativeScript app. */
export function provideMobilePlatform(): (Provider | EnvironmentProviders)[] {
  return [
    NsToast,
    { provide: KeyValueStorage, useClass: AppSettingsStorage },
    // A function: the server URL can change in the settings without restarting the app.
    { provide: API_BASE_URL, useFactory: () => { const config = inject(ServerConfig); return () => config.apiUrl(); } },
    { provide: AuthPlatform, useClass: MobileAuthPlatform },
    { provide: FilterParamsSource, useClass: InMemoryFilterParams },
    { provide: Toast, useExisting: NsToast },
    { provide: Confirm, useClass: NsConfirm },
    { provide: BackNavigation, useClass: NsBackNavigation },
    { provide: ThemeHost, useClass: NsThemeHost },
    { provide: DEVICE_LANG, useFactory: () => Device.language ?? null },
  ];
}
