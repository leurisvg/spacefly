import { Component, computed, inject, input, NO_ERRORS_SCHEMA } from '@angular/core';
import { FormatService } from '@spacefly/client/format/format.service';
import type { Tone } from '@spacefly/client/ui-logic/delta';

export type MoneyTone = 'income' | 'expense' | 'auto' | 'none';

/** The CSS class of a semantic tone (see app.css). */
export const toneClass = (tone: Tone): string => `tone-${tone}`;

/** An amount in the display currency; `income`/`expense` fix the tone, `auto` follows the sign. Respects privacy mode (via `FormatService`). */
@Component({
  selector: 'ns-money',
  schemas: [NO_ERRORS_SCHEMA],
  template: `<Label [text]="text()" [class]="cls()" textWrap="false"></Label>`,
})
export class Money {
  private readonly f = inject(FormatService);
  readonly value = input<number | null>(null);
  readonly currency = input<string | undefined>(undefined);
  readonly signed = input(false);
  readonly tone = input<MoneyTone>('none');

  protected readonly text = computed(() => this.f.money(this.value(), this.currency(), { signed: this.signed() }));
  protected readonly cls = computed(() => {
    const tone = this.tone();
    const v = this.value() ?? 0;
    const semantic: Tone = tone === 'income' ? 'positive' : tone === 'expense' ? 'negative' : tone === 'auto' ? (v > 0 ? 'positive' : v < 0 ? 'negative' : 'neutral') : 'neutral';
    return `money ${tone === 'none' ? '' : toneClass(semantic)}`;
  });
}
