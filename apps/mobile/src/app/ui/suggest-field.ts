import { Component, computed, input, NO_ERRORS_SCHEMA, output, signal } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import { Utils } from '@nativescript/core';
import { suggestionsFor, type Suggestion } from '@spacefly/client/ui-logic/suggest';
import { FieldBox } from './field-box';
import { NsField } from './ns-field';

/**
 * A text field that offers `options` right under it while it has focus (the web combobox with `freeText`): typing narrows the
 * list, a tap on a row writes it into the field, and whatever is typed is a valid value. No sheet, no second tap to search.
 */
@Component({
  selector: 'ns-suggest-field',
  imports: [FieldBox, NsField],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ns-field-box [label]="label()" [required]="required()" [field]="field()">
      <TextField class="field" [hint]="hint()" [nsField]="field()" (focus)="onFocus()" (blur)="onBlur()" (textChange)="onText($any($event).value)"></TextField>
      @if (shown().length) {
        <StackLayout class="suggest-list">
          @for (o of shown(); track o.value) {
            <Label [text]="o.label" class="suggest-row" textWrap="true" (tap)="pick(o)"></Label>
          }
        </StackLayout>
      }
    </ns-field-box>
  `,
})
export class SuggestField {
  readonly label = input.required<string>();
  readonly required = input(false);
  readonly hint = input('');
  readonly field = input.required<FieldTree<string>>();
  readonly options = input.required<readonly Suggestion[]>();
  /** Every edit of the text, for a lookup that depends on it (earlier descriptions). */
  readonly typed = output<string>();

  private readonly focused = signal(false);
  protected readonly shown = computed(() => (this.focused() ? suggestionsFor(this.options(), this.field()().value()) : []));

  protected onFocus(): void {
    this.focused.set(true);
  }

  protected onBlur(): void {
    // A beat later, so a tap that started while the field had focus still reaches its row.
    setTimeout(() => this.focused.set(false), 200);
  }

  protected onText(text: string): void {
    this.typed.emit(text);
  }

  protected pick(option: Suggestion): void {
    this.field()().value.set(option.value);
    this.focused.set(false);
    Utils.dismissSoftInput();
  }
}
