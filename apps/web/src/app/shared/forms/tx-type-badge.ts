import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { inferTransactionType, type AccountSlot } from '@spacefly/shared';
import { I18n } from '../../core/i18n/i18n';

/**
 * The transaction type, deduced live from the two accounts: expense, income or transfer; a hint while
 * an account is missing; a warning when the pair can't be combined. Announced to screen readers.
 */
@Component({
  selector: 'sf-tx-type-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <span
      role="status"
      aria-live="polite"
      class="inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-medium"
      [class]="tone()"
      >{{ label() }}</span
    >
  `,
})
export class TxTypeBadge {
  private readonly i18n = inject(I18n);
  readonly source = input<AccountSlot>(null);
  readonly destination = input<AccountSlot>(null);

  /** `pending` while an account is missing, `invalid` for a pair Firefly rejects. */
  readonly state = computed(() => {
    if (!this.source() || !this.destination()) return 'pending' as const;
    return inferTransactionType(this.source(), this.destination()) ?? ('invalid' as const);
  });
  protected readonly label = computed(() => {
    const s = this.state();
    return s === 'pending' ? this.i18n.t('forms.txType.pending') : s === 'invalid' ? this.i18n.t('forms.txType.invalid') : this.i18n.t(`txType.${s}`);
  });
  protected readonly tone = computed(() => {
    switch (this.state()) {
      case 'withdrawal':
        return 'border-negative/40 bg-negative/10 text-negative';
      case 'deposit':
        return 'border-positive/40 bg-positive/10 text-positive';
      case 'transfer':
        return 'border-primary/40 bg-primary/10 text-primary';
      case 'invalid':
        return 'border-status-warning/50 bg-status-warning/10 text-foreground';
      default:
        return 'border-border text-muted-foreground';
    }
  });
}
