import { Application } from '@nativescript/core';

export class AuthBrowserCancelled extends Error {
  constructor() {
    super('auth_cancelled');
  }
}

// ASWebAuthenticationSessionErrorCode.CanceledLogin (an ambient const enum, which isolatedModules cannot read).
const CANCELED_LOGIN = 1;

@NativeClass()
class PresentationContext extends NSObject implements ASWebAuthenticationPresentationContextProviding {
  static ObjCProtocols = [ASWebAuthenticationPresentationContextProviding];

  presentationAnchorForWebAuthenticationSession(): UIWindow {
    return Application.ios.window ?? UIApplication.sharedApplication.keyWindow;
  }
}

// Kept alive for the duration of the session: the system only holds weak references.
const alive = new Set<unknown>();

export function openAuthBrowser(url: string, callbackScheme: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const session = ASWebAuthenticationSession.alloc().initWithURLCallbackURLSchemeCompletionHandler(NSURL.URLWithString(url), callbackScheme, (callback, error) => {
      alive.clear();
      if (callback) resolve(callback.absoluteString ?? '');
      else if (error && error.code === CANCELED_LOGIN) reject(new AuthBrowserCancelled());
      else reject(new Error(error?.localizedDescription ?? 'auth_failed'));
    });
    const context = new PresentationContext();
    session.presentationContextProvider = context;
    // Not ephemeral: the browser keeps the Cloudflare Access / Firefly login, so the next sign-in is one tap.
    session.prefersEphemeralWebBrowserSession = false;
    alive.add(session).add(context);
    if (!session.start()) {
      alive.clear();
      reject(new Error('auth_failed'));
    }
  });
}
