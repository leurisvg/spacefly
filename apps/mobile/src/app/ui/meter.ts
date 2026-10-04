import { Component, computed, inject, input, NO_ERRORS_SCHEMA } from '@angular/core';
import { FormatService } from '@spacefly/client/format/format.service';
import { meterModel } from '@spacefly/client/ui-logic/budget-status';

/** Budget meter: green below 80 %, amber from 80 %, red from 100 % of the limit (empty in privacy mode). */
@Component({
  selector: 'ns-meter',
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <GridLayout class="meter-track">
      <StackLayout [class]="'meter-fill meter-' + model().status" [width]="model().fill + '%'"></StackLayout>
    </GridLayout>
  `,
})
export class Meter {
  private readonly f = inject(FormatService);
  /** spent / limit. */
  readonly ratio = input<number | null>(null);
  protected readonly model = computed(() => meterModel(this.ratio(), this.f.hidden()));
}
