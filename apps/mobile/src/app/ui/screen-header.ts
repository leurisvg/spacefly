import { Component, inject, input, NO_ERRORS_SCHEMA } from '@angular/core';
import { I18n } from '@spacefly/client/i18n/i18n';
import { EmptyState } from './empty-state';
import { PeriodBar } from './period-bar';

/**
 * The top of a report screen, below its ActionBar (NativeScript wants the ActionBar in the screen's own template): the period bar
 * when the report depends on the period, and a message when the load failed.
 */
@Component({
  selector: 'ns-screen-header',
  imports: [EmptyState, PeriodBar],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <StackLayout>
      @if (period()) {
        <ns-period-bar />
      }
      @if (error()) {
        <ns-empty [error]="true" [title]="i18n.t('errors.load')" />
      }
    </StackLayout>
  `,
})
export class ScreenHeader {
  protected readonly i18n = inject(I18n);
  /** Show the ‹ period › bar. */
  readonly period = input(true);
  /** The report failed to load and there is nothing to show. */
  readonly error = input(false);
}
