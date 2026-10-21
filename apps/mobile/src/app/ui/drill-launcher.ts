import { inject, Injectable } from '@angular/core';
import { RouterExtensions } from '@nativescript/angular';
import type { TxFilter } from '@spacefly/shared';
import { TxDetailService } from '@spacefly/client/state/tx-detail.service';

/** Opens the transactions behind a tapped chart element or row on the `/drill` screen. */
@Injectable({ providedIn: 'root' })
export class DrillLauncher {
  private readonly detail = inject(TxDetailService);
  private readonly router = inject(RouterExtensions);

  /** Asks the detail service for `filter` and shows it. */
  open(title: string, filter: Partial<TxFilter>, subtitle?: string): void {
    this.detail.open(title, filter, subtitle);
    this.show();
  }

  /** Shows the request a view-model already put in the detail service (`vm.openMonth(…)`), if any. */
  show(): void {
    if (this.detail.request()) void this.router.navigate(['/drill']);
  }
}
