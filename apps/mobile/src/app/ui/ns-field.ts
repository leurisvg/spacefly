import { afterNextRender, Directive, effect, ElementRef, inject, input } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import { Switch, TextField, TextView, type View } from '@nativescript/core';

type Bound = FieldTree<string> | FieldTree<boolean>;

/**
 * Connects a NativeScript `TextField` / `TextView` / `Switch` to a signal-forms field: the control shows the field's value and
 * writes edits back, and the field is marked touched when the control loses focus. NativeScript views have no value
 * accessor, so this is what `[formField]` is on the web.
 */
@Directive({ selector: '[nsField]' })
export class NsField {
  readonly nsField = input.required<Bound>();
  private readonly view = inject<ElementRef<View>>(ElementRef).nativeElement;

  constructor() {
    // Field → control.
    effect(() => {
      const value = this.nsField()().value();
      const view = this.view;
      if (view instanceof Switch) {
        if (view.checked !== !!value) view.checked = !!value;
      } else if (view instanceof TextField || view instanceof TextView) {
        const text = String(value ?? '');
        if (view.text !== text) view.text = text;
      }
    });
    // Control → field (once the native view exists).
    afterNextRender(() => {
      const view = this.view;
      const write = (value: string | boolean) => {
        const state = this.nsField()();
        if (state.value() !== value) (state.value as { set(v: string | boolean): void }).set(value);
      };
      if (view instanceof Switch) {
        view.on('checkedChange', (args) => write((args.object as Switch).checked));
      } else if (view instanceof TextField || view instanceof TextView) {
        view.on('textChange', (args) => write((args.object as TextField).text ?? ''));
        view.on('blur', () => this.nsField()().markAsTouched());
      }
    });
  }
}
