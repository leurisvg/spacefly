import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucidePencil, lucidePlus, lucideTriangleAlert } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import type { PiggyBanksReport } from '@spacefly/shared';
import { HlmButton } from '@spartan-ng/helm/button';
import { reportResource } from '../../core/api/report-resource';
import { FormatService } from '../../core/format/format.service';
import { FORMAT_PIPES } from '../../core/format/pipes';
import { I18n } from '../../core/i18n/i18n';
import { EmptyState } from '../../shared/components/empty-state';
import { KpiCard } from '../../shared/components/kpi-card';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';
import { EntityEditor } from '../editor/entity-editor.service';

@Component({
  selector: 'sf-goals',
  imports: [NgIcon, TranslocoPipe, HlmButton, EmptyState, KpiCard, Money, PageHeader, ...FORMAT_PIPES],
  providers: [provideIcons({ lucideCircleCheck, lucidePencil, lucidePlus, lucideTriangleAlert })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="i18n.t('nav.goals')" [description]="i18n.t('goals.description')">
      <button hlmBtn size="sm" variant="outline" type="button" (click)="editor.open('piggy')">
        <ng-icon name="lucidePlus" aria-hidden="true" />{{ 'editor.entity.piggy.new' | transloco }}
      </button>
    </sf-page-header>
    <section class="grid grid-cols-2 gap-3">
      <sf-kpi [label]="i18n.t('goals.saved')" [value]="res.data()?.totalSaved ?? null" accent="var(--money-savings)" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('goals.target')" [value]="res.data()?.totalTarget ?? null" accent="var(--money-net)" [loading]="res.initialLoading()" />
    </section>
    @if (res.data(); as data) {
      @if (data.piggyBanks.length) {
        <section class="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          @for (p of data.piggyBanks; track p.id) {
            <article class="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <h3 class="truncate font-medium">{{ p.name }}</h3>
                  <p class="truncate text-xs text-muted-foreground">{{ p.group ? p.group + ' · ' : '' }}{{ p.accounts.join(', ') }}</p>
                </div>
                <div class="flex items-center gap-1">
                  @if (p.pct !== null) {
                    <span class="num text-sm font-semibold">{{ p.pct | pct: 0 }}</span>
                  }
                  <button hlmBtn variant="ghost" size="icon-sm" type="button" [attr.aria-label]="('editor.tx.edit' | transloco) + ': ' + p.name" (click)="editor.open('piggy', p.id)">
                    <ng-icon name="lucidePencil" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--money-net)_20%,transparent)]" role="progressbar" [attr.aria-valuenow]="f.hidden() ? 0 : (p.pct ?? 0) * 100" aria-valuemin="0" aria-valuemax="100">
                <div class="h-full rounded-full bg-[var(--money-net)]" [style.width.%]="f.hidden() ? 0 : (p.pct ?? 0) * 100"></div>
              </div>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div><div class="text-muted-foreground">{{ 'goals.current' | transloco }}</div><sf-money [value]="p.current" /></div>
                <div><div class="text-muted-foreground">{{ 'goals.goal' | transloco }}</div>@if (p.target !== null) {<sf-money [value]="p.target" />} @else {—}</div>
                <div><div class="text-muted-foreground">{{ 'goals.pace' | transloco }}</div><sf-money [value]="p.monthlyPace" />/{{ 'goals.month' | transloco }}</div>
                <div><div class="text-muted-foreground">{{ 'goals.left' | transloco }}</div>@if (p.leftToSave !== null) {<sf-money [value]="p.leftToSave" />} @else {—}</div>
              </div>
              <div class="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 pt-2 text-xs">
                <span><span class="text-muted-foreground">{{ 'goals.targetDate' | transloco }}:</span> {{ p.targetDate ? (p.targetDate | fdate: 'long') : '—' }}</span>
                <span><span class="text-muted-foreground">{{ 'goals.estimated' | transloco }}:</span> {{ p.estimatedDate ? (p.estimatedDate | fdate: 'long') : ('goals.noPace' | transloco) }}</span>
                @if (p.onTrack !== null) {
                  <span class="inline-flex items-center gap-1" [style.color]="p.onTrack ? 'var(--status-good)' : 'var(--status-warning)'">
                    <ng-icon [name]="p.onTrack ? 'lucideCircleCheck' : 'lucideTriangleAlert'" />{{ (p.onTrack ? 'goals.onTrack' : 'goals.behind') | transloco }}
                  </span>
                }
              </div>
            </article>
          }
        </section>
      } @else {
        <sf-empty [title]="i18n.t('goals.none')" />
      }
    }
  `,
})
export class Goals {
  protected readonly i18n = inject(I18n);
  protected readonly f = inject(FormatService);
  protected readonly editor = inject(EntityEditor);
  protected readonly res = reportResource<PiggyBanksReport>('reports/piggy-banks', () => ({}), { global: false });
}
