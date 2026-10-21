import { Component, input, NO_ERRORS_SCHEMA, output } from '@angular/core';

export interface SegmentOption {
  value: string;
  label: string;
}

/** A row of chips to switch a view or a type (the `chip` / `chip-on` look of Settings). */
@Component({
  selector: 'ns-segmented',
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ScrollView orientation="horizontal">
      <StackLayout orientation="horizontal">
        @for (o of options(); track o.value) {
          <Label [text]="o.label" class="chip" [class.chip-on]="o.value === value()" (tap)="valueChange.emit(o.value)"></Label>
        }
      </StackLayout>
    </ScrollView>
  `,
})
export class Segmented {
  readonly options = input.required<readonly SegmentOption[]>();
  readonly value = input.required<string>();
  readonly valueChange = output<string>();
}
