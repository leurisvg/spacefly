import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowDown, lucideArrowUp, lucideMinus } from '@ng-icons/lucide';
import { FormatService } from '../../core/format/format.service';
import { PctPipe } from '../../core/format/pipes';

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

  protected readonly diff = computed(() => (this.previous() === null ? 0 : this.value() - this.previous()!));
  protected readonly ratio = computed(() => {
    const p = this.previous();
    return p === null || p === 0 ? null : Math.abs(this.diff() / p);
  });
  protected readonly diffLabel = computed(() => `${(this.f.hidden() ? 0 : Math.abs(this.diff())).toFixed(1)} pp`);
  // In privacy mode direction and color would give away the hidden change: show it as neutral.
  protected readonly icon = computed(() => (this.f.hidden() ? 'lucideMinus' : this.diff() > 0 ? 'lucideArrowUp' : this.diff() < 0 ? 'lucideArrowDown' : 'lucideMinus'));
  protected readonly tone = computed(() => {
    const d = this.diff();
    if (d === 0 || this.previous() === null || this.f.hidden()) return 'text-muted-foreground';
    return d > 0 === this.upIsGood() ? 'text-positive' : 'text-negative';
  });
}
