import { Component, inject, NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterExtensions } from '@nativescript/angular';
import type { ItemEventData } from '@nativescript/core';
import { explorerViewModel } from '@spacefly/client/features/transactions/explorer.vm';
import { FormatService } from '@spacefly/client/format/format.service';
import type { TxRow } from '@spacefly/shared';
import { EmptyState } from '../ui/empty-state';
import { Money } from '../ui/money';

const TYPES = ['', 'withdrawal', 'deposit', 'transfer'] as const;

/** The transactions tab: the period's ledger with search, a type filter and pagination; tap a row for its detail. */
@Component({
  selector: 'ns-transactions',
  imports: [EmptyState, Money],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <GridLayout rows="auto, auto, *, auto">
      <GridLayout row="0" columns="*, auto" class="screen-pad">
        <TextField col="0" class="field" [hint]="vm.i18n.t('explorer.searchPlaceholder')" returnKeyType="search" [text]="vm.draft()" (textChange)="vm.draft.set($any($event).value)" (returnPress)="vm.submitSearch()"></TextField>
        <Label col="1" [text]="vm.i18n.t('explorer.search')" class="chip" verticalAlignment="top" marginTop="2" (tap)="vm.submitSearch()"></Label>
      </GridLayout>

      <ScrollView row="1" orientation="horizontal" class="screen-pad" paddingTop="0">
        <StackLayout orientation="horizontal">
          @for (t of types; track t) {
            <Label [text]="t ? vm.i18n.t('txType.' + t) : vm.i18n.t('explorer.allTypes')" class="chip" [class.chip-on]="vm.type() === t" (tap)="vm.type.set(t)"></Label>
          }
        </StackLayout>
      </ScrollView>

      <GridLayout row="2">
        @if (vm.loading() && !vm.pageRows().length) {
          <ActivityIndicator busy="true" horizontalAlignment="center" verticalAlignment="center"></ActivityIndicator>
        } @else if (!vm.pageRows().length) {
          <ns-empty [title]="vm.i18n.t('tx.none')" />
        } @else {
          <ListView [items]="vm.pageRows()" (itemTap)="open($any($event))">
            <ng-template let-tx="item">
              <GridLayout columns="*, auto" class="row-divider" padding="12">
                <StackLayout col="0">
                  <Label [text]="tx.description" textWrap="false"></Label>
                  <Label [text]="f.date(tx.date, 'short') + ' · ' + (tx.category?.name || vm.i18n.t('common.uncategorized'))" class="muted small" textWrap="false"></Label>
                </StackLayout>
                <ns-money col="1" [value]="tx.type === 'withdrawal' ? -tx.amount : tx.amount" [signed]="tx.type !== 'transfer'" [tone]="tx.type === 'withdrawal' ? 'expense' : tx.type === 'deposit' ? 'income' : 'none'" />
              </GridLayout>
            </ng-template>
          </ListView>
        }
        <Label text="＋" class="fab" horizontalAlignment="right" verticalAlignment="bottom" (tap)="add()"></Label>
      </GridLayout>

      <GridLayout row="3" columns="auto, *, auto" class="screen-pad">
        <Label col="0" text="‹" class="chip" [isEnabled]="vm.page() > 1" (tap)="vm.page.set(vm.page() - 1)"></Label>
        <Label col="1" [text]="vm.i18n.t('explorer.page', { page: vm.page(), pages: vm.totalPages() })" class="muted small" horizontalAlignment="center" verticalAlignment="center"></Label>
        <Label col="2" text="›" class="chip" [isEnabled]="vm.page() < vm.totalPages()" (tap)="vm.page.set(vm.page() + 1)"></Label>
      </GridLayout>
    </GridLayout>
  `,
})
export class Transactions {
  protected readonly vm = explorerViewModel();
  protected readonly f = inject(FormatService);
  private readonly router = inject(RouterExtensions);
  protected readonly types = TYPES;

  protected open(event: ItemEventData): void {
    const tx = this.vm.pageRows()[event.index] as TxRow | undefined;
    if (tx) void this.router.navigate(['/transactions', tx.groupId]);
  }

  protected add(): void {
    void this.router.navigate(['/transactions/new']);
  }
}
