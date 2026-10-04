import { Injectable, signal } from '@angular/core';
import { Toast } from '@spacefly/client/platform/toast';

export interface ToastMessage {
  id: number;
  kind: 'success' | 'error';
  message: string;
}

const VISIBLE_MS = 3500;

/** Messages are queued here and drawn by `ToastHost`, which sits on top of the app's pages. */
@Injectable()
export class NsToast extends Toast {
  private nextId = 1;
  readonly messages = signal<ToastMessage[]>([]);

  override success(message: string): void {
    this.show('success', message);
  }

  override error(message: string): void {
    this.show('error', message);
  }

  private show(kind: ToastMessage['kind'], message: string): void {
    const id = this.nextId++;
    this.messages.update((list) => [...list.slice(-2), { id, kind, message }]);
    setTimeout(() => this.messages.update((list) => list.filter((m) => m.id !== id)), VISIBLE_MS);
  }
}
