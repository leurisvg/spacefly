export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  /** Styles the confirm button as destructive (deletes). */
  destructive?: boolean;
  /** Makes the user type this text (an account's name) before the button enables. */
  requireText?: string;
}

/** Promise-based confirmation. Resolves `false` on cancel or dismiss. */
export abstract class Confirm {
  abstract confirm(options: ConfirmOptions): Promise<boolean>;
}
