import { afterNextRender, Directive, ElementRef, inject, input, output } from '@angular/core';

/**
 * What the side-panel forms share on the web: the record to edit, the event that closes the panel and focusing the first field.
 * Loading, saving and deleting live in the form's view-model (`libs/client/src/features/editor`).
 */
@Directive()
export abstract class EntityForm {
  /** The record to edit; `null` creates one. */
  readonly id = input<string | null>(null);
  /** Emitted after saving or deleting, and when cancelled. */
  readonly done = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>('input:not([type=hidden]), textarea')?.focus());
  }
}
