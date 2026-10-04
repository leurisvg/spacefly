import { inject, Injectable, Injector } from '@angular/core';
import { Confirm, type ConfirmOptions } from '@spacefly/client/platform/confirm';

/** The spartan dialog confirmation, loaded on first use so the dialog code stays out of the initial bundle. */
@Injectable()
export class WebConfirm extends Confirm {
  private readonly injector = inject(Injector);

  override async confirm(options: ConfirmOptions): Promise<boolean> {
    const { ConfirmService } = await import('../shared/forms/confirm.service');
    return this.injector.get(ConfirmService).confirm(options);
  }
}
