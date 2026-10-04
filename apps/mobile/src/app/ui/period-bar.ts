import { Component, inject, NO_ERRORS_SCHEMA } from '@angular/core';
import { FormatService } from '@spacefly/client/format/format.service';
import { FiltersStore } from '@spacefly/client/state/filters.store';
import { MetaStore } from '@spacefly/client/state/meta.store';

/** Previous / next period and the display currency, shared by the screens that depend on them. */
@Component({
  selector: 'ns-period-bar',
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <GridLayout columns="auto, *, auto, auto" class="screen-pad">
      <Label col="0" text="‹" class="btn-small chip" (tap)="filters.shift(-1)"></Label>
      <Label col="1" [text]="label()" horizontalAlignment="center" verticalAlignment="center"></Label>
      <Label col="2" text="›" class="btn-small chip" (tap)="filters.shift(1)"></Label>
      <StackLayout col="3" orientation="horizontal" marginLeft="8">
        @for (c of meta.currencies(); track c.code) {
          <Label [text]="c.code" class="chip" [class.chip-on]="filters.currency() === c.code" (tap)="filters.setCurrency(c.code)"></Label>
        }
      </StackLayout>
    </GridLayout>
  `,
})
export class PeriodBar {
  protected readonly filters = inject(FiltersStore);
  protected readonly meta = inject(MetaStore);
  private readonly f = inject(FormatService);

  protected label(): string {
    const p = this.filters.period();
    return this.filters.preset() === 'month' ? this.f.date(p.start, 'month') : `${this.f.date(p.start, 'short')} – ${this.f.date(p.end, 'short')}`;
  }
}
