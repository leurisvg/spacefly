import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideTrash2 } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { I18n } from '../../core/i18n/i18n';

/**
 * Sticky action bar of a form: Cancel, Delete (when editing) and Save. Ctrl/Cmd+Enter saves from anywhere
 * in the form.
 */
@Component({
  selector: 'sf-form-footer',
  imports: [HlmButton, NgIcon],
  providers: [provideIcons({ lucideTrash2 })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClass()',
    '(document:keydown)': 'onKey($event)',
  },
  template: `
    @if (canDelete()) {
      <button hlmBtn type="button" variant="ghost" class="text-destructive hover:text-destructive" [disabled]="saving()" (click)="remove.emit()">
        <ng-icon name="lucideTrash2" aria-hidden="true" />{{ i18n.t('forms.delete') }}
      </button>
    }
    <span class="flex-1"></span>
    <button hlmBtn type="button" variant="ghost" [disabled]="saving()" (click)="dismissed.emit()">{{ i18n.t('forms.cancel') }}</button>
    <button hlmBtn type="button" [disabled]="saving() || saveDisabled()" [attr.aria-busy]="saving()" (click)="save.emit()">
      {{ saving() ? i18n.t('forms.saving') : (saveLabel() || i18n.t('forms.save')) }}
    </button>
  `,
})
export class FormFooter {
  protected readonly i18n = inject(I18n);
  readonly saving = input(false);
  readonly saveDisabled = input(false);
  readonly canDelete = input(false);
  readonly saveLabel = input('');
  /** `page` bleeds into the page padding; `sheet` into a side sheet's. */
  readonly inset = input<'page' | 'sheet'>('page');
  readonly save = output<void>();
  readonly dismissed = output<void>();
  readonly remove = output<void>();

  protected readonly hostClass = computed(
    () =>
      `sticky bottom-0 z-10 mt-2 flex items-center gap-2 border-t border-border bg-background/90 py-3 backdrop-blur ${
        this.inset() === 'sheet' ? '-mx-5 -mb-4 px-5' : '-mx-3 px-3 sm:-mx-5 sm:px-5'
      }`,
  );

  protected onKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.repeat) {
      event.preventDefault();
      if (!this.saving() && !this.saveDisabled()) this.save.emit();
    }
  }
}
