import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { MetaStore } from '../core/state/meta.store';
import { TxDetailSheet } from '../shared/components/tx-detail-sheet';
import { SidebarNav } from './sidebar-nav';
import { Topbar } from './topbar';

@Component({
  selector: 'sf-shell',
  imports: [RouterOutlet, TranslocoPipe, HlmSidebarImports, SidebarNav, Topbar, TxDetailSheet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div hlmSidebarWrapper>
      <sf-sidebar-nav />
      <main hlmSidebarInset class="min-w-0 bg-background">
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
  `,
})
export class Shell {
  protected readonly meta = inject(MetaStore);
}
