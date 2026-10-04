import { HttpClient, httpResource } from '@angular/common/http';
import { inject, linkedSignal, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { SettingsResponse, UserSettings } from '@spacefly/shared';
import { I18n } from '../../i18n/i18n';
import { Toast } from '../../platform/toast';
import { FiltersStore } from '../../state/filters.store';

/** `excluded` with `id` added or removed. */
export function toggleId(excluded: readonly string[], id: string, on: boolean): string[] {
  const set = new Set(excluded);
  if (on) set.add(id);
  else set.delete(id);
  return [...set];
}

/** Server-side settings: excluded accounts, balance window, Sankey threshold, and the stored exchange rates. */
export function settingsViewModel() {
  const i18n = inject(I18n);
  const http = inject(HttpClient);
  const filters = inject(FiltersStore);
  const toast = inject(Toast);
  const res = httpResource<SettingsResponse>(() => '/api/settings');
  const draft = linkedSignal<UserSettings | null>(() => (res.hasValue() ? (JSON.parse(JSON.stringify(res.value()!.settings)) as UserSettings) : null));
  const accounts = linkedSignal(() => (res.hasValue() ? res.value()!.accounts : []));
  const saving = signal(false);

  function patch(p: Partial<UserSettings>): void {
    const d = draft();
    if (d) draft.set({ ...d, ...p });
  }

  return {
    i18n,
    res,
    draft,
    accounts,
    saving,
    patch,

    toggleExcluded(id: string, excluded: boolean): void {
      const d = draft();
      if (d) patch({ excludedAccounts: toggleId(d.excludedAccounts, id, excluded) });
    },

    async save(): Promise<void> {
      const d = draft();
      if (!d) return;
      saving.set(true);
      try {
        await firstValueFrom(http.put('/api/settings', d));
        filters.refresh();
        toast.success(i18n.t('settings.saved'));
      } catch {
        toast.error(i18n.t('errors.generic'));
      } finally {
        saving.set(false);
      }
    },
  };
}
