import { Injectable } from '@angular/core';
import { Dialogs } from '@nativescript/core';
import { Confirm, type ConfirmOptions } from '@spacefly/client/platform/confirm';

const fold = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Native confirm dialog; when the action needs a typed confirmation (`requireText`) a prompt asks for it. */
@Injectable()
export class NsConfirm extends Confirm {
  override async confirm(options: ConfirmOptions): Promise<boolean> {
    const okButtonText = options.confirmLabel ?? 'OK';
    if (options.requireText) {
      const answer = await Dialogs.prompt({
        title: options.title,
        message: `${options.message}\n\n${options.requireText}`,
        okButtonText,
        cancelButtonText: '✕',
        defaultText: '',
      });
      return answer.result && fold(answer.text.trim()) === fold(options.requireText.trim());
    }
    return Dialogs.confirm({ title: options.title, message: options.message, okButtonText, cancelButtonText: '✕' });
  }
}
