import { computed, inject, signal, type Signal } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { I18n } from '../../i18n/i18n';

const KNOWN_ERRORS = ['invalid_state', 'token_exchange', 'access_denied', 'cf_access'];

/** The `login.errors.*` key for an error code the server (or the auth browser) reported. */
export const loginErrorKey = (code: string | undefined): string => (code && KNOWN_ERRORS.includes(code) ? code : 'generic');

/** Sign-in screen: the localized error to show and the sign-in action. */
export function loginViewModel(inputs: { returnTo: Signal<string | undefined>; error: Signal<string | undefined> }) {
  const auth = inject(AuthService);
  const i18n = inject(I18n);
  const busy = signal(false);

  return {
    i18n,
    busy,
    errorKey: computed(() => loginErrorKey(inputs.error())),

    /** Resolves `true` once signed in (mobile); on web the page navigates away and this resolves `false`. */
    async login(): Promise<boolean> {
      busy.set(true);
      try {
        return await auth.login(inputs.returnTo() || '/');
      } finally {
        busy.set(false);
      }
    },
  };
}
