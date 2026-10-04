import type { Signal } from '@angular/core';
import type { I18n } from '../../i18n/i18n';

/** The parts of a signal-form field state needed to show its errors. */
export interface ErrorState {
  errors: Signal<readonly { kind: string; message?: string }[]>;
  touched: Signal<boolean>;
}

/** The text of one validation error: the server's message, else `forms.errors.<kind>`, else the generic one. */
export function errorText(i18n: Pick<I18n, 't'>, e: { kind: string; message?: string }): string {
  if (e.message) return e.message;
  const key = `forms.errors.${e.kind}`;
  const translated = i18n.t(key);
  return translated === key ? i18n.t('forms.errors.invalid') : translated;
}

/** Errors to show for a field: the server's right away, the client's once the field has been touched. */
export function fieldErrorMessages(i18n: Pick<I18n, 't'>, state: ErrorState): string[] {
  return state
    .errors()
    .filter((e) => e.kind === 'server' || state.touched())
    .map((e) => errorText(i18n, e));
}
