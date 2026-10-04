import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideChevronDown, lucideChevronUp, lucideGripVertical, lucidePencil, lucidePlus, lucideRotateCcw, lucideArrowUpDown } from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { firstValueFrom } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';
import type { AccountsReport } from '@spacefly/shared';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { reportResource } from '../../core/api/report-resource';
import { FormatService } from '../../core/format/format.service';
import { FORMAT_PIPES } from '../../core/format/pipes';
import { I18n } from '../../core/i18n/i18n';
import { FiltersStore } from '../../core/state/filters.store';
import { linesOption } from '../../shared/charts/builders';
import { Chart } from '../../shared/charts/chart';
import { ChartCard, type ChartTable } from '../../shared/charts/chart-card';
import { SeriesColors } from '../../shared/charts/series-colors';
import { KpiCard } from '../../shared/components/kpi-card';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';
import { EntityEditor } from '../editor/entity-editor.service';
import { MonthsPicker } from './months-picker';

@Component({
  selector: 'sf-accounts',
  imports: [NgIcon, RouterLink, TranslocoPipe, HlmBadge, HlmButton, Chart, ChartCard, KpiCard, Money, PageHeader, MonthsPicker, ...FORMAT_PIPES],
  providers: [provideIcons({ lucidePencil, lucidePlus, lucideArrowUpDown, lucideCheck, lucideRotateCcw, lucideGripVertical, lucideChevronUp, lucideChevronDown })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="i18n.t('nav.assetAccounts')" [description]="i18n.t('accounts.description')">
      @if (reordering()) {
        <button hlmBtn size="sm" variant="ghost" type="button" (click)="reset()">
          <ng-icon name="lucideRotateCcw" aria-hidden="true" />{{ 'accounts.reorder.reset' | transloco }}
        </button>
        <button hlmBtn size="sm" type="button" (click)="reordering.set(false)">
          <ng-icon name="lucideCheck" aria-hidden="true" />{{ 'accounts.reorder.done' | transloco }}
        </button>
      } @else {
        <button hlmBtn size="sm" variant="outline" type="button" (click)="reordering.set(true)">
          <ng-icon name="lucideArrowUpDown" aria-hidden="true" />{{ 'accounts.reorder.start' | transloco }}
        </button>
        <button hlmBtn size="sm" variant="outline" type="button" (click)="editor.open('account')">
          <ng-icon name="lucidePlus" aria-hidden="true" />{{ 'editor.entity.account.new' | transloco }}
        </button>
      }
      <sf-months-picker [value]="months()" (changed)="filters.setParams({ months: $event })" />
    </sf-page-header>

    <section class="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <sf-kpi [label]="i18n.t('accounts.total')" [value]="r()?.total ?? null" accent="var(--money-net)" [loading]="res.initialLoading()" />
      <sf-kpi [label]="i18n.t('common.income')" [value]="income()" accent="var(--money-income)" [loading]="res.initialLoading()" />
      <sf-kpi class="col-span-2 lg:col-span-1" [label]="i18n.t('common.expenses')" [value]="expense()" accent="var(--money-expense)" [loading]="res.initialLoading()" />
    </section>

    @if (reordering()) {
      <p class="-mb-2 px-1 text-xs text-muted-foreground">{{ 'accounts.reorder.hint' | transloco }}</p>
    }

    <section class="overflow-x-auto rounded-xl border border-border bg-card p-4">
      <table class="w-full min-w-[40rem] text-sm">
        <thead>
          <tr class="border-b border-border">
            @if (reordering()) {
              <th class="w-24"><span class="sr-only">{{ 'accounts.reorder.start' | transloco }}</span></th>
            }
            <th class="eyebrow py-2 text-left">{{ 'common.account' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'accounts.balanceOriginal' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'accounts.balance' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'common.income' | transloco }}</th>
            <th class="eyebrow py-2 text-right">{{ 'common.expenses' | transloco }}</th>
            <th class="w-8"><span class="sr-only">{{ 'editor.tx.edit' | transloco }}</span></th>
          </tr>
        </thead>
        <tbody>
          @for (a of rows(); track a.id; let i = $index; let first = $first; let last = $last) {
            <tr
              class="border-b border-border/60 hover:bg-muted/40"
              [class.cursor-pointer]="!reordering()"
              [class.opacity-60]="a.excluded || dragging() === a.id"
              [attr.draggable]="reordering() ? 'true' : null"
              (click)="!reordering() && open(a.id)"
              (dragstart)="dragging.set(a.id)"
              (dragend)="dragging.set(null)"
              (dragover)="reordering() && $event.preventDefault()"
              (drop)="dropOn(a.id)"
            >
              @if (reordering()) {
                <td class="py-2">
                  <span class="inline-flex items-center gap-0.5">
                    <ng-icon name="lucideGripVertical" class="cursor-grab text-muted-foreground" aria-hidden="true" />
                    <button hlmBtn variant="ghost" size="icon-sm" type="button" [disabled]="first" [attr.aria-label]="i18n.t('accounts.reorder.up', { name: a.name })" (click)="move(a.id, -1)">
                      <ng-icon name="lucideChevronUp" aria-hidden="true" />
                    </button>
                    <button hlmBtn variant="ghost" size="icon-sm" type="button" [disabled]="last" [attr.aria-label]="i18n.t('accounts.reorder.down', { name: a.name })" (click)="move(a.id, 1)">
                      <ng-icon name="lucideChevronDown" aria-hidden="true" />
                    </button>
                  </span>
                </td>
              }
              <td class="py-2">
                <span class="inline-flex flex-wrap items-center gap-2">
                  <span class="size-2.5 rounded-sm" [style.background]="colors.color('account', a.id)"></span>
                  <a class="font-medium hover:underline" [routerLink]="['/accounts', a.id]" queryParamsHandling="preserve" (click)="$event.stopPropagation()">{{ a.name }}</a>
                  @if (a.role) {
                    <span hlmBadge variant="outline" class="text-[10px]">{{ 'accounts.roles.' + a.role | transloco }}</span>
                  }
                  @if (a.excluded) {
                    <span hlmBadge variant="secondary" class="text-[10px]">{{ 'accounts.excluded' | transloco }}</span>
                  }
                </span>
              </td>
              <td class="py-2 text-right"><sf-money [value]="a.balanceOriginal" [currency]="a.currency" tone="auto" /></td>
              <td class="py-2 text-right"><sf-money [value]="a.balance" tone="auto" /></td>
              <td class="py-2 text-right"><sf-money [value]="a.income" class="text-xs" /></td>
              <td class="py-2 text-right"><sf-money [value]="a.expense" class="text-xs" /></td>
              <td class="py-2 text-right">
                <button hlmBtn variant="ghost" size="icon-sm" type="button" [attr.aria-label]="('editor.tx.edit' | transloco) + ': ' + a.name" (click)="edit($event, a.id)">
                  <ng-icon name="lucidePencil" aria-hidden="true" />
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </section>

    <sf-chart-card [title]="i18n.t('accounts.balanceHistory')" [table]="table()" [loading]="res.loading()" [initialLoading]="res.initialLoading()" fileName="account-balances">
      @if (options(); as o) {
        <sf-chart [options]="o" height="22rem" />
      }
    </sf-chart-card>
  `,
})
export class Accounts {
  protected readonly i18n = inject(I18n);
  protected readonly filters = inject(FiltersStore);
  private readonly router = inject(Router);
  protected readonly colors = inject(SeriesColors);
  protected readonly editor = inject(EntityEditor);
  private readonly f = inject(FormatService);
  private readonly http = inject(HttpClient);
  private readonly monthsParam = this.filters.param('months');
  protected readonly months = computed(() => this.monthsParam() ?? '12');
  protected readonly res = reportResource<AccountsReport>('reports/accounts', () => ({ months: this.months() }));
  protected readonly r = this.res.data;
  protected readonly reordering = signal(false);
  protected readonly dragging = signal<string | null>(null);
  /** Account ids as displayed: the server's order, then whatever the user moves. */
  private readonly order = linkedSignal<string[]>(() => this.r()?.accounts.map((a) => a.id) ?? []);
  protected readonly rows = computed(() => {
    const byId = new Map((this.r()?.accounts ?? []).map((a) => [a.id, a]));
    return this.order().flatMap((id) => byId.get(id) ?? []);
  });
  protected readonly income = computed(() => this.r()?.accounts.reduce((s, a) => s + a.income, 0) ?? null);
  protected readonly expense = computed(() => this.r()?.accounts.reduce((s, a) => s + a.expense, 0) ?? null);

  protected move(id: string, delta: -1 | 1): void {
    const order = [...this.order()];
    const from = order.indexOf(id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    void this.save(order);
  }

  protected dropOn(targetId: string): void {
    const id = this.dragging();
    this.dragging.set(null);
    if (!id || id === targetId) return;
    const from = this.order().indexOf(id);
    const order = this.order().filter((x) => x !== id);
    // Dragging down drops the row after the target, dragging up drops it before.
    order.splice(order.indexOf(targetId) + (from < this.order().indexOf(targetId) ? 1 : 0), 0, id);
    void this.save(order);
  }

  /** Back to the default order (largest balance first). */
  protected async reset(): Promise<void> {
    try {
      await firstValueFrom(this.http.put('/api/settings/account-order', { order: [] }));
      this.res.reload();
    } catch {
      toast.error(this.i18n.t('errors.generic'));
    }
  }

  private async save(order: string[]): Promise<void> {
    this.order.set(order);
    try {
      await firstValueFrom(this.http.put('/api/settings/account-order', { order }));
    } catch {
      toast.error(this.i18n.t('errors.generic'));
    }
  }

  protected open(id: string): void {
    void this.router.navigate(['/accounts', id], { queryParamsHandling: 'preserve' });
  }

  protected edit(event: Event, id: string): void {
    event.stopPropagation();
    this.editor.open('account', id);
  }

  /** Balance series in the same order as the table. */
  private readonly history = computed(() => {
    const rank = new Map(this.order().map((id, i) => [id, i]));
    return [...(this.r()?.history ?? [])].sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity));
  });

  protected readonly options = computed(() => {
    const r = this.r();
    if (!r?.history.length) return null;
    return linesOption(this.f, r.months, this.history().map((h) => ({ id: h.id, name: h.name, values: h.balances, color: this.colors.color('account', h.id) })));
  });

  protected readonly table = computed<ChartTable | null>(() => {
    const r = this.r();
    if (!r) return null;
    return {
      columns: [this.i18n.t('common.account'), ...r.months.map((m) => this.f.monthLabel(m))],
      rows: this.history().map((h) => [h.name, ...h.balances.map((b) => this.f.compact(b))]),
      numeric: r.months.map((_, i) => i + 1),
    };
  });
}
