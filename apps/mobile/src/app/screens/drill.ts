import { Component, inject, NO_ERRORS_SCHEMA, OnDestroy } from '@angular/core';
import { RouterExtensions } from '@nativescript/angular';
import { txDetailViewModel } from '@spacefly/client/features/transactions/tx-detail.vm';
import { FormatService } from '@spacefly/client/format/format.service';
import { I18n } from '@spacefly/client/i18n/i18n';
import { EmptyState } from '../ui/empty-state';
import { Money } from '../ui/money';

/** The transactions behind a tapped chart element or row (income vs expense month, a category, a budget), grouped by type and category. */
@Component({
  selector: 'ns-drill',
  imports: [EmptyState, Money],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar [title]="vm.req()?.title ?? ''"></ActionBar>
    <ScrollView class="screen">
      <StackLayout class="screen-pad">
        <Label [text]="(vm.req()?.subtitle ?? '') + ' ' + f.date(vm.range().start, 'short') + ' – ' + f.date(vm.range().end, 'long')" class="muted small" textWrap="true"></Label>

        @if (vm.data(); as d) {
          <GridLayout columns="*, *, *" marginTop="8" marginBottom="8">
            <StackLayout col="0"><Label [text]="i18n.t('common.income')" class="eyebrow"></Label><ns-money [value]="d.totals.income" tone="income" /></StackLayout>
            <StackLayout col="1"><Label [text]="i18n.t('common.expenses')" class="eyebrow"></Label><ns-money [value]="-d.totals.expense" tone="expense" /></StackLayout>
            <StackLayout col="2"><Label [text]="i18n.t('tx.count')" class="eyebrow"></Label><Label [text]="'' + d.rows.length"></Label></StackLayout>
          </GridLayout>
        }

        @if (vm.req()?.breakdown; as rows) {
          <StackLayout class="card">
            @for (r of rows; track r.id ?? 'none') {
              <GridLayout columns="*, auto" class="row-divider" (tap)="vm.drill(r)">
                <Label col="0" [text]="r.name" textWrap="false"></Label>
                <ns-money col="1" [value]="r.value" />
              </GridLayout>
            }
          </StackLayout>
        }

        @if (vm.res.isLoading() && !vm.data()) {
          <ActivityIndicator busy="true"></ActivityIndicator>
        } @else {
          @for (g of vm.groups(); track g.key) {
            <StackLayout class="card">
              <GridLayout columns="*, auto">
                <Label col="0" [text]="g.type + ' · ' + (g.category || '—')" class="eyebrow" textWrap="false"></Label>
                <ns-money col="1" [value]="g.total" />
              </GridLayout>
              @for (tx of g.rows; track tx.id) {
                <GridLayout columns="*, auto" class="row-divider" (tap)="open(tx.groupId)">
                  <StackLayout col="0">
                    <Label [text]="tx.description" textWrap="false"></Label>
                    <Label [text]="f.date(tx.date, 'short')" class="muted small"></Label>
                  </StackLayout>
                  <ns-money col="1" [value]="tx.type === 'withdrawal' ? -tx.amount : tx.amount" />
                </GridLayout>
              }
            </StackLayout>
          } @empty {
            <ns-empty [title]="i18n.t('tx.none')" />
          }
        }
      </StackLayout>
    </ScrollView>
  `,
})
export class Drill implements OnDestroy {
  protected readonly vm = txDetailViewModel();
  protected readonly f = inject(FormatService);
  protected readonly i18n = inject(I18n);
  private readonly router = inject(RouterExtensions);

  protected open(groupId: string): void {
    void this.router.navigate(['/transactions', groupId]);
  }

  ngOnDestroy(): void {
    this.vm.detail.close();
  }
}
