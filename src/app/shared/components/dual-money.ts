import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FiltersStore } from '../../core/state/filters.store';
import { Money } from './money';

/**
 * An amount of an account kept in a foreign currency: the original value as the main figure and
 * its conversion to the display currency smaller underneath. In the display currency it is just one figure.
 */
@Component({
  selector: 'sf-dual-money',
  imports: [Money],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex flex-col leading-tight', '[class.items-end]': "align() === 'end'" },
  template: `
    @if (foreign()) {
      <sf-money [value]="original()" [currency]="currency()" [signed]="signed()" [tone]="tone()" />
      <sf-money [value]="converted()" [signed]="signed()" class="text-[11px] text-muted-foreground" />
    } @else {
      <sf-money [value]="converted()" [signed]="signed()" [tone]="tone()" />
    }
  `,
})
export class DualMoney {
  private readonly filters = inject(FiltersStore);
  /** Amount in the account's own currency. */
  readonly original = input.required<number>();
  /** The same amount in the display currency. */
  readonly converted = input.required<number>();
  /** Currency of `original`. */
  readonly currency = input.required<string>();
  readonly signed = input(false);
  readonly tone = input<'auto' | 'income' | 'expense' | 'none'>('none');
  readonly align = input<'start' | 'end'>('end');
  protected readonly foreign = computed(() => this.currency() !== this.filters.currency());
}
