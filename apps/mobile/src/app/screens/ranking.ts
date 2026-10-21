import { Component, computed, inject, NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouterExtensions } from '@nativescript/angular';
import type { GroupBy } from '@spacefly/shared';
import { rankingViewModel, type RankingKind, type RankingView } from '@spacefly/client/features/analysis/ranking.vm';
import { FormatService } from '@spacefly/client/format/format.service';
import { ChartClick, ChartWebView } from '../ui/chart-webview';
import { Delta } from '../ui/delta';
import { DrillLauncher } from '../ui/drill-launcher';
import { EmptyState } from '../ui/empty-state';
import { KpiCard } from '../ui/kpi-card';
import { Money } from '../ui/money';
import { ScreenHeader } from '../ui/screen-header';
import { Segmented } from '../ui/segmented';

/** Categories · Tags · Merchants · Income sources: totals, distribution (bars / treemap / budgets), trend and the ranked list. */
@Component({
  selector: 'ns-ranking',
  imports: [ChartWebView, Delta, EmptyState, KpiCard, Money, ScreenHeader, Segmented],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar [title]="vm.i18n.t('nav.' + key)"></ActionBar>
    <ScrollView class="screen">
      <StackLayout>
        <ns-screen-header [error]="!!vm.res.error() && !vm.r()" />
        <StackLayout class="screen-pad">
          @if (!fixedKind) {
            <ns-segmented [options]="kinds()" [value]="vm.kindNow()" (valueChange)="vm.setKind($any($event))" />
          }

          <GridLayout columns="*, *" marginTop="8">
            <ns-kpi col="0" [label]="vm.i18n.t('common.total')" [value]="vm.r()?.total ?? null" [accent]="vm.accent()" />
            <ns-kpi col="1" [label]="vm.i18n.t('ranking.avgTicket')" [value]="vm.avgTicket()" [accent]="vm.accent()" />
          </GridLayout>
          <Label [text]="vm.i18n.t('ranking.items') + ': ' + vm.items().length + ' · ' + vm.i18n.t('ranking.transactions') + ': ' + (vm.count() ?? 0)" class="muted small" marginBottom="8"></Label>

          @if (vm.res.initialLoading()) {
            <ActivityIndicator busy="true"></ActivityIndicator>
          } @else if (!vm.items().length && !vm.res.error()) {
            <ns-empty [title]="vm.i18n.t('common.noData')" />
          }

          @if (vm.items().length) {
            <StackLayout class="card">
              <Label [text]="vm.i18n.t('ranking.distribution')" class="card-title"></Label>
              <ns-segmented [options]="views()" [value]="vm.view()" (valueChange)="vm.setView($any($event))" />
              @switch (vm.view()) {
                @case ('treemap') {
                  <ns-chart [options]="vm.treemapOpts()" [height]="320" (chartClick)="vm.openName($any($event).name); drills.show()" />
                }
                @case ('sunburst') {
                  @if (vm.sunburstOpts(); as o) {
                    <ns-chart [options]="o" [height]="320" />
                  }
                }
                @default {
                  <ns-chart [options]="vm.barsOpts()" [height]="barsHeight()" (chartClick)="bar($any($event))" />
                }
              }
            </StackLayout>
          }

          @if (vm.trendOpts(); as o) {
            <StackLayout class="card">
              <Label [text]="vm.i18n.t('ranking.trend')" class="card-title"></Label>
              <Label [text]="vm.i18n.t('ranking.trendHint')" class="muted small"></Label>
              <ns-chart [options]="o" [height]="260" />
            </StackLayout>
          }

          @if (vm.items().length) {
            <StackLayout class="card">
              @for (it of vm.items(); track it.id ?? 'none') {
                <GridLayout columns="*, auto" class="row-divider">
                  <GridLayout col="0" columns="auto, *, auto" rows="auto, auto" (tap)="open(it)">
                    <Label col="0" row="0" rowSpan="2" text="●" [style.color]="vm.colorOf(it)" marginRight="8" verticalAlignment="center"></Label>
                    <Label col="1" row="0" [text]="vm.nameOf(it)" textWrap="false"></Label>
                    <Label col="1" row="1" [text]="f.pct(it.share) + ' · ' + it.count + ' · ' + vm.i18n.t('ranking.avgTicket') + ' ' + f.compact(it.avg)" class="muted small" textWrap="false"></Label>
                    <ns-money col="2" row="0" [value]="it.value" />
                    <ns-delta col="2" row="1" [value]="it.value" [previous]="it.previous || null" [upIsGood]="vm.kindNow() === 'income'" horizontalAlignment="right" />
                  </GridLayout>
                  @if (vm.entityKind() && vm.entityId(it); as eid) {
                    <Label col="1" text="✎" class="chip" marginLeft="8" verticalAlignment="center" (tap)="edit(eid)"></Label>
                  }
                </GridLayout>
              }
            </StackLayout>
          }
        </StackLayout>
      </StackLayout>
    </ScrollView>
  `,
})
export class Ranking {
  private readonly data = inject(ActivatedRoute).snapshot.data;
  protected readonly key: string = this.data['key'] ?? 'categories';
  protected readonly fixedKind: boolean = !!this.data['fixedKind'];
  protected readonly vm = rankingViewModel({
    by: computed(() => (this.data['by'] ?? 'category') as GroupBy),
    kind: computed(() => (this.data['kind'] ?? 'expense') as RankingKind),
    fixedKind: computed(() => this.fixedKind),
  });
  protected readonly f = inject(FormatService);
  protected readonly drills = inject(DrillLauncher);
  private readonly router = inject(RouterExtensions);

  protected readonly kinds = computed(() => [
    { value: 'expense', label: this.vm.i18n.t('common.expenses') },
    { value: 'income', label: this.vm.i18n.t('common.income') },
  ]);

  protected readonly views = computed<{ value: RankingView; label: string }[]>(() => [
    { value: 'bars', label: this.vm.i18n.t('ranking.views.bars') },
    { value: 'treemap', label: this.vm.i18n.t('ranking.views.treemap') },
    ...(this.vm.canSunburst() ? [{ value: 'sunburst' as const, label: this.vm.i18n.t('ranking.views.sunburst') }] : []),
  ]);

  protected readonly barsHeight = computed(() => Math.max(160, this.vm.barsCount() * 32 + 16));

  protected bar(click: ChartClick): void {
    this.vm.openBar(click.dataIndex);
    this.drills.show();
  }

  protected edit(id: string): void {
    void this.router.navigate(['/edit', this.vm.entityKind(), id]);
  }

  protected open(it: { id: string | null; name: string }): void {
    this.vm.open(it);
    this.drills.show();
  }
}
