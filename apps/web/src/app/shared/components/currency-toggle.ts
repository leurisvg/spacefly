import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { FiltersStore } from '@spacefly/client/state/filters.store';
import { MetaStore } from '@spacefly/client/state/meta.store';

/** RD$ / US$ — every amount in the app is re-expressed in the chosen currency. */
@Component({
  selector: 'sf-currency-toggle',
  imports: [HlmToggleGroupImports, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-toggle-group
      type="single"
      variant="outline"
      size="sm"
      [value]="filters.currency()"
      [nullable]="false"
      (valueChange)="$event && filters.setCurrency($any($event))"
      [attr.aria-label]="'currency.label' | transloco"
    >
      @for (c of meta.currencies(); track c.code) {
        <button hlmToggleGroupItem [value]="c.code" class="px-2.5 font-mono text-xs" [attr.aria-label]="c.name">{{ c.symbol }}</button>
      }
    </hlm-toggle-group>
  `,
})
export class CurrencyToggle {
  protected readonly filters = inject(FiltersStore);
  protected readonly meta = inject(MetaStore);
}
