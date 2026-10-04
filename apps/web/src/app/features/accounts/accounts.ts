import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideChevronDown, lucideChevronUp, lucideGripVertical, lucidePencil, lucidePlus, lucideRotateCcw, lucideArrowUpDown } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { accountsViewModel } from '@spacefly/client/features/accounts/accounts.vm';
import { FORMAT_PIPES } from '@spacefly/client/format/pipes';
import { Chart } from '../../shared/charts/chart';
import { ChartCard } from '../../shared/charts/chart-card';
import { KpiCard } from '../../shared/components/kpi-card';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';
import { MonthsPicker } from './months-picker';

@Component({
  selector: 'sf-accounts',
  imports: [NgIcon, RouterLink, TranslocoPipe, HlmBadge, HlmButton, Chart, ChartCard, KpiCard, Money, PageHeader, MonthsPicker, ...FORMAT_PIPES],
  providers: [provideIcons({ lucidePencil, lucidePlus, lucideArrowUpDown, lucideCheck, lucideRotateCcw, lucideGripVertical, lucideChevronUp, lucideChevronDown })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="vm.i18n.t('nav.assetAccounts')" [description]="vm.i18n.t('accounts.description')">
      @if (vm.reordering()) {
        <button hlmBtn size="sm" variant="ghost" type="button" (click)="vm.reset()">
          <ng-icon name="lucideRotateCcw" aria-hidden="true" />{{ 'accounts.reorder.reset' | transloco }}
        </button>
        <button hlmBtn size="sm" type="button" (click)="vm.reordering.set(false)">
          <ng-icon name="lucideCheck" aria-hidden="true" />{{ 'accounts.reorder.done' | transloco }}
        </button>
      } @else {
        <button hlmBtn size="sm" variant="outline" type="button" (click)="vm.reordering.set(true)">
          <ng-icon name="lucideArrowUpDown" aria-hidden="true" />{{ 'accounts.reorder.start' | transloco }}
        </button>
        <button hlmBtn size="sm" variant="outline" type="button" (click)="vm.editor.open('account')">
          <ng-icon name="lucidePlus" aria-hidden="true" />{{ 'editor.entity.account.new' | transloco }}
        </button>
      }
      <sf-months-picker [value]="vm.months()" (changed)="vm.filters.setParams({ months: $event })" />
    </sf-page-header>

    <section class="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <sf-kpi [label]="vm.i18n.t('accounts.total')" [value]="vm.r()?.total ?? null" accent="var(--money-net)" [loading]="vm.res.initialLoading()" />
      <sf-kpi [label]="vm.i18n.t('common.income')" [value]="vm.income()" accent="var(--money-income)" [loading]="vm.res.initialLoading()" />
      <sf-kpi class="col-span-2 lg:col-span-1" [label]="vm.i18n.t('common.expenses')" [value]="vm.expense()" accent="var(--money-expense)" [loading]="vm.res.initialLoading()" />
    </section>

    @if (vm.reordering()) {
      <p class="-mb-2 px-1 text-xs text-muted-foreground">{{ 'accounts.reorder.hint' | transloco }}</p>
    }

    <section class="overflow-x-auto rounded-xl border border-border bg-card p-4">
      <table class="w-full min-w-[40rem] text-sm">
        <thead>
          <tr class="border-b border-border">
            @if (vm.reordering()) {
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
          @for (a of vm.rows(); track a.id; let i = $index; let first = $first; let last = $last) {
            <tr
              class="border-b border-border/60 hover:bg-muted/40"
              [class.cursor-pointer]="!vm.reordering()"
              [class.opacity-60]="a.excluded || vm.dragging() === a.id"
              [attr.draggable]="vm.reordering() ? 'true' : null"
              (click)="!vm.reordering() && open(a.id)"
              (dragstart)="vm.dragging.set(a.id)"
              (dragend)="vm.dragging.set(null)"
              (dragover)="vm.reordering() && $event.preventDefault()"
              (drop)="vm.dropOn(a.id)"
            >
              @if (vm.reordering()) {
                <td class="py-2">
                  <span class="inline-flex items-center gap-0.5">
                    <ng-icon name="lucideGripVertical" class="cursor-grab text-muted-foreground" aria-hidden="true" />
                    <button hlmBtn variant="ghost" size="icon-sm" type="button" [disabled]="first" [attr.aria-label]="vm.i18n.t('accounts.reorder.up', { name: a.name })" (click)="vm.move(a.id, -1)">
                      <ng-icon name="lucideChevronUp" aria-hidden="true" />
                    </button>
                    <button hlmBtn variant="ghost" size="icon-sm" type="button" [disabled]="last" [attr.aria-label]="vm.i18n.t('accounts.reorder.down', { name: a.name })" (click)="vm.move(a.id, 1)">
                      <ng-icon name="lucideChevronDown" aria-hidden="true" />
                    </button>
                  </span>
                </td>
              }
              <td class="py-2">
                <span class="inline-flex flex-wrap items-center gap-2">
                  <span class="size-2.5 rounded-sm" [style.background]="vm.colors.color('account', a.id)"></span>
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

    <sf-chart-card [title]="vm.i18n.t('accounts.balanceHistory')" [table]="vm.table()" [loading]="vm.res.loading()" [initialLoading]="vm.res.initialLoading()" fileName="account-balances">
      @if (vm.options(); as o) {
        <sf-chart [options]="o" height="22rem" />
      }
    </sf-chart-card>
  `,
})
export class Accounts {
  protected readonly vm = accountsViewModel();
  private readonly router = inject(Router);

  protected open(id: string): void {
    void this.router.navigate(['/accounts', id], { queryParamsHandling: 'preserve' });
  }

  protected edit(event: Event, id: string): void {
    event.stopPropagation();
    this.vm.edit(id);
  }
}
