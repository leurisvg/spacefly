import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { MetaStore } from '@spacefly/client/state/meta.store';
import { EntityEditorSheet } from '../features/editor/entity-editor-sheet';
import { EntityEditor } from '@spacefly/client/state/entity-editor.service';
import { TxDetailSheet } from '../shared/components/tx-detail-sheet';
import { SidebarNav } from './sidebar-nav';
import { Topbar } from './topbar';

@Component({
  selector: 'sf-shell',
  imports: [RouterOutlet, TranslocoPipe, HlmSidebarImports, SidebarNav, Topbar, TxDetailSheet, EntityEditorSheet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      href="#main-content"
      class="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      (click)="focusMain($event)"
    >
      {{ 'nav.skipToContent' | transloco }}
    </a>
    <div hlmSidebarWrapper>
      <sf-sidebar-nav />
      <main id="main-content" tabindex="-1" hlmSidebarInset class="min-w-0 bg-background outline-none">
        <sf-topbar />
        @if (meta.meta(); as m) {
          @if (!m.fireflyVersionOk) {
            <div class="mx-3 mt-3 rounded-lg border border-status-warning/40 bg-status-warning/10 px-4 py-2 text-sm sm:mx-5" role="alert">
              {{ 'errors.version' | transloco: { version: m.fireflyVersion, min: m.minFireflyVersion } }}
            </div>
          }
        }
        <div class="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-5 sm:py-6">
          <router-outlet />
        </div>
      </main>
    </div>
    <sf-tx-detail-sheet />
    <!-- The editors are heavy and rarely needed: load them the first time one is opened. -->
    @defer (when editor.request() !== null) {
      <sf-entity-editor-sheet />
    }
  `,
})
export class Shell {
  protected readonly meta = inject(MetaStore);
  protected readonly editor = inject(EntityEditor);

  /** Moves focus to <main> without changing the URL (the router owns the hash). */
  protected focusMain(event: Event): void {
    event.preventDefault();
    document.getElementById('main-content')?.focus();
  }
}
