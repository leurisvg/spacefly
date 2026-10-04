/**
 * "Go back to where I came from": the previous screen when it is inside the app, a fallback route
 * otherwise (deep link, reload). Web: history-aware; mobile: the native navigation stack.
 */
export abstract class BackNavigation {
  abstract readonly canGoBack: boolean;
  abstract back(fallback: string): void;
}
