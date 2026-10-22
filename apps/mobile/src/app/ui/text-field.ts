import { Component, computed, input, NO_ERRORS_SCHEMA, output, signal } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import { FieldBox } from './field-box';
import { ICON } from './icons';
import { NsField } from './ns-field';

/**
 * An outlined text box bound to a signal-forms field: the label rests inside the box and rises onto the border when the box has
 * focus or a value, and a ✕ clears what is typed. `multiline` makes it a `TextView`.
 */
@Component({
  selector: 'ns-text-field',
  imports: [FieldBox, NsField],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ns-field-box [label]="label()" [required]="required()" [field]="field()" [icon]="icon()" [surface]="surface()" [compact]="compact()" [alwaysFloat]="false" [focused]="focused()" [filled]="filled()">
      @if (multiline()) {
        <TextView class="field" [height]="height()" [hint]="raised() ? hint() : ''" [nsField]="field()" (focus)="onFocus()" (blur)="onBlur()"></TextView>
      } @else {
        <GridLayout>
          <TextField
            class="field"
            [class.field-compact]="compact()"
            [class.field-end]="showClear()"
            [hint]="raised() ? hint() : ''"
            [keyboardType]="keyboardType()"
            [nsField]="field()"
            (focus)="onFocus()"
            (blur)="onBlur()"
            (textChange)="typed.emit($any($event).value)"
          ></TextField>
          @if (showClear()) {
            <Label [text]="clearGlyph" class="field-end-icon" (tap)="clear()"></Label>
          }
        </GridLayout>
      }
    </ns-field-box>
  `,
})
export class NsTextField {
  readonly label = input.required<string>();
  readonly required = input(false);
  readonly hint = input('');
  readonly field = input.required<FieldTree<string> | FieldTree<number>>();
  readonly keyboardType = input<'number' | 'url' | 'email' | undefined>(undefined);
  readonly multiline = input(false);
  readonly height = input(120);
  readonly icon = input('');
  readonly surface = input<'background' | 'card'>('background');
  readonly compact = input(false);
  /** Every edit of the text. */
  readonly typed = output<string>();
  /** The box gained (`true`) or lost (`false`) focus. */
  readonly focusChange = output<boolean>();

  protected readonly focused = signal(false);
  protected readonly clearGlyph = ICON.clear;
  protected readonly filled = computed(() => {
    const value: unknown = this.field()().value();
    return value !== '' && value != null && !(typeof value === 'number' && Number.isNaN(value));
  });
  protected readonly raised = computed(() => this.focused() || this.filled());
  protected readonly showClear = computed(() => this.focused() && this.filled());

  protected onFocus(): void {
    this.focused.set(true);
    this.focusChange.emit(true);
  }

  protected onBlur(): void {
    this.focused.set(false);
    this.focusChange.emit(false);
  }

  protected clear(): void {
    const value = this.field()().value as { set(v: string | number): void };
    value.set(typeof this.field()().value() === 'number' ? NaN : '');
  }
}
