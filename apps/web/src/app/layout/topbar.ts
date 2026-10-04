import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideExternalLink, lucideEye, lucideEyeOff, lucideLanguages, lucideLogOut, lucideRefreshCw, lucideUser } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmBreadcrumbImports } from '@spartan-ng/helm/breadcrumb';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { HlmTooltip } from '@spartan-ng/helm/tooltip';
import { preferencesViewModel } from '@spacefly/client/features/settings/preferences.vm';
import type { Lang } from '@spacefly/client/i18n/lang';
import { CurrencyToggle } from '../shared/components/currency-toggle';
import { PeriodPicker } from '../shared/components/period-picker';
import { findNav, isEditorRoute } from './nav';
import { NewMenu } from './new-menu';

@Component({
  selector: 'sf-topbar',
  imports: [
    NgIcon,
    TranslocoPipe,
    HlmBreadcrumbImports,
    HlmButton,
    HlmDropdownMenuImports,
    HlmSidebarImports,
    HlmTooltip,
    PeriodPicker,
    CurrencyToggle,
    NewMenu,
  ],
  providers: [provideIcons({ lucideRefreshCw, lucideLanguages, lucideLogOut, lucideUser, lucideExternalLink, lucideEye, lucideEyeOff })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'sticky top-0 z-20 flex flex-col gap-2 border-b border-border bg-background/85 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-5',
  },
  template: `
    <div class="flex items-center gap-2">
      <button hlmSidebarTrigger [srOnlyText]="'nav.toggle' | transloco"></button>
      <nav hlmBreadcrumb class="min-w-0 flex-1" [attr.aria-label]="'nav.breadcrumb' | transloco">
        <ol hlmBreadcrumbList class="flex-nowrap">
          @if (crumb(); as c) {
            <li hlmBreadcrumbItem class="hidden sm:inline-flex">{{ 'nav.sections.' + c.section | transloco }}</li>
            <li hlmBreadcrumbSeparator class="hidden sm:inline-flex"></li>
            <li hlmBreadcrumbItem class="min-w-0"><span hlmBreadcrumbPage class="truncate">{{ 'nav.' + c.item | transloco }}</span></li>
          }
        </ol>
      </nav>
      <div class="hidden items-center gap-2 md:flex">
        @if (showPeriod()) {
          <sf-period-picker />
        }
        <sf-currency-toggle />
      </div>
      <sf-new-menu />
      <button
        hlmBtn
        variant="ghost"
        size="icon-sm"
        [hlmTooltip]="(vm.privacy.hidden() ? 'topbar.showAmounts' : 'topbar.hideAmounts') | transloco"
        [attr.aria-label]="(vm.privacy.hidden() ? 'topbar.showAmounts' : 'topbar.hideAmounts') | transloco"
        [attr.aria-pressed]="vm.privacy.hidden()"
        (click)="vm.privacy.toggle()"
      >
        <ng-icon [name]="vm.privacy.hidden() ? 'lucideEyeOff' : 'lucideEye'" />
      </button>
      <button
        hlmBtn
        variant="ghost"
        size="icon-sm"
        [hlmTooltip]="'topbar.refresh' | transloco"
        [attr.aria-label]="'topbar.refresh' | transloco"
        [disabled]="vm.refreshing()"
        (click)="vm.refresh()"
      >
        <ng-icon name="lucideRefreshCw" [class.animate-spin]="vm.refreshing()" />
      </button>
      <button hlmBtn variant="ghost" size="icon-sm" [hlmDropdownMenuTrigger]="langMenu" [attr.aria-label]="'topbar.language' | transloco">
        <ng-icon name="lucideLanguages" />
      </button>
      <ng-template #langMenu>
        <hlm-dropdown-menu class="w-40">
          @for (l of vm.langs; track l) {
            <button hlmDropdownMenuItem (triggered)="setLang(l)">
              <span class="flex-1">{{ 'lang.' + l | transloco }}</span>
              @if (vm.lang() === l) {
                <span class="text-primary">●</span>
              }
            </button>
          }
        </hlm-dropdown-menu>
      </ng-template>
      <button hlmBtn variant="ghost" size="icon-sm" [hlmDropdownMenuTrigger]="userMenu" align="end" [attr.aria-label]="'topbar.account' | transloco">
        <ng-icon name="lucideUser" />
      </button>
      <ng-template #userMenu>
        <hlm-dropdown-menu class="w-60">
          <hlm-dropdown-menu-label class="truncate text-xs font-normal text-muted-foreground">{{ vm.email() }}</hlm-dropdown-menu-label>
          <hlm-dropdown-menu-separator />
          @if (vm.fireflyUrl(); as url) {
            <a hlmDropdownMenuItem [href]="url" target="_blank" rel="noopener">
              <ng-icon name="lucideExternalLink" />{{ 'topbar.openFirefly' | transloco }}
            </a>
          }
          <button hlmDropdownMenuItem (triggered)="vm.logout()"><ng-icon name="lucideLogOut" />{{ 'topbar.logout' | transloco }}</button>
        </hlm-dropdown-menu>
      </ng-template>
    </div>
    <div class="flex flex-wrap items-center gap-2 md:hidden">
      @if (showPeriod()) {
        <sf-period-picker class="flex-1" />
      }
      <sf-currency-toggle />
    </div>
  `,
})
export class Topbar {
  private readonly router = inject(Router);
  protected readonly vm = preferencesViewModel();

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );
  protected readonly crumb = computed(() => {
    const hit = findNav(this.url());
    return hit ? { section: hit.section.key, item: hit.item.key } : null;
  });
  /** Pages that don't depend on the period hide the picker. */
  protected readonly showPeriod = computed(() => {
    const path = this.url().split('?')[0];
    if (isEditorRoute(path)) return false;
    return !['/planning/recurring', '/planning/goals', '/planning/projection', '/settings', '/about', '/accounts/net-worth'].includes(path);
  });

  protected setLang(lang: Lang): void {
    this.vm.setLang(lang);
    document.documentElement.lang = lang;
  }
}
