/** How a platform signs in and out, and what happens when the session turns out to be invalid. */
export abstract class AuthPlatform {
  /**
   * Starts sign-in. Web leaves the page (`redirecting`: nothing else should run). Mobile runs the
   * PKCE flow in an auth browser and resolves `done` once it stored the token.
   */
  abstract login(returnTo: string): Promise<'redirecting' | 'done'>;
  /** Clean-up after the server dropped the session (clear the token, go to the login screen). */
  abstract afterLogout(): Promise<void> | void;
  /** A request answered 401: send the user to the login screen, remembering where they were. */
  abstract onUnauthorized(): void;
}
