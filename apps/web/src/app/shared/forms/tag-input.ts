import { ChangeDetectionStrategy, Component, computed, inject, input, model, output } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import { I18n } from '@spacefly/client/i18n/i18n';
import { fold } from '@spacefly/client/ui-logic/fold';
import { Combobox, type ComboSelection } from './combobox';

/** Tags as chips: pick a suggestion or type a new one and press Enter; Backspace on an empty field removes the last. */
@Component({
  selector: 'sf-tag-input',
  imports: [NgIcon, Combobox],
  providers: [provideIcons({ lucideX })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <div class="flex min-w-0 flex-col gap-2">
      @if (value().length) {
        <ul class="flex flex-wrap gap-1.5" role="list" [attr.aria-label]="ariaLabel() || null">
          @for (tag of value(); track tag) {
            <li class="inline-flex h-6 items-center gap-1 rounded-full border border-border bg-muted/50 pl-2.5 pr-1 text-xs">
              <span>#{{ tag }}</span>
              <button
                type="button"
                class="inline-flex size-4 items-center justify-center rounded-full hover:bg-muted"
                [disabled]="disabled()"
                [attr.aria-label]="i18n.t('forms.tags.remove', { tag })"
                (click)="remove(tag)"
              >
                <ng-icon name="lucideX" class="text-[10px]" aria-hidden="true" />
              </button>
            </li>
          }
        </ul>
      }
      <!-- Backspace is handled on the wrapper so it works while the combobox input has focus. -->
      <div role="presentation" (keydown)="onKey($event)">
        <sf-combobox
          [options]="options()"
          [value]="''"
          [placeholder]="placeholder() || i18n.t('forms.tags.placeholder')"
          [ariaLabel]="ariaLabel()"
          [disabled]="disabled()"
          [invalid]="invalid()"
          [allowCreate]="true"
          [resetOnPick]="true"
          [createLabel]="createLabel"
          (selection)="onSelection($event)"
          (touch)="touch.emit()"
        />
      </div>
    </div>
  `,
})
export class TagInput implements FormValueControl<string[]> {
  protected readonly i18n = inject(I18n);

  readonly value = model<string[]>([]);
  /** Existing tags to suggest. */
  readonly suggestions = input<string[]>([]);
  readonly placeholder = input('');
  readonly ariaLabel = input('');
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly touched = input(false);
  readonly touch = output<void>();

  protected readonly createLabel = (name: string) => this.i18n.t('forms.tags.add', { name });
  protected readonly options = computed(() => {
    const taken = new Set(this.value().map(fold));
    return this.suggestions()
      .filter((t) => !taken.has(fold(t)))
      .map((t) => ({ value: t, label: t }));
  });

  protected onSelection(s: ComboSelection): void {
    const tag = s.value.trim().replace(/^#/, '');
    if (!tag || this.value().some((t) => fold(t) === fold(tag))) return;
    this.value.update((tags) => [...tags, tag]);
  }

  protected remove(tag: string): void {
    this.value.update((tags) => tags.filter((t) => t !== tag));
  }

  protected onKey(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && input.value === '' && this.value().length) {
      this.value.update((tags) => tags.slice(0, -1));
    }
  }
}
