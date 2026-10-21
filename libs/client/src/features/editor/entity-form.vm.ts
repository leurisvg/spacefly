import { computed, effect, inject, signal, untracked, type Signal, type WritableSignal } from '@angular/core';
import { form, submit, type SchemaFn, type ValidationError, type FieldTree } from '@angular/forms/signals';
import { WriteApi, WriteError } from '../../api/write-api';
import { I18n } from '../../i18n/i18n';
import { Confirm } from '../../platform/confirm';
import { Toast } from '../../platform/toast';
import type { EntityKind } from '../../state/entity-editor.service';

export type EntityFormState = 'loading' | 'ready' | 'missing' | 'error';

/** What an entity form (category, tag, budget, subscription, account, goal) is made of. The generic part is `entityFormViewModel`. */
export interface EntityFormSpec<Model extends object, Payload> {
  kind: EntityKind;
  /** Path under `/api` (`categories`). */
  path: string;
  /** The record to edit; empty creates one. */
  id: Signal<string | null | undefined>;
  /** Called after saving or deleting, and when cancelled. */
  done: () => void;
  /** The form's model, created by the caller so its validators can read it. */
  model: WritableSignal<Model>;
  schema: SchemaFn<Model>;
  blank(): Model;
  toModel(payload: Payload): Model;
  toRequest(model: Model): unknown;
  displayName(model: Model): string;
  /** Extra text for the delete confirmation (an account's transaction count…); `null` for none. */
  deleteWarning?(): string | null;
  /** Text the user must type to delete (an account's name); `undefined` for a plain confirmation. */
  deleteRequireText?(model: Model): string | undefined;
}

/**
 * What every entity form does: load the record to edit, save (create or update) with the server's field errors shown on their
 * fields, and delete with a confirmation. Platform bits (toast, confirmation) come from their tokens.
 */
export function entityFormViewModel<Model extends object, Payload>(spec: EntityFormSpec<Model, Payload>) {
  const api = inject(WriteApi);
  const i18n = inject(I18n);
  const toast = inject(Toast);
  const confirm = inject(Confirm);
  const { model, kind } = spec;

  const state = signal<EntityFormState>('ready');
  const saving = signal(false);
  const f = form(model, spec.schema);
  const isEdit = computed(() => !!spec.id());

  async function load(id: string): Promise<void> {
    state.set('loading');
    try {
      model.set(spec.toModel(await api.get<Payload>(`${spec.path}/${encodeURIComponent(id)}`)));
      (f as FieldTree<Model>)().reset();
      state.set('ready');
    } catch (err) {
      state.set(err instanceof WriteError && err.kind === 'not_found' ? 'missing' : 'error');
    }
  }

  effect(() => {
    const id = spec.id();
    untracked(() => {
      if (id) void load(id);
      else {
        model.set(spec.blank());
        state.set('ready');
      }
    });
  });

  function serverErrors(err: WriteError): ValidationError.WithOptionalFieldTree[] {
    const fields = f as unknown as Record<string, FieldTree<unknown> | undefined>;
    const known = model() as Record<string, unknown>;
    return Object.entries(err.fields).flatMap(([key, messages]) =>
      messages.map((message) => ({ kind: 'server', message, fieldTree: (key in known ? fields[key] : undefined) ?? (f as FieldTree<unknown>) })),
    );
  }

  async function persist(): Promise<ValidationError.WithOptionalFieldTree[] | undefined> {
    saving.set(true);
    try {
      const id = spec.id();
      if (id) await api.update(`${spec.path}/${encodeURIComponent(id)}`, spec.toRequest(model()));
      else await api.create(spec.path, spec.toRequest(model()));
      toast.success(i18n.t(`editor.entity.${kind}.${id ? 'updated' : 'created'}`));
      spec.done();
      return undefined;
    } catch (err) {
      if (err instanceof WriteError && err.kind === 'validation') return serverErrors(err);
      toast.error(i18n.t(err instanceof WriteError && err.kind === 'network' ? 'editor.networkError' : 'errors.generic'));
      return undefined;
    } finally {
      saving.set(false);
    }
  }

  return {
    i18n,
    model,
    f,
    state,
    saving,
    isEdit,

    reload(): void {
      const id = spec.id();
      if (id) void load(id);
    },

    cancel(): void {
      spec.done();
    },

    async save(): Promise<void> {
      if (saving()) return;
      await submit(f, {
        action: () => persist(),
        onInvalid: (root) => root().errorSummary()[0]?.fieldTree().focusBoundControl(),
      });
    },

    async remove(): Promise<void> {
      const id = spec.id();
      if (!id) return;
      const warning = spec.deleteWarning?.() ?? null;
      const message = i18n.t(`editor.entity.${kind}.deleteMessage`, { name: spec.displayName(model()) });
      const ok = await confirm.confirm({
        title: i18n.t(`editor.entity.${kind}.deleteTitle`),
        message: warning ? `${message} ${warning}` : message,
        confirmLabel: i18n.t('forms.delete'),
        destructive: true,
        requireText: spec.deleteRequireText?.(model()),
      });
      if (!ok) return;
      saving.set(true);
      try {
        await api.remove(`${spec.path}/${encodeURIComponent(id)}`);
        toast.success(i18n.t(`editor.entity.${kind}.deleted`));
        spec.done();
      } catch {
        toast.error(i18n.t('errors.generic'));
      } finally {
        saving.set(false);
      }
    },
  };
}

/** Inputs shared by every entity form view-model. */
export interface EntityFormInputs {
  id: Signal<string | null | undefined>;
  done: () => void;
}
