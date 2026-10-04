import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, model, output, signal, untracked, viewChild } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { parseAmount } from '@shared';
import { HlmInput } from '@spartan-ng/helm/input';
import { FormatService } from '../../core/format/format.service';
import { MetaStore } from '../../core/state/meta.store';

/**
 * Amount field. The model is a canonical decimal string ("1234.5", "" when empty) so the digits typed
 * reach Firefly untouched. While editing you see what you typed; on blur it is formatted for the
 * language (grouping, fixed decimals). In privacy mode the value is blurred unless the field has focus.
 */
@Component({
  selector: 'sf-money-input',
  imports: [HlmInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <div class="relative flex items-center">
      <span class="pointer-events-none absolute left-2.5 text-sm text-muted-foreground" aria-hidden="true">{{ symbol() }}</span>
      <input
        #input
        hlmInput
        type="text"
        inputmode="decimal"
        autocomplete="off"
        class="num text-right"
        [style.padding-left.rem]="paddingLeft()"
        [class.blur-sm]="masked()"
        [class.select-none]="masked()"
        [value]="text()"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [attr.aria-invalid]="invalid() || null"
        [attr.aria-label]="ariaLabel() || null"
        (input)="onInput($any($event.target).value)"
        (focus)="onFocus()"
        (blur)="onBlur()"
      />
    </div>
  `,
})
export class MoneyInput implements FormValueControl<string> {
  private readonly format = inject(FormatService);
  private readonly meta = inject(MetaStore);

  readonly value = model('');
  /** ISO code of the currency: picks the symbol and the number of decimals. */
  readonly currency = input<string | null>(null);
  readonly placeholder = input('0.00');
  readonly ariaLabel = input('');
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly touched = input(false);
  readonly touch = output<void>();

  private readonly inputEl = viewChild<ElementRef<HTMLInputElement>>('input');
  protected readonly text = signal('');
  private readonly focused = signal(false);

  protected readonly symbol = computed(() => this.format.symbol(this.currency() ?? undefined));
  protected readonly paddingLeft = computed(() => 0.9 + this.symbol().length * 0.55);
  protected readonly masked = computed(() => this.format.hidden() && !this.focused());
  private readonly decimals = computed(() => this.meta.currencies().find((c) => c.code === this.currency())?.decimals ?? 2);
  protected readonly decimalMark = computed<'.' | ','>(() => {
    const part = new Intl.NumberFormat(this.format.locale()).formatToParts(1.1).find((p) => p.type === 'decimal');
    return part?.value === ',' ? ',' : '.';
  });

  constructor() {
    // Keep the text in sync when the model changes from outside (form reset, loaded transaction…).
    effect(() => {
      const v = this.value();
      this.decimalMark();
      this.format.locale();
      if (!untracked(this.focused)) this.text.set(this.display(v));
    });
  }

  protected onInput(raw: string): void {
    this.text.set(raw);
    const trimmed = raw.trim();
    // Anything that isn't a number stays in the model as typed, so validation can flag it.
    this.value.set(trimmed === '' ? '' : (parseAmount(trimmed, this.decimalMark()) ?? trimmed));
  }

  protected onFocus(): void {
    this.focused.set(true);
    const v = this.value();
    if (/^-?\d+(\.\d+)?$/.test(v)) this.text.set(v.replace('.', this.decimalMark()));
    queueMicrotask(() => this.inputEl()?.nativeElement.select());
  }

  protected onBlur(): void {
    this.focused.set(false);
    this.text.set(this.display(this.value()));
    this.touch.emit();
  }

  focus(options?: FocusOptions): void {
    this.inputEl()?.nativeElement.focus(options);
  }

  /** "1234.5" → "1,234.50" (language-aware); anything unparsable is shown as typed. */
  private display(v: string): string {
    if (!/^-?\d+(\.\d+)?$/.test(v)) return v;
    const fraction = v.split('.')[1]?.length ?? 0;
    const digits = Math.min(Math.max(this.decimals(), fraction), 8);
    return new Intl.NumberFormat(this.format.locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(v));
  }
}
