import { signal, type EnvironmentProviders, type Provider } from '@angular/core';
import { API_BASE_URL } from '../src/platform/api-base-url';
import { AuthPlatform } from '../src/platform/auth-platform';
import { BackNavigation } from '../src/platform/back-navigation';
import { Confirm, type ConfirmOptions } from '../src/platform/confirm';
import { DEVICE_LANG } from '../src/platform/device-lang';
import { FilterParamsSource, type ParamValue } from '../src/platform/filter-params-source';
import { KeyValueStorage } from '../src/platform/key-value-storage';
import { Toast } from '../src/platform/toast';

/** In-memory KeyValueStorage. */
export class MemoryStorage extends KeyValueStorage {
  readonly data = new Map<string, string>();

  override get(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  override set(key: string, value: string): void {
    this.data.set(key, value);
  }

  override remove(key: string): void {
    this.data.delete(key);
  }
}

/** Remembers what the platform was asked to do instead of navigating. */
export class RecordingAuthPlatform extends AuthPlatform {
  readonly logins: string[] = [];
  logouts = 0;
  unauthorized = 0;
  /** What `login()` resolves with. */
  loginResult: 'redirecting' | 'done' = 'done';

  override login(returnTo: string): Promise<'redirecting' | 'done'> {
    this.logins.push(returnTo);
    return Promise.resolve(this.loginResult);
  }

  override afterLogout(): void {
    this.logouts++;
  }

  override onUnauthorized(): void {
    this.unauthorized++;
  }
}

/** Filters held in a signal, like the mobile app. */
export class MemoryFilterParams extends FilterParamsSource {
  private readonly state = signal<Record<string, string>>({});
  override readonly params = this.state.asReadonly();

  override merge(params: Record<string, ParamValue>): void {
    const next = { ...this.state() };
    for (const [key, value] of Object.entries(params)) {
      if (value === null) delete next[key];
      else next[key] = String(value);
    }
    this.state.set(next);
  }
}

export class RecordingToast extends Toast {
  readonly messages: { kind: 'success' | 'error'; message: string }[] = [];

  override success(message: string): void {
    this.messages.push({ kind: 'success', message });
  }

  override error(message: string): void {
    this.messages.push({ kind: 'error', message });
  }
}

export class FakeConfirm extends Confirm {
  readonly asked: ConfirmOptions[] = [];
  /** What the next confirmations answer. */
  answer = true;

  override confirm(options: ConfirmOptions): Promise<boolean> {
    this.asked.push(options);
    return Promise.resolve(this.answer);
  }
}

export class FakeBackNavigation extends BackNavigation {
  override canGoBack = false;
  readonly fallbacks: string[] = [];

  override back(fallback: string): void {
    this.fallbacks.push(fallback);
  }
}

/** All the platform tokens, backed by the fakes above. Inject a fake by class to inspect it. */
export function provideTestPlatform(): (Provider | EnvironmentProviders)[] {
  return [
    MemoryStorage,
    RecordingAuthPlatform,
    MemoryFilterParams,
    RecordingToast,
    FakeConfirm,
    FakeBackNavigation,
    { provide: KeyValueStorage, useExisting: MemoryStorage },
    { provide: API_BASE_URL, useValue: '' },
    { provide: AuthPlatform, useExisting: RecordingAuthPlatform },
    { provide: FilterParamsSource, useExisting: MemoryFilterParams },
    { provide: Toast, useExisting: RecordingToast },
    { provide: Confirm, useExisting: FakeConfirm },
    { provide: BackNavigation, useExisting: FakeBackNavigation },
    { provide: DEVICE_LANG, useValue: 'es-DO' },
  ];
}
