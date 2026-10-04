import { AndroidApplication, Application, Utils } from '@nativescript/core';

export class AuthBrowserCancelled extends Error {
  constructor() {
    super('auth_cancelled');
  }
}

declare const androidx: any;
declare const android: any;

/** Custom Tabs can't tell us the user closed the tab; if the app comes back without a callback this long after, it was cancelled. */
const CANCEL_GRACE_MS = 1500;

export function openAuthBrowser(url: string, callbackScheme: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let settled = false;
    let cancelTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(cancelTimer);
      clearTimeout(armTimer);
      Application.android.off(AndroidApplication.activityNewIntentEvent, onIntent);
      Application.off(Application.resumeEvent, onResume);
      action();
    };

    const onIntent = (args: { intent: android.content.Intent }) => {
      const data = args.intent?.getData();
      if (data && data.getScheme() === callbackScheme) finish(() => resolve(String(data.toString())));
    };
    const onResume = () => {
      cancelTimer = setTimeout(() => finish(() => reject(new AuthBrowserCancelled())), CANCEL_GRACE_MS);
    };

    Application.android.on(AndroidApplication.activityNewIntentEvent, onIntent);
    // The resume that happens while the tab is still opening must not count as "came back": arm the cancel clock a bit later.
    const armTimer = setTimeout(() => Application.on(Application.resumeEvent, onResume), 800);

    try {
      const activity = Application.android.foregroundActivity ?? Application.android.startActivity;
      const intent = new androidx.browser.customtabs.CustomTabsIntent.Builder().build();
      intent.launchUrl(activity ?? Utils.android.getApplicationContext(), android.net.Uri.parse(url));
    } catch (error) {
      finish(() => reject(error));
    }
  });
}
