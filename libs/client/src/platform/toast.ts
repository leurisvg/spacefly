/** Transient feedback message. Web: sonner. Mobile: a toast host component. */
export abstract class Toast {
  abstract success(message: string): void;
  abstract error(message: string): void;
}
