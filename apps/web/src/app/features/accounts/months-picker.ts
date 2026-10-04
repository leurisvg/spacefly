import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';

/** History length selector (6 / 12 / 24 / 36 months) for balance charts. */
@Component({
  selector: 'sf-months-picker',
  imports: [HlmToggleGroupImports, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-toggle-group type="single" variant="outline" size="sm" [value]="value()" [nullable]="false" (valueChange)="$event && changed.emit(+$event)" [attr.aria-label]="'accounts.history' | transloco">
      @for (m of options; track m) {
        <button hlmToggleGroupItem [value]="'' + m" class="px-2 text-xs">{{ m }}{{ 'accounts.monthsShort' | transloco }}</button>
      }
    </hlm-toggle-group>
  `,
})
export class MonthsPicker {
  readonly value = input.required<string>();
  readonly changed = output<number>();
  protected readonly options = [6, 12, 24, 36];
}
