import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { projectionViewModel, PROJECTION_DAYS } from '@spacefly/client/features/planning/projection.vm';
import { FORMAT_PIPES } from '@spacefly/client/format/pipes';
import { Chart } from '../../shared/charts/chart';
import { ChartCard } from '../../shared/charts/chart-card';
import { KpiCard } from '../../shared/components/kpi-card';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';
import { Section } from '../../shared/components/section';

@Component({
  selector: 'sf-projection',
  imports: [TranslocoPipe, HlmToggleGroupImports, Chart, ChartCard, KpiCard, Money, PageHeader, Section, ...FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="vm.i18n.t('nav.projection')" [description]="vm.i18n.t('projection.description')">
      <hlm-toggle-group type="single" variant="outline" size="sm" [value]="vm.days()" [nullable]="false" (valueChange)="$event && vm.setDays($any($event))">
        @for (d of dayOptions; track d) {
          <button hlmToggleGroupItem [value]="d" class="text-xs">{{ d }}{{ 'projection.daysShort' | transloco }}</button>
        }
      </hlm-toggle-group>
    </sf-page-header>

    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <sf-kpi [label]="vm.i18n.t('projection.today')" [value]="vm.r()?.startBalance ?? null" accent="var(--money-net)" [loading]="vm.res.initialLoading()" />
      @for (h of vm.r()?.horizons ?? []; track h.days) {
        <sf-kpi [label]="vm.i18n.t('projection.in', { n: h.days })" [value]="h.balance" [previous]="vm.r()!.startBalance" accent="var(--money-net)" />
      }
    </section>

    <sf-chart-card [title]="vm.i18n.t('projection.chart')" [subtitle]="vm.lowestLabel()" [table]="vm.table()" [loading]="vm.res.loading()" [initialLoading]="vm.res.initialLoading()" fileName="cash-flow-projection">
      @if (vm.options(); as o) {
        <sf-chart [options]="o" height="20rem" />
      }
    </sf-chart-card>

    <sf-section [title]="vm.i18n.t('projection.events')" [loading]="vm.res.initialLoading()">
      <ul class="divide-y divide-border/70 text-sm">
        @for (e of vm.r()?.events ?? []; track $index) {
          <li class="flex items-center gap-3 py-2">
            <span class="size-2 shrink-0 rounded-full" [class.bg-status-warning]="e.kind === 'bill'" [class.bg-primary]="e.kind === 'recurrence'"></span>
            <span class="w-24 shrink-0 text-xs text-muted-foreground">{{ e.date | fdate: 'day' }}</span>
            <span class="flex-1 truncate">{{ e.name }}</span>
            <sf-money [value]="e.amount" [signed]="true" tone="auto" />
          </li>
        } @empty {
          <li class="py-6 text-center text-muted-foreground">{{ 'projection.noEvents' | transloco }}</li>
        }
      </ul>
    </sf-section>
  `,
})
export class Projection {
  protected readonly vm = projectionViewModel();
  protected readonly dayOptions = PROJECTION_DAYS;
}
