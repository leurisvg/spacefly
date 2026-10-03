import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'sf-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between' },
  template: `
    <div class="min-w-0">
      <h1 class="text-xl font-semibold tracking-tight sm:text-2xl">{{ title() }}</h1>
      @if (description()) {
        <p class="mt-1 text-sm text-muted-foreground">{{ description() }}</p>
      }
    </div>
    <div class="flex flex-wrap items-center gap-2"><ng-content /></div>
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
