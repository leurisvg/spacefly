import { Component, computed, inject, input, NO_ERRORS_SCHEMA } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import { fieldErrorMessages } from '@spacefly/client/features/editor/field-errors';
import { I18n } from '@spacefly/client/i18n/i18n';

/**
 * An outlined form field: the control (projected, `class="field"`), its label over the top-left of the border, an optional icon
 * column at the left and the first error of the field underneath. The label rests inside the box and rises onto the border when
 * the box has focus or a value; with `alwaysFloat` (the default) it is always on the border.
 */
@Component({
  selector: 'ns-field-box',
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <StackLayout>
      <GridLayout [columns]="icon() ? '36, *' : '0, *'">
        @if (icon()) {
          <Label col="0" [text]="icon()" class="row-icon" isUserInteractionEnabled="false"></Label>
        }
        <GridLayout col="1">
          <StackLayout paddingTop="8">
            <ng-content></ng-content>
          </StackLayout>
          @if (text()) {
            @if (raised()) {
              <Label [text]="text()" class="float-label" [class.float-label-card]="surface() === 'card'" [class.float-label-on]="focused()" isUserInteractionEnabled="false"></Label>
            } @else {
              <Label [text]="text()" class="float-label-in" [class.float-label-in-compact]="compact()" isUserInteractionEnabled="false"></Label>
            }
          }
        </GridLayout>
      </GridLayout>
      <Label [text]="error()" class="field-error" [marginLeft]="icon() ? 36 : 0" [visibility]="error() ? 'visible' : 'collapse'" textWrap="true"></Label>
    </StackLayout>
  `,
})
export class FieldBox {
  private readonly i18n = inject(I18n);
  readonly label = input.required<string>();
  readonly required = input(false);
  /** The field whose errors are shown. */
  readonly field = input<FieldTree<unknown> | null>(null);
  /** The label stays on the border even when the box is empty and unfocused (the default); off, it rests inside the box. */
  readonly alwaysFloat = input(true);
  /** The control has focus. */
  readonly focused = input(false);
  /** The control has a value. */
  readonly filled = input(false);
  /** The color of what is behind the box, which the raised label paints over the border. */
  readonly surface = input<'background' | 'card'>('background');
  /** A glyph (see `ICON`) for the column at the left. */
  readonly icon = input('');
  /** The box is the tight one of the amount | date | time row. */
  readonly compact = input(false);

  protected readonly text = computed(() => (this.label() ? this.label() + (this.required() ? ' *' : '') : ''));
  protected readonly raised = computed(() => this.alwaysFloat() || this.focused() || this.filled());
  protected readonly error = computed(() => {
    const field = this.field();
    return field ? (fieldErrorMessages(this.i18n, field())[0] ?? '') : '';
  });
}
