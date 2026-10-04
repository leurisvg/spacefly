import { Component, computed, inject, input, NO_ERRORS_SCHEMA } from '@angular/core';
import { FormatService } from '@spacefly/client/format/format.service';
import { Delta } from './delta';

/** A headline number with its change against the previous period. */
@Component({
  selector: 'ns-kpi',
  imports: [Delta],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <StackLayout class="kpi">
      <Label [text]="label()" class="eyebrow" textWrap="false"></Label>
      <Label [text]="text()" class="kpi-value" [style.color]="accent()" textWrap="false"></Label>
      @if (value() !== null && previous() !== null) {
        <ns-delta [value]="value()!" [previous]="previous()" [upIsGood]="upIsGood()" [points]="format() === 'pct'" />
      }
    </StackLayout>
  `,
})
export class KpiCard {
  private readonly f = inject(FormatService);
  readonly label = input.required<string>();
  readonly value = input<number | null>(null);
  readonly previous = input<number | null>(null);
  readonly format = input<'money' | 'pct'>('money');
  readonly upIsGood = input(true);
  readonly accent = input('#e2e8f0');

  protected readonly text = computed(() => (this.format() === 'pct' ? this.f.pct(this.value()) : this.f.money(this.value())));
}
