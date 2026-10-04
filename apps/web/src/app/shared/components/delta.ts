import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowDown, lucideArrowUp, lucideMinus } from '@ng-icons/lucide';
import { FormatService } from '@spacefly/client/format/format.service';
import { PctPipe } from '@spacefly/client/format/pipes';
import { deltaModel, type Tone } from '@spacefly/client/ui-logic/delta';

/**
 * Signed change vs a reference. Color = direction × whether "up" is good; the arrow icon
 * carries direction so meaning never depends on color alone.
 */
@Component({
  selector: 'sf-delta',
  imports: [NgIcon, PctPipe],
  providers: [provideIcons({ lucideArrowUp, lucideArrowDown, lucideMinus })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-0.5 text-xs font-medium num', '[class]': 'tone()' },
  template: `
    <ng-icon [name]="icon()" class="text-[0.85em]" />
    @if (points()) {
      <span>{{ diffLabel() }}</span>
    } @else {
      <span>{{ ratio() === null ? '—' : (ratio()! | pct: 1) }}</span>
    }
  `,
})
export class Delta {
  private readonly f = inject(FormatService);
  readonly value = input.required<number>();
  readonly previous = input.required<number | null>();
  readonly upIsGood = input(true);
  /** Show the absolute difference in percentage points instead of a ratio (for rates). */
  readonly points = input(false);

  private readonly model = computed(() => deltaModel(this.value(), this.previous(), this.upIsGood(), this.f.hidden()));
  protected readonly ratio = computed(() => this.model().ratio);
  protected readonly diffLabel = computed(() => this.model().pointsLabel);
  protected readonly icon = computed(() => ({ up: 'lucideArrowUp', down: 'lucideArrowDown', flat: 'lucideMinus' })[this.model().direction]);
  protected readonly tone = computed(() => TONE_CLASS[this.model().tone]);
}

const TONE_CLASS: Record<Tone, string> = { positive: 'text-positive', negative: 'text-negative', neutral: 'text-muted-foreground' };
