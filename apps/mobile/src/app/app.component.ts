import { Component, inject, NO_ERRORS_SCHEMA } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { PageRouterOutlet, RouterExtensions } from '@nativescript/angular';
import { ActionBar, Frame, NavigationButton } from '@nativescript/core';
import { filter } from 'rxjs';
import { SheetHost } from './ui/sheet-host';
import { ToastHost } from './ui/toast-host';

/** The ActionBar class of the screens that are the bottom of the stack (home, login): they get no back arrow. */
const ROOT_BAR = 'root-bar';

@Component({
  selector: 'ns-app',
  imports: [PageRouterOutlet, SheetHost, ToastHost],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <GridLayout>
      <page-router-outlet />
      <ns-sheet-host />
      <ns-toast-host />
    </GridLayout>
  `,
})
export class AppComponent {
  private readonly nav = inject(RouterExtensions);
  private watched: Frame | undefined;

  constructor() {
    // Android never draws a back arrow by itself, so every screen but the roots gets one. It is set when the frame has finished
    // navigating to the page (`navigatedTo`), which is also when going back to a page that has none (iOS adds its own).
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        const frame = Frame.topmost();
        if (!frame || frame === this.watched) return;
        this.watched = frame;
        frame.on('navigatedTo', () => this.syncBackArrow(frame.currentPage?.actionBar));
      });
  }

  private syncBackArrow(bar: ActionBar | undefined): void {
    if (!bar) return;
    const isRoot = bar.cssClasses.has(ROOT_BAR);
    if (isRoot && bar.navigationButton) {
      bar.navigationButton = null as unknown as NavigationButton;
      bar.update();
    } else if (!isRoot && !bar.navigationButton) {
      const button = new NavigationButton();
      if (button.android) button.android.systemIcon = 'ic_menu_back';
      button.on('tap', () => this.nav.back());
      bar.navigationButton = button;
      bar.update();
    }
  }
}
