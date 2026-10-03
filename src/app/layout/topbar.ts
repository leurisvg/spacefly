import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideExternalLink, lucideEye, lucideEyeOff, lucideLanguages, lucideLogOut, lucideRefreshCw, lucideUser } from '@ng-icons/lucide';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmBreadcrumbImports } from '@spartan-ng/helm/breadcrumb';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { HlmTooltip } from '@spartan-ng/helm/tooltip';
import { ApiService } from '../core/api/report-resource';
import { AuthService } from '../core/auth/auth.service';
import { LANG_KEY, LANGS, type Lang } from '../core/i18n/transloco-loader';
import { MetaStore } from '../core/state/meta.store';
import { PrivacyStore } from '../core/state/privacy.store';
import { CurrencyToggle } from '../shared/components/currency-toggle';
import { PeriodPicker } from '../shared/components/period-picker';
import { findNav } from './nav';

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
      <button
        hlmBtn
        variant="ghost"
        size="icon-sm"
        [hlmTooltip]="(privacy.hidden() ? 'topbar.showAmounts' : 'topbar.hideAmounts') | transloco"
        [attr.aria-label]="(privacy.hidden() ? 'topbar.showAmounts' : 'topbar.hideAmounts') | transloco"
        [attr.aria-pressed]="privacy.hidden()"
        (click)="privacy.toggle()"
      >
        <ng-icon [name]="privacy.hidden() ? 'lucideEyeOff' : 'lucideEye'" />
      </button>
      <button
        hlmBtn
        variant="ghost"
        size="icon-sm"
        [hlmTooltip]="'topbar.refresh' | transloco"
        [attr.aria-label]="'topbar.refresh' | transloco"
        [disabled]="refreshing()"
        (click)="refresh()"
      >
        <ng-icon name="lucideRefreshCw" [class.animate-spin]="refreshing()" />
      </button>
      <button hlmBtn variant="ghost" size="icon-sm" [hlmDropdownMenuTrigger]="langMenu" [attr.aria-label]="'topbar.language' | transloco">
        <ng-icon name="lucideLanguages" />
      </button>
      <ng-template #langMenu>
        <hlm-dropdown-menu class="w-40">
          @for (l of langs; track l) {
            <button hlmDropdownMenuItem (triggered)="setLang(l)">
              <span class="flex-1">{{ 'lang.' + l | transloco }}</span>
              @if (lang() === l) {
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
          <hlm-dropdown-menu-label class="truncate text-xs font-normal text-muted-foreground">{{ email() }}</hlm-dropdown-menu-label>
          <hlm-dropdown-menu-separator />
          @if (fireflyUrl(); as url) {
            <a hlmDropdownMenuItem [href]="url" target="_blank" rel="noopener">
              <ng-icon name="lucideExternalLink" />{{ 'topbar.openFirefly' | transloco }}
            </a>
          }
          <button hlmDropdownMenuItem (triggered)="auth.logout()"><ng-icon name="lucideLogOut" />{{ 'topbar.logout' | transloco }}</button>
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
  private readonly transloco = inject(TranslocoService);
  private readonly api = inject(ApiService);
  private readonly meta = inject(MetaStore);
  protected readonly auth = inject(AuthService);
  protected readonly privacy = inject(PrivacyStore);
  protected readonly langs = LANGS;
  protected readonly lang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  protected readonly refreshing = signal(false);

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
    return !['/planning/recurring', '/planning/goals', '/planning/projection', '/settings', '/about', '/accounts/net-worth'].includes(path);
  });
  protected readonly email = computed(() => this.meta.meta()?.email ?? this.auth.me()?.email ?? '');
  protected readonly fireflyUrl = computed(() => this.meta.meta()?.fireflyPublicUrl ?? null);

  protected setLang(lang: Lang): void {
    this.transloco.setActiveLang(lang);
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
  }

  protected async refresh(): Promise<void> {
    this.refreshing.set(true);
    try {
      await this.api.refresh();
      toast.success(this.transloco.translate('topbar.refreshed'));
    } catch {
      toast.error(this.transloco.translate('errors.generic'));
    } finally {
      this.refreshing.set(false);
    }
  }
}
