import { Component, input, NO_ERRORS_SCHEMA, output } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import { FieldBox } from './field-box';
import { ICON } from './icons';

/**
 * An outlined box that shows a value and reacts to a tap (it opens a picker): the label sits inside while there is no value and
 * rises onto the border once there is one.
 */
@Component({
  selector: 'ns-tap-field',
  imports: [FieldBox],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ns-field-box [label]="label()" [required]="required()" [field]="field()" [icon]="icon()" [surface]="surface()" [compact]="compact()" [alwaysFloat]="false" [filled]="!!value()">
      <GridLayout>
        <Label
          [text]="value()"
          class="field"
          [class.field-compact]="compact()"
          [class.field-placeholder]="placeholder()"
          [paddingRight]="(compact() ? 8 : 12) + (chevron() ? 28 : 0)"
          [isEnabled]="!disabled()"
          (tap)="pressed.emit()"
        ></Label>
        @if (chevron()) {
          <Label [text]="chevronGlyph" class="field-end-icon" isUserInteractionEnabled="false"></Label>
        }
      </GridLayout>
    </ns-field-box>
  `,
})
export class TapField {
  readonly label = input.required<string>();
  readonly required = input(false);
  readonly value = input('');
  /** The value is a stand-in (nothing chosen): drawn muted. */
  readonly placeholder = input(false);
  readonly field = input<FieldTree<unknown> | null>(null);
  readonly icon = input('');
  readonly surface = input<'background' | 'card'>('background');
  readonly compact = input(false);
  readonly disabled = input(false);
  /** A drop-down arrow at the end of the box. */
  readonly chevron = input(false);
  readonly pressed = output<void>();

  protected readonly chevronGlyph = ICON.chevronDown;
}
