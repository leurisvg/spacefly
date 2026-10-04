import { afterRenderEffect, ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, signal, type Signal } from '@angular/core';
import { HlmLabel } from '@spartan-ng/helm/label';
import { I18n } from '@spacefly/client/i18n/i18n';

let nextId = 0;

/** What a field needs to show errors: any signal-form `FieldTree` fits. */
export type ErrorSource = () => {
  errors: Signal<readonly { kind: string; message?: string }[]>;
  touched: Signal<boolean>;
};

const CONTROL = 'input:not([type=hidden]), textarea, select, [role=combobox], [role=switch]';

/**
 * Label + help + translated errors around any control, wiring `id`, `aria-invalid` and
 * `aria-describedby` onto the first control inside. Errors show once the field is touched
 * (or right away when they come from the server); pass `[field]` to read them from a signal form.
 */
@Component({
  selector: 'sf-form-field',
  imports: [HlmLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0 [&_[aria-invalid=true]]:border-destructive' },
  template: `
    <div class="flex min-w-0 flex-col gap-1.5">
      @if (label()) {
        <label hlmLabel [attr.for]="labelFor()">
          {{ label() }}
          @if (required()) {
            <span aria-hidden="true" class="text-destructive">*</span>
          }
        </label>
      }
      <ng-content />
      @if (messages().length) {
        <p class="text-xs text-destructive" role="alert" [id]="errorId">{{ messages().join(' ') }}</p>
      } @else if (hint()) {
        <p class="text-xs text-muted-foreground" [id]="hintId">{{ hint() }}</p>
      }
    </div>
  `,
})
export class FormField {
  private readonly i18n = inject(I18n);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly label = input('');
  readonly hint = input('');
  readonly required = input(false);
  /** The signal-form field whose errors to show. */
  readonly field = input<ErrorSource | null>(null);
  /** Extra messages (already translated). */
  readonly errors = input<string[]>([]);

  protected readonly controlId = `sf-field-${nextId++}`;
  protected readonly errorId = `${this.controlId}-error`;
  protected readonly hintId = `${this.controlId}-hint`;

  protected readonly messages = computed<string[]>(() => {
    const state = this.field()?.();
    const own = state
      ? state
          .errors()
          .filter((e) => e.kind === 'server' || state.touched())
          .map((e) => this.text(e))
      : [];
    return [...own, ...this.errors()];
  });
  protected readonly labelFor = signal(this.controlId);

  constructor() {
    afterRenderEffect({
      write: () => {
        const control = this.host.nativeElement.querySelector<HTMLElement>(CONTROL);
        if (!control) return;
        if (!control.id) control.id = this.controlId;
        this.labelFor.set(control.id);
        const invalid = this.messages().length > 0;
        if (invalid) control.setAttribute('aria-invalid', 'true');
        else control.removeAttribute('aria-invalid');
        const describedBy = invalid ? this.errorId : this.hint() ? this.hintId : null;
        if (describedBy) control.setAttribute('aria-describedby', describedBy);
        else control.removeAttribute('aria-describedby');
      },
    });
  }

  private text(e: { kind: string; message?: string }): string {
    if (e.message) return e.message;
    const key = `forms.errors.${e.kind}`;
    const translated = this.i18n.t(key);
    return translated === key ? this.i18n.t('forms.errors.invalid') : translated;
  }
}
