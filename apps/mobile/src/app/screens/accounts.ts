import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { accountsViewModel } from '@spacefly/client/features/accounts/accounts.vm';
import { money } from '@spacefly/client/charts/series-colors';
import { ChartWebView } from '../ui/chart-webview';
import { KpiCard } from '../ui/kpi-card';
import { Money } from '../ui/money';
import { EmptyState } from '../ui/empty-state';

/** The accounts tab: total balance, each asset account with its balance, and the balance history. Reordering is web-only for now. */
@Component({
  selector: 'ns-accounts',
  imports: [ChartWebView, EmptyState, KpiCard, Money],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ScrollView>
      <StackLayout class="screen-pad">
        @if (vm.res.error() && !vm.r()) {
          <ns-empty [error]="true" [title]="vm.i18n.t('errors.load')" />
        }
        <ns-kpi [label]="vm.i18n.t('accounts.total')" [value]="vm.r()?.total ?? null" [accent]="money.net()" />

        <StackLayout class="card" marginTop="8">
          @for (a of vm.rows(); track a.id) {
            <GridLayout columns="auto, *, auto" rows="auto, auto" class="row-divider">
              <Label col="0" row="0" rowSpan="2" text="●" [style.color]="vm.colors.color('account', a.id)" marginRight="8" verticalAlignment="center"></Label>
              <Label col="1" row="0" [text]="a.name" textWrap="false" [opacity]="a.excluded ? 0.5 : 1"></Label>
              <Label col="1" row="1" [text]="a.currency + (a.role ? ' · ' + vm.i18n.t('accounts.roles.' + a.role) : '')" class="muted small"></Label>
              <ns-money col="2" row="0" [value]="a.balance" tone="auto" />
              @if (a.currency !== vm.filters.currency()) {
                <ns-money col="2" row="1" [value]="a.balanceOriginal" [currency]="a.currency" class="small" />
              }
            </GridLayout>
          } @empty {
            <Label [text]="vm.i18n.t('common.noData')" class="muted"></Label>
          }
        </StackLayout>

        @if (vm.options(); as o) {
          <StackLayout class="card">
            <Label [text]="vm.i18n.t('accounts.balanceHistory')" class="card-title"></Label>
            <ns-chart [options]="o" [height]="260" />
          </StackLayout>
        }
      </StackLayout>
    </ScrollView>
  `,
})
export class Accounts {
  protected readonly vm = accountsViewModel();
  protected readonly money = money;
}
