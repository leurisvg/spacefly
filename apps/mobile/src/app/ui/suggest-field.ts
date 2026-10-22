import { Component, computed, input, NO_ERRORS_SCHEMA, output, signal } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import { Utils } from '@nativescript/core';
import { suggestionsFor, type Suggestion } from '@spacefly/client/ui-logic/suggest';
import { NsTextField } from './text-field';

/**
 * A text field that offers `options` right under it while it has focus (the web combobox with `freeText`): typing narrows the
 * list, a tap on a row writes it into the field, and whatever is typed is a valid value. No sheet, no second tap to search.
 */
@Component({
  selector: 'ns-suggest-field',
  imports: [NsTextField],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <StackLayout>
      <ns-text-field
        [label]="label()"
        [required]="required()"
        [hint]="hint()"
        [field]="field()"
        [icon]="icon()"
        [surface]="surface()"
        (focusChange)="onFocusChange($event)"
        (typed)="typed.emit($event)"
      />
      @if (shown().length) {
        <StackLayout class="suggest-list" [marginLeft]="icon() ? 36 : 0">
          @for (o of shown(); track o.value) {
            <Label [text]="o.label" class="suggest-row" textWrap="true" (tap)="pick(o)"></Label>
          }
        </StackLayout>
      }
    </StackLayout>
  `,
})
export class SuggestField {
  readonly label = input.required<string>();
  readonly required = input(false);
  readonly hint = input('');
  readonly icon = input('');
  readonly surface = input<'background' | 'card'>('background');
  readonly field = input.required<FieldTree<string>>();
  readonly options = input.required<readonly Suggestion[]>();
  /** Every edit of the text, for a lookup that depends on it (earlier descriptions). */
  readonly typed = output<string>();

  private readonly focused = signal(false);
  protected readonly shown = computed(() => (this.focused() ? suggestionsFor(this.options(), this.field()().value()) : []));

  protected onFocusChange(focused: boolean): void {
    if (focused) {
      this.focused.set(true);
    } else {
      // A beat later, so a tap that started while the field had focus still reaches its row.
      setTimeout(() => this.focused.set(false), 200);
    }
  }

  protected pick(option: Suggestion): void {
    this.field()().value.set(option.value);
    this.focused.set(false);
    Utils.dismissSoftInput();
  }
}
