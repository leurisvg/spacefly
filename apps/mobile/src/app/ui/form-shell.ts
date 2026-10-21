import { Component, input, NO_ERRORS_SCHEMA } from '@angular/core';
import type { EntityFormState } from '@spacefly/client/features/editor/entity-form.vm';
import type { I18n } from '@spacefly/client/i18n/i18n';

/** The part of an entity form view-model the shell needs. */
export interface FormShellVm {
  i18n: Pick<I18n, 't'>;
  state(): EntityFormState;
  saving(): boolean;
  isEdit(): boolean;
  reload(): void;
  cancel(): void;
  save(): void;
  remove(): void;
}

/** What every entity form has around its fields: loading / missing / error states and the save, cancel and delete buttons. */
@Component({
  selector: 'ns-form-shell',
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    @switch (vm().state()) {
      @case ('loading') {
        <ActivityIndicator busy="true"></ActivityIndicator>
      }
      @case ('missing') {
        <Label [text]="vm().i18n.t('editor.missing')" textWrap="true" class="card"></Label>
        <Button [text]="vm().i18n.t('editor.back')" class="btn btn-outline" (tap)="vm().cancel()"></Button>
      }
      @case ('error') {
        <Label [text]="vm().i18n.t('editor.loadError')" textWrap="true" class="card"></Label>
        <Button [text]="vm().i18n.t('editor.retry')" class="btn" (tap)="vm().reload()"></Button>
      }
      @default {
        <StackLayout>
          <ng-content></ng-content>
          <Button [text]="vm().i18n.t('forms.save')" class="btn" marginTop="8" [isEnabled]="!vm().saving()" (tap)="vm().save()"></Button>
          <Button [text]="vm().i18n.t('forms.cancel')" class="btn btn-outline" marginTop="8" (tap)="vm().cancel()"></Button>
          @if (vm().isEdit()) {
            <Button [text]="vm().i18n.t('forms.delete')" class="btn btn-danger" marginTop="8" marginBottom="24" [isEnabled]="!vm().saving()" (tap)="vm().remove()"></Button>
          }
        </StackLayout>
      }
    }
  `,
})
export class FormShell {
  readonly vm = input.required<FormShellVm>();
}
