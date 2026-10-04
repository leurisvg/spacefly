import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { PageRouterOutlet } from '@nativescript/angular';
import { ToastHost } from './ui/toast-host';

@Component({
  selector: 'ns-app',
  imports: [PageRouterOutlet, ToastHost],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <GridLayout>
      <page-router-outlet />
      <ns-toast-host />
    </GridLayout>
  `,
})
export class AppComponent {}
