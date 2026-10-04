import { computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { ApiService } from '../../api/report-resource';
import { AuthService } from '../../auth/auth.service';
import { I18n } from '../../i18n/i18n';
import { LANG_KEY, LANGS, type Lang } from '../../i18n/lang';
import { KeyValueStorage } from '../../platform/key-value-storage';
import { Toast } from '../../platform/toast';
import { FiltersStore } from '../../state/filters.store';
import { MetaStore } from '../../state/meta.store';
import { PrivacyStore } from '../../state/privacy.store';

/** Device-level preferences (language, privacy mode, display currency) plus the signed-in user and the cache refresh. */
export function preferencesViewModel() {
  const transloco = inject(TranslocoService);
  const storage = inject(KeyValueStorage);
  const api = inject(ApiService);
  const meta = inject(MetaStore);
  const auth = inject(AuthService);
  const filters = inject(FiltersStore);
  const privacy = inject(PrivacyStore);
  const toast = inject(Toast);
  const i18n = inject(I18n);

  const lang = toSignal(transloco.langChanges$, { initialValue: transloco.getActiveLang() });
  const refreshing = signal(false);

  return {
    i18n,
    langs: LANGS,
    lang,
    privacy,
    auth,
    currency: filters.currency,
    currencies: meta.currencies,
    refreshing,
    email: computed(() => meta.meta()?.email ?? auth.me()?.email ?? ''),
    fireflyUrl: computed(() => meta.meta()?.fireflyPublicUrl ?? null),

    /** Switches the UI language and remembers it. */
    setLang(next: Lang): void {
      transloco.setActiveLang(next);
      storage.set(LANG_KEY, next);
    },

    setCurrency(code: string): void {
      filters.setCurrency(code);
    },

    /** Drops the server cache and refetches every visible report. */
    async refresh(): Promise<void> {
      refreshing.set(true);
      try {
        await api.refresh();
        toast.success(transloco.translate('topbar.refreshed'));
      } catch {
        toast.error(transloco.translate('errors.generic'));
      } finally {
        refreshing.set(false);
      }
    },

    logout(): Promise<void> {
      return auth.logout();
    },
  };
}
