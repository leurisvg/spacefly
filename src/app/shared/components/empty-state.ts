import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideInbox } from '@ng-icons/lucide';

@Component({
  selector: 'sf-empty',
  imports: [NgIcon],
  providers: [provideIcons({ lucideInbox, lucideCircleAlert })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col items-center justify-center gap-2 px-6 py-10 text-center' },
  template: `
    <ng-icon [name]="error() ? 'lucideCircleAlert' : 'lucideInbox'" class="text-3xl text-muted-foreground" />
    <p class="text-sm font-medium" [class.text-negative]="error()">{{ title() }}</p>
    @if (description()) {
      <p class="max-w-sm text-xs text-muted-foreground">{{ description() }}</p>
    }
    <ng-content />
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly error = input(false);
}
