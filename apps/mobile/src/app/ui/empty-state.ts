import { Component, input, NO_ERRORS_SCHEMA } from '@angular/core';

@Component({
  selector: 'ns-empty',
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <StackLayout class="screen-pad">
      <Label [text]="title()" [class]="error() ? 'tone-negative' : 'muted'" horizontalAlignment="center" textWrap="true"></Label>
    </StackLayout>
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly error = input(false);
}
