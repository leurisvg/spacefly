import { ChangeDetectionStrategy, Component, computed, inject, Injectable, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialogImports, HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';
import { firstValueFrom } from 'rxjs';
import { Confirm, type ConfirmOptions } from '@spacefly/client/platform/confirm';
import { I18n } from '@spacefly/client/i18n/i18n';
import { fold } from '@spacefly/client/ui-logic/fold';

@Component({
  selector: 'sf-confirm-dialog',
  imports: [FormsModule, HlmButton, HlmInput, ...HlmDialogImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <hlm-dialog-header>
      <h2 hlmDialogTitle>{{ opts.title }}</h2>
      <p class="text-sm text-muted-foreground">{{ opts.message }}</p>
    </hlm-dialog-header>
    @if (opts.requireText) {
      <label class="flex flex-col gap-1.5 text-sm">
        <span>{{ i18n.t('forms.confirm.typeToConfirm', { text: opts.requireText }) }}</span>
        <input hlmInput type="text" autocomplete="off" [ngModel]="typed()" (ngModelChange)="typed.set($event)" (keydown.enter)="confirm()" />
      </label>
    }
    <hlm-dialog-footer>
      <button hlmBtn type="button" variant="outline" (click)="ref.close(false)">{{ i18n.t('forms.cancel') }}</button>
      <button hlmBtn type="button" [variant]="opts.destructive ? 'destructive' : 'default'" [disabled]="!allowed()" (click)="confirm()">
        {{ opts.confirmLabel || i18n.t('forms.confirm.ok') }}
      </button>
    </hlm-dialog-footer>
  `,
})
export class ConfirmDialog {
  protected readonly i18n = inject(I18n);
  protected readonly ref = inject<BrnDialogRef<boolean>>(BrnDialogRef);
  protected readonly opts = injectBrnDialogContext<ConfirmOptions>();
  protected readonly typed = signal('');
  protected readonly allowed = computed(() => !this.opts.requireText || fold(this.typed().trim()) === fold(this.opts.requireText.trim()));

  protected confirm(): void {
    if (this.allowed()) this.ref.close(true);
  }
}

/** Promise-based confirmation dialog (deletes). Resolves `false` on cancel, Esc or outside click. */
@Injectable({ providedIn: 'root' })
export class ConfirmService extends Confirm {
  private readonly dialogs = inject(HlmDialogService);

  override async confirm(options: ConfirmOptions): Promise<boolean> {
    const ref = this.dialogs.open<boolean, ConfirmOptions>(ConfirmDialog, { context: options, showCloseButton: false });
    return (await firstValueFrom(ref.closed$, { defaultValue: false })) === true;
  }
}

export type { ConfirmOptions };
