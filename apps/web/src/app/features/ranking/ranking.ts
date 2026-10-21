import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucidePlus } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import type { GroupBy } from '@spacefly/shared';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { rankingViewModel, type RankingKind } from '@spacefly/client/features/analysis/ranking.vm';
import { FORMAT_PIPES } from '@spacefly/client/format/pipes';
import { Chart } from '../../shared/charts/chart';
import { ChartCard } from '../../shared/charts/chart-card';
import { Delta } from '../../shared/components/delta';
import { EmptyState } from '../../shared/components/empty-state';
import { KpiCard } from '../../shared/components/kpi-card';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';

/** Categories · Tags · Merchants (expense accounts) · Income sources (revenue accounts). */
@Component({
  selector: 'sf-ranking',
  imports: [NgIcon, TranslocoPipe, HlmButton, HlmToggleGroupImports, Chart, ChartCard, Delta, EmptyState, KpiCard, Money, PageHeader, ...FORMAT_PIPES],
  providers: [provideIcons({ lucidePencil, lucidePlus })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="vm.i18n.t('nav.' + key())" [description]="vm.i18n.t('ranking.descriptions.' + key())">
      @if (vm.entityKind(); as kind) {
        <button hlmBtn size="sm" variant="outline" type="button" (click)="vm.create(kind)">
          <ng-icon name="lucidePlus" aria-hidden="true" />{{ 'editor.entity.' + kind + '.new' | transloco }}
        </button>
      }
      @if (!fixedKind()) {
        <hlm-toggle-group type="single" variant="outline" size="sm" [value]="vm.kindNow()" [nullable]="false" (valueChange)="$event && vm.setKind($any($event))">
          <button hlmToggleGroupItem value="expense">{{ 'common.expenses' | transloco }}</button>
          <button hlmToggleGroupItem value="income">{{ 'common.income' | transloco }}</button>
        </hlm-toggle-group>
      }
    </sf-page-header>

    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <sf-kpi [label]="vm.i18n.t('common.total')" [value]="vm.r()?.total ?? null" [accent]="vm.accent()" [loading]="vm.res.initialLoading()" />
      <sf-kpi [label]="vm.i18n.t('ranking.items')" format="compact" [value]="vm.r()?.items?.length ?? null" [accent]="vm.accent()" [loading]="vm.res.initialLoading()" />
      <sf-kpi [label]="vm.i18n.t('ranking.transactions')" format="compact" [value]="vm.count()" [accent]="vm.accent()" [loading]="vm.res.initialLoading()" />
      <sf-kpi [label]="vm.i18n.t('ranking.avgTicket')" [value]="vm.avgTicket()" [accent]="vm.accent()" [loading]="vm.res.initialLoading()" />
    </section>

    <section class="grid gap-4 xl:grid-cols-2">
      <sf-chart-card [title]="vm.i18n.t('ranking.distribution')" [table]="vm.table()" [loading]="vm.res.loading()" [initialLoading]="vm.res.initialLoading()" [fileName]="key() + '-distribution'">
        <hlm-toggle-group card-actions type="single" variant="outline" size="sm" [value]="vm.view()" [nullable]="false" (valueChange)="$event && vm.setView($any($event))">
          <button hlmToggleGroupItem value="bars" class="text-xs">{{ 'ranking.views.bars' | transloco }}</button>
          <button hlmToggleGroupItem value="treemap" class="text-xs">{{ 'ranking.views.treemap' | transloco }}</button>
          @if (vm.canSunburst()) {
            <button hlmToggleGroupItem value="sunburst" class="text-xs">{{ 'ranking.views.sunburst' | transloco }}</button>
          }
        </hlm-toggle-group>
        @if (vm.items().length) {
          @switch (vm.view()) {
            @case ('treemap') {
              <sf-chart [options]="vm.treemapOpts()" height="24rem" (chartClick)="vm.openId($any($event.data).id)" />
            }
            @case ('sunburst') {
              @if (vm.sunburstOpts(); as o) {
                <sf-chart [options]="o" height="24rem" />
              }
            }
            @default {
              <sf-chart [options]="vm.barsOpts()" [height]="barsHeight()" (chartClick)="vm.openBar($event.dataIndex)" />
            }
          }
        } @else if (!vm.res.initialLoading()) {
          <sf-empty [title]="vm.i18n.t('common.noData')" />
        }
      </sf-chart-card>
      <sf-chart-card [title]="vm.i18n.t('ranking.trend')" [subtitle]="vm.i18n.t('ranking.trendHint')" [loading]="vm.res.loading()" [initialLoading]="vm.res.initialLoading()" [fileName]="key() + '-trend'">
        @if (vm.trendOpts(); as o) {
          <sf-chart [options]="o" height="24rem" />
        }
      </sf-chart-card>
    </section>

    <section class="overflow-x-auto rounded-xl border border-border bg-card p-4">
      <table class="w-full min-w-[42rem] text-sm">
        <thead>
          <tr class="border-b border-border">
            <th class="eyebrow py-2 text-left">{{ 'ranking.name' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'common.total' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'ranking.share' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'ranking.count' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'ranking.avgTicket' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'ranking.previous' | transloco }}</th>
            @if (vm.entityKind()) {
              <th class="w-8"><span class="sr-only">{{ 'editor.tx.edit' | transloco }}</span></th>
            }
          </tr>
        </thead>
        <tbody>
          @for (it of vm.items(); track it.id) {
            <tr class="cursor-pointer border-b border-border/60 hover:bg-muted/40" (click)="vm.open(it)">
              <td class="py-2">
                <span class="inline-flex items-center gap-2">
                  <span class="size-2.5 shrink-0 rounded-sm" [style.background]="vm.colorOf(it)"></span>
                  {{ vm.nameOf(it) }}
                </span>
              </td>
              <td class="py-2 text-right"><sf-money [value]="it.value" /></td>
              <td class="py-2 text-right num text-xs">{{ it.share | pct: 1 }}</td>
              <td class="py-2 text-right num text-xs">{{ it.count }}</td>
              <td class="py-2 text-right"><sf-money class="text-xs" [value]="it.avg" /></td>
              <td class="py-2 text-right">
                <span class="inline-flex items-center gap-2">
                  <sf-money class="text-xs text-muted-foreground" [value]="it.previous" />
                  <sf-delta [value]="it.value" [previous]="it.previous || null" [upIsGood]="vm.kindNow() === 'income'" />
                </span>
              </td>
              @if (vm.entityKind()) {
                <td class="py-2 text-right">
                  @if (vm.entityId(it); as eid) {
                    <button hlmBtn variant="ghost" size="icon-sm" type="button" [attr.aria-label]="('editor.tx.edit' | transloco) + ': ' + vm.nameOf(it)" (click)="edit($event, eid)">
                      <ng-icon name="lucidePencil" aria-hidden="true" />
                    </button>
                  }
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </section>
  `,
})
export class Ranking {
  // Route data (withComponentInputBinding)
  readonly by = input<GroupBy>('category');
  readonly kind = input<RankingKind>('expense');
  readonly key = input('categories');
  readonly fixedKind = input(false);

  protected readonly vm = rankingViewModel({ by: this.by, kind: this.kind, fixedKind: this.fixedKind });
  protected readonly barsHeight = computed(() => `${Math.max(10, this.vm.barsCount() * 2 + 2)}rem`);

  protected edit(event: Event, id: string): void {
    event.stopPropagation();
    this.vm.edit(id);
  }
}
