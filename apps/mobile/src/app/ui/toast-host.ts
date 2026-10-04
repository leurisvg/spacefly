import { Component, inject, NO_ERRORS_SCHEMA } from '@angular/core';
import { NsToast } from '../platform/ns-toast';
import { Toast } from '@spacefly/client/platform/toast';

/** Draws what `NsToast` queued, over every page (the app root hosts it). */
@Component({
  selector: 'ns-toast-host',
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <StackLayout verticalAlignment="bottom" isUserInteractionEnabled="false">
      @for (m of toast.messages(); track m.id) {
        <Label [text]="m.message" textWrap="true" class="toast" [class.toast-error]="m.kind === 'error'"></Label>
      }
    </StackLayout>
  `,
})
export class ToastHost {
  protected readonly toast = inject(Toast) as NsToast;
}
