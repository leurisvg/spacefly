import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { FxPart } from '@spacefly/shared';
import { HlmTooltip } from '@spartan-ng/helm/tooltip';
import { FormatService } from '../../core/format/format.service';

/**
 * An amount in the display currency. When it was converted, hovering shows the original
 * amounts and rates ("−50.00 USD → −RD$3,050.00 (×61.0000)"), like the email sub-lines.
 */
@Component({
  selector: 'sf-money',
  imports: [HlmTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'num inline-flex items-baseline gap-1', '[class]': 'toneClass()' },
  template: `
    @if (fxLines().length) {
      <span [hlmTooltip]="fxText()" class="cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-4">{{ text() }}</span>
    } @else {
      <span>{{ text() }}</span>
    }
  `,
})
export class Money {
  private readonly f = inject(FormatService);
  readonly value = input.required<number | null | undefined>();
  readonly currency = input<string | undefined>(undefined);
  readonly parts = input<FxPart[] | undefined | null>(undefined);
  /** Single original amount (transactions). */
  readonly original = input<{ amount: number; currency: string; rate: number } | null>(null);
  readonly signed = input(false);
  /** auto = green/red by sign; income/expense force a tone; none = default ink. */
  readonly tone = input<'auto' | 'income' | 'expense' | 'none'>('none');
  readonly compact = input(false);

  protected readonly text = computed(() =>
    this.compact() ? this.f.compact(this.value(), this.currency()) : this.f.money(this.value(), this.currency(), { signed: this.signed() }),
  );

  protected readonly fxLines = computed(() => {
    const parts = this.parts() ?? (this.original() ? [{ ...this.original()!, original: this.original()!.amount }] : []);
    const display = this.currency();
    return parts
      .filter((p) => p.currency !== (display ?? '') || parts.length > 1)
      .map((p) => {
        const original = this.f.hidden() ? 0 : p.original;
        const orig = `${original < 0 ? '−' : '+'}${this.f.amount(Math.abs(original))} ${p.currency}`;
        if (p.rate === 1) return orig;
        return `${orig} → ${this.f.money(p.original * p.rate, display, { signed: true })} (×${this.f.number(p.rate, 4)})`;
      });
  });
  protected readonly fxText = computed(() => this.fxLines().join('\n'));

  protected readonly toneClass = computed(() => {
    const t = this.tone();
    // Color would reveal the sign of a hidden amount.
    const v = this.f.hidden() ? 0 : (this.value() ?? 0);
    if (t === 'income' || (t === 'auto' && v > 0)) return 'text-positive';
    if (t === 'expense' || (t === 'auto' && v < 0)) return 'text-negative';
    return '';
  });
}
