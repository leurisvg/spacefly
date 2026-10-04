import { Injectable } from '@angular/core';
import { toast } from '@spartan-ng/brain/sonner';
import { Toast } from '@spacefly/client/platform/toast';

@Injectable()
export class WebToast extends Toast {
  override success(message: string): void {
    toast.success(message);
  }

  override error(message: string): void {
    toast.error(message);
  }
}
