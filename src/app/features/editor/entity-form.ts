import { afterNextRender, Directive, effect, ElementRef, inject, input, output, signal, untracked, type WritableSignal } from '@angular/core';
import { submit, type FieldTree, type ValidationError } from '@angular/forms/signals';
import { toast } from '@spartan-ng/brain/sonner';
import { WriteApi, WriteError } from '../../core/api/write-api';
import { I18n } from '../../core/i18n/i18n';
import { ConfirmService } from '../../shared/forms/confirm.service';
import type { EntityKind } from './entity-editor.service';

/**
 * What every side-panel form does: load the record to edit, save (create or update) with field errors
 * from the server shown on their fields, and delete with a confirmation. Subclasses provide the model,
 * the signal form and the mapping to the API.
 */
@Directive()
export abstract class EntityForm<Model extends object, Payload> {
  protected readonly api = inject(WriteApi);
  protected readonly i18n = inject(I18n);
  private readonly confirm = inject(ConfirmService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The record to edit; `null` creates one. */
  readonly id = input<string | null>(null);
  /** Emitted after saving or deleting, and when cancelled. */
  readonly done = output<void>();

  protected readonly state = signal<'loading' | 'ready' | 'missing' | 'error'>('ready');
  protected readonly saving = signal(false);

  protected abstract readonly kind: EntityKind;
  /** Path under `/api` (`categories`). */
  protected abstract readonly path: string;
  protected abstract readonly model: WritableSignal<Model>;
  protected abstract readonly f: FieldTree<Model>;
  protected abstract blank(): Model;
  protected abstract toModel(payload: Payload): Model;
  protected abstract toRequest(): unknown;
  protected abstract displayName(): string;
  /** Extra text for the delete confirmation (an account's transaction count…); `null` for none. */
  protected deleteWarning(): string | null {
    return null;
  }
  /** Text the user must type to delete (an account's name); `undefined` for plain confirmation. */
  protected deleteRequireText(): string | undefined {
    return undefined;
  }

  protected readonly isEdit = () => !!this.id();

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => {
        if (id) void this.load(id);
        else {
          this.model.set(this.blank());
          this.state.set('ready');
        }
      });
    });
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>('input:not([type=hidden]), textarea')?.focus());
  }

  protected reload(): void {
    const id = this.id();
    if (id) void this.load(id);
  }

  private async load(id: string): Promise<void> {
    this.state.set('loading');
    try {
      this.model.set(this.toModel(await this.api.get<Payload>(`${this.path}/${encodeURIComponent(id)}`)));
      this.f().reset();
      this.state.set('ready');
    } catch (err) {
      this.state.set(err instanceof WriteError && err.kind === 'not_found' ? 'missing' : 'error');
    }
  }

  protected cancel(): void {
    this.done.emit();
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    await submit(this.f, {
      action: () => this.persist(),
      onInvalid: (root) => root().errorSummary()[0]?.fieldTree().focusBoundControl(),
    });
  }

  private async persist(): Promise<ValidationError.WithOptionalFieldTree[] | undefined> {
    this.saving.set(true);
    try {
      const id = this.id();
      if (id) await this.api.update(`${this.path}/${encodeURIComponent(id)}`, this.toRequest());
      else await this.api.create(this.path, this.toRequest());
      toast.success(this.i18n.t(`editor.entity.${this.kind}.${id ? 'updated' : 'created'}`));
      this.done.emit();
      return undefined;
    } catch (err) {
      if (err instanceof WriteError && err.kind === 'validation') return this.serverErrors(err);
      toast.error(this.i18n.t(err instanceof WriteError && err.kind === 'network' ? 'editor.networkError' : 'errors.generic'));
      return undefined;
    } finally {
      this.saving.set(false);
    }
  }

  private serverErrors(err: WriteError): ValidationError.WithOptionalFieldTree[] {
    const fields = this.f as unknown as Record<string, FieldTree<unknown> | undefined>;
    const known = this.model() as Record<string, unknown>;
    return Object.entries(err.fields).flatMap(([key, messages]) =>
      messages.map((message) => ({ kind: 'server', message, fieldTree: (key in known ? fields[key] : undefined) ?? this.f })),
    );
  }

  protected async remove(): Promise<void> {
    const id = this.id();
    if (!id) return;
    const warning = this.deleteWarning();
    const message = this.i18n.t(`editor.entity.${this.kind}.deleteMessage`, { name: this.displayName() });
    const ok = await this.confirm.confirm({
      title: this.i18n.t(`editor.entity.${this.kind}.deleteTitle`),
      message: warning ? `${message} ${warning}` : message,
      confirmLabel: this.i18n.t('forms.delete'),
      destructive: true,
      requireText: this.deleteRequireText(),
    });
    if (!ok) return;
    this.saving.set(true);
    try {
      await this.api.remove(`${this.path}/${encodeURIComponent(id)}`);
      toast.success(this.i18n.t(`editor.entity.${this.kind}.deleted`));
      this.done.emit();
    } catch {
      toast.error(this.i18n.t('errors.generic'));
    } finally {
      this.saving.set(false);
    }
  }
}
