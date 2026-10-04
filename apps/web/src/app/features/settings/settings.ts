import { HttpClient, httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import type { SettingsResponse, UserSettings } from '@spacefly/shared';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmSwitch } from '@spartan-ng/helm/switch';
import { FORMAT_PIPES } from '@spacefly/client/format/pipes';
import { I18n } from '@spacefly/client/i18n/i18n';
import { FiltersStore } from '@spacefly/client/state/filters.store';
import { PageHeader } from '../../shared/components/page-header';
import { Section } from '../../shared/components/section';

@Component({
  selector: 'sf-settings',
  imports: [FormsModule, TranslocoPipe, HlmBadge, HlmButton, HlmInput, HlmLabel, HlmSwitch, PageHeader, Section, ...FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="i18n.t('nav.settings')" [description]="i18n.t('settings.description')">
      <button hlmBtn size="sm" [disabled]="!draft() || saving()" (click)="save()">{{ 'settings.save' | transloco }}</button>
    </sf-page-header>

    <section class="grid gap-4 xl:grid-cols-2">
      <sf-section [title]="i18n.t('settings.excluded')" [loading]="res.isLoading() && !draft()">
        <p class="mb-3 text-xs text-muted-foreground">{{ 'settings.excludedHint' | transloco }}</p>
        @if (draft(); as d) {
          <ul class="divide-y divide-border/70">
            @for (a of accounts(); track a.id) {
              <li class="flex items-center gap-3 py-2">
                <hlm-switch [checked]="d.excludedAccounts.includes(a.id)" (checkedChange)="toggleExcluded(a.id, $event)" [attr.aria-label]="a.name" />
                <span class="flex-1 truncate text-sm">{{ a.name }}</span>
                <span hlmBadge variant="outline" class="text-[10px]">{{ a.currency }}</span>
                @if (a.role) {
                  <span hlmBadge variant="secondary" class="text-[10px]">{{ 'accounts.roles.' + a.role | transloco }}</span>
                }
              </li>
            }
          </ul>
        }
      </sf-section>

      <div class="flex flex-col gap-4">
        <sf-section [title]="i18n.t('settings.preferences')" [loading]="res.isLoading() && !draft()">
          @if (draft(); as d) {
            <div class="flex flex-col gap-4">
              <label hlmLabel class="flex flex-col items-start gap-1.5">
                {{ 'settings.balanceMonths' | transloco }}
                <input hlmInput type="number" min="2" max="60" class="h-8 w-28" [ngModel]="d.balanceMonths" (ngModelChange)="patch({ balanceMonths: +$event })" />
              </label>
              <label hlmLabel class="flex flex-col items-start gap-1.5">
                {{ 'settings.sankeyThreshold' | transloco }}
                <span class="flex items-center gap-3">
                  <input type="range" min="0" max="0.1" step="0.005" class="w-40 accent-[var(--primary)]" [ngModel]="d.sankeyThreshold" (ngModelChange)="patch({ sankeyThreshold: +$event })" />
                  <span class="num text-xs">{{ d.sankeyThreshold | pct: 1 : false : false }}</span>
                </span>
              </label>
            </div>
          }
        </sf-section>

        <sf-section [title]="i18n.t('settings.rates')" [loading]="res.isLoading() && !draft()">
          <p class="mb-3 text-xs text-muted-foreground">{{ 'settings.ratesHint' | transloco }}</p>
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border">
                <th class="eyebrow py-2 text-left">{{ 'common.month' | transloco }}</th>
                <th class="eyebrow py-2 text-left">{{ 'settings.pair' | transloco }}</th>
                <th class="eyebrow py-2 text-right">{{ 'settings.rate' | transloco }}</th>
                <th class="eyebrow py-2 text-right">{{ 'settings.source' | transloco }}</th>
              </tr>
            </thead>
            <tbody>
              @for (r of res.value()?.rates ?? []; track r.base + r.month) {
                <tr class="border-b border-border/60">
                  <td class="py-1.5 capitalize">{{ r.month | fdate: 'month' }}</td>
                  <td class="py-1.5 text-xs text-muted-foreground">1 {{ r.base }} → {{ r.quote }}</td>
                  <td class="py-1.5 text-right num">{{ r.rate.toFixed(4) }}</td>
                  <td class="py-1.5 text-right">
                    <span hlmBadge [variant]="r.source === 'firefly' ? 'secondary' : 'outline'" class="text-[10px]">{{ 'settings.sources.' + r.source | transloco }}</span>
                    <span class="ml-1 text-[10px] text-muted-foreground">{{ r.date | fdate: 'short' }}</span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </sf-section>
      </div>
    </section>
  `,
})
export class Settings {
  protected readonly i18n = inject(I18n);
  private readonly http = inject(HttpClient);
  private readonly filters = inject(FiltersStore);
  protected readonly res = httpResource<SettingsResponse>(() => '/api/settings');
  protected readonly draft = linkedSignal<UserSettings | null>(() => (this.res.hasValue() ? structuredClone(this.res.value()!.settings) : null));
  protected readonly accounts = linkedSignal(() => (this.res.hasValue() ? this.res.value()!.accounts : []));
  protected readonly saving = signal(false);

  protected patch(p: Partial<UserSettings>): void {
    const d = this.draft();
    if (d) this.draft.set({ ...d, ...p });
  }

  protected toggleExcluded(id: string, excluded: boolean): void {
    const d = this.draft();
    if (!d) return;
    const set = new Set(d.excludedAccounts);
    if (excluded) set.add(id);
    else set.delete(id);
    this.patch({ excludedAccounts: [...set] });
  }

  protected async save(): Promise<void> {
    const d = this.draft();
    if (!d) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.http.put('/api/settings', d));
      this.filters.refresh();
      toast.success(this.i18n.t('settings.saved'));
    } catch {
      toast.error(this.i18n.t('errors.generic'));
    } finally {
      this.saving.set(false);
    }
  }
}
