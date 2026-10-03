import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';

/** Card section with a title, optional actions and a first-load skeleton. */
@Component({
  selector: 'sf-section',
  imports: [HlmSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-w-0 flex-col rounded-xl border border-border bg-card p-4 sm:p-5' },
  template: `
    <header class="mb-3 flex items-center gap-2">
      <h2 class="card-title min-w-0 flex-1 truncate">{{ title() }}</h2>
      <ng-content select="[section-actions]" />
    </header>
    @if (loading()) {
      <div class="flex flex-col gap-2">
        @for (i of rows; track i) {
          <div hlmSkeleton class="h-8 w-full"></div>
        }
      </div>
    } @else {
      <ng-content />
    }
  `,
})
export class Section {
  readonly title = input.required<string>();
  readonly loading = input(false);
  protected readonly rows = [1, 2, 3, 4];
}
