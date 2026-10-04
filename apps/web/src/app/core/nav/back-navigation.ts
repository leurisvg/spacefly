import { Location } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';

/**
 * "Go back to where I came from": the browser's back when the previous page is inside the app,
 * a fallback route otherwise (opened from a bookmark, a shared link or a reload).
 */
@Injectable({ providedIn: 'root' })
export class BackNavigation {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  /** Entries of this app in the history stack, counting the one being shown. */
  private depth = 0;
  private currentId = 0;

  constructor() {
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationStart) {
        if (e.navigationTrigger === 'popstate' && e.restoredState) this.depth += e.restoredState.navigationId < this.currentId ? -1 : 1;
        else if (!this.router.currentNavigation()?.extras.replaceUrl) this.depth++;
      } else if (e instanceof NavigationEnd) {
        this.currentId = e.id;
      }
    });
  }

  get canGoBack(): boolean {
    return this.depth > 1;
  }

  back(fallback: string): void {
    if (this.canGoBack) this.location.back();
    else void this.router.navigateByUrl(fallback);
  }
}
