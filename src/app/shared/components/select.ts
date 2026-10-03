import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';

export interface SelectOption {
  value: string;
  label: string;
}

/** Compact native select styled like spartan inputs (accessible, works on mobile pickers). */
@Component({
  selector: 'sf-select',
  imports: [NgIcon],
  providers: [provideIcons({ lucideChevronDown })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative inline-flex' },
  template: `
    <select
      class="h-8 w-full appearance-none rounded-md border border-input bg-background/40 pl-2.5 pr-8 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50"
      [attr.aria-label]="label()"
      [value]="value()"
      (change)="value.set($any($event.target).value)"
    >
      @if (placeholder()) {
        <option value="">{{ placeholder() }}</option>
      }
      @for (o of options(); track o.value) {
        <option [value]="o.value" [selected]="o.value === value()">{{ o.label }}</option>
      }
    </select>
    <ng-icon name="lucideChevronDown" class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
  `,
})
export class Select {
  readonly options = input.required<SelectOption[]>();
  readonly value = model<string>('');
  readonly placeholder = input<string | null>(null);
  readonly label = input('');
}
