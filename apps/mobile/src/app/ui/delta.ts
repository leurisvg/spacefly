import { Component, computed, inject, input, NO_ERRORS_SCHEMA } from '@angular/core';
import { FormatService } from '@spacefly/client/format/format.service';
import { deltaModel } from '@spacefly/client/ui-logic/delta';
import { toneClass } from './money';

const ARROW = { up: '▲', down: '▼', flat: '–' } as const;

/** Signed change vs a reference: arrow (direction never relies on color alone) plus ratio or points. */
@Component({
  selector: 'ns-delta',
  schemas: [NO_ERRORS_SCHEMA],
  template: `<Label [text]="text()" [class]="cls()" class="small" textWrap="false"></Label>`,
})
export class Delta {
  private readonly f = inject(FormatService);
  readonly value = input.required<number>();
  readonly previous = input.required<number | null>();
  readonly upIsGood = input(true);
  /** Show the difference in percentage points instead of a ratio (for rates). */
  readonly points = input(false);

  private readonly model = computed(() => deltaModel(this.value(), this.previous(), this.upIsGood(), this.f.hidden()));
  protected readonly text = computed(() => {
    const m = this.model();
    return `${ARROW[m.direction]} ${this.points() ? m.pointsLabel : m.ratio === null ? '—' : this.f.pct(m.ratio, 1)}`;
  });
  protected readonly cls = computed(() => toneClass(this.model().tone));
}
