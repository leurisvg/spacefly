import { effect, inject, signal, untracked, type Signal } from '@angular/core';
import type { TxEditPayload } from '@spacefly/shared';
import { WriteApi, WriteError } from '../../api/write-api';
import { I18n } from '../../i18n/i18n';
import { BackNavigation } from '../../platform/back-navigation';
import { Confirm } from '../../platform/confirm';
import { Toast } from '../../platform/toast';
import { MetaStore } from '../../state/meta.store';

export type TxViewState = 'loading' | 'ready' | 'notEditable' | 'missing' | 'error';

/** One stored transaction: what it says, whether SpaceFly can edit it, and deleting it. */
export function txViewViewModel(id: Signal<string | undefined>) {
  const i18n = inject(I18n);
  const api = inject(WriteApi);
  const meta = inject(MetaStore);
  const back = inject(BackNavigation);
  const confirm = inject(Confirm);
  const toast = inject(Toast);

  const state = signal<TxViewState>('loading');
  const tx = signal<TxEditPayload | null>(null);
  const blockedReason = signal<string | null>(null);
  const busy = signal(false);

  async function load(txId: string): Promise<void> {
    state.set('loading');
    try {
      tx.set(await api.getTransaction(txId));
      state.set('ready');
    } catch (err) {
      tx.set(null);
      if (err instanceof WriteError && err.kind === 'not_editable') {
        blockedReason.set(err.reason);
        state.set('notEditable');
      } else {
        state.set(err instanceof WriteError && err.kind === 'not_found' ? 'missing' : 'error');
      }
    }
  }

  effect(() => {
    const txId = id();
    untracked(() => {
      if (txId) void load(txId);
    });
  });

  return {
    i18n,
    state,
    tx,
    blockedReason,
    busy,
    fireflyUrl: (): string | null => (id() ? meta.fireflyUrl(`/transactions/show/${id()}`) : null),

    reload(): void {
      const txId = id();
      if (txId) void load(txId);
    },

    close(): void {
      back.back('/transactions');
    },

    async remove(): Promise<void> {
      const txId = id();
      const current = tx();
      if (!txId || busy()) return;
      const ok = await confirm.confirm({
        title: i18n.t('editor.tx.deleteTitle'),
        message: i18n.t('editor.tx.deleteMessage', { name: current?.description ?? i18n.t('nav.explorer') }),
        confirmLabel: i18n.t('forms.delete'),
        destructive: true,
      });
      if (!ok) return;
      busy.set(true);
      try {
        await api.deleteTransaction(txId);
        toast.success(i18n.t('editor.tx.deleted'));
        back.back('/transactions');
      } catch {
        toast.error(i18n.t('errors.generic'));
      } finally {
        busy.set(false);
      }
    },
  };
}
