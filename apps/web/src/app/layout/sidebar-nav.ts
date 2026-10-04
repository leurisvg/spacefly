import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideRocket } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmSidebarImports, HlmSidebarService } from '@spartan-ng/helm/sidebar';
import { NAV, NAV_ICONS } from './nav';

const COLLAPSED_KEY = 'spacefly.nav.collapsed';

@Component({
  selector: 'sf-sidebar-nav',
  imports: [RouterLink, RouterLinkActive, NgIcon, TranslocoPipe, HlmSidebarImports],
  providers: [provideIcons({ ...NAV_ICONS, lucideChevronDown, lucideRocket })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-sidebar collapsible="icon" [srOnlySheetTitle]="'nav.menu' | transloco">
      <hlm-sidebar-header>
        <a routerLink="/" class="flex h-10 items-center gap-2 rounded-md px-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0" (click)="closeMobile()">
          <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
            <ng-icon name="lucideRocket" class="text-base" />
          </span>
          <span class="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span class="text-sm font-semibold tracking-tight">SpaceFly</span>
            <span class="text-[11px] text-muted-foreground">Firefly III · {{ 'nav.readOnly' | transloco }}</span>
          </span>
        </a>
      </hlm-sidebar-header>
      <hlm-sidebar-content>
        @for (section of nav; track section.key) {
          <hlm-sidebar-group class="py-1">
            @if (section.items.length > 1) {
              <button hlmSidebarGroupLabel class="w-full justify-between" (click)="toggle(section.key)" [attr.aria-expanded]="!collapsed().has(section.key)">
                <span>{{ 'nav.sections.' + section.key | transloco }}</span>
                <ng-icon name="lucideChevronDown" class="transition-transform" [class.-rotate-90]="collapsed().has(section.key)" />
              </button>
            } @else {
              <div hlmSidebarGroupLabel>{{ 'nav.sections.' + section.key | transloco }}</div>
            }
            @if (!collapsed().has(section.key) || sidebar.state() === 'collapsed') {
              <div hlmSidebarGroupContent>
                <ul hlmSidebarMenu>
                  @for (item of section.items; track item.key) {
                    <li hlmSidebarMenuItem>
                      <a
                        hlmSidebarMenuButton
                        [routerLink]="item.path"
                        routerLinkActive
                        ariaCurrentWhenActive="page"
                        #rla="routerLinkActive"
                        [routerLinkActiveOptions]="{ paths: 'exact', queryParams: 'ignored', fragment: 'ignored', matrixParams: 'ignored' }"
                        [isActive]="rla.isActive"
                        [tooltip]="'nav.' + item.key | transloco"
                        queryParamsHandling="preserve"
                        (click)="closeMobile()"
                      >
                        <ng-icon [name]="item.icon" />
                        <span>{{ 'nav.' + item.key | transloco }}</span>
                      </a>
                    </li>
                  }
                </ul>
              </div>
            }
          </hlm-sidebar-group>
        }
      </hlm-sidebar-content>
      <button hlmSidebarRail [attr.aria-label]="'nav.toggle' | transloco"></button>
    </hlm-sidebar>
  `,
})
export class SidebarNav {
  protected readonly sidebar = inject(HlmSidebarService);
  protected readonly nav = NAV;
  protected readonly collapsed = signal<Set<string>>(new Set(JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '[]') as string[]));

  protected toggle(key: string): void {
    const next = new Set(this.collapsed());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.collapsed.set(next);
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next]));
  }

  protected closeMobile(): void {
    this.sidebar.setOpenMobile(false);
  }
}
