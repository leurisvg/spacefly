/**
 * Opens `url` in the system browser (ASWebAuthenticationSession on iOS, Chrome Custom Tabs on Android) and resolves with
 * the URL the browser was redirected to (`spacefly://auth/callback?…`), or rejects with `AuthBrowserCancelled`.
 * Implemented per platform in auth-browser.ios.ts / auth-browser.android.ts.
 */
export declare function openAuthBrowser(url: string, callbackScheme: string): Promise<string>;

export declare class AuthBrowserCancelled extends Error {}
