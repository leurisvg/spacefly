import { Component, inject, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouterExtensions } from '@nativescript/angular';
import { Utils } from '@nativescript/core';
import { txViewViewModel } from '@spacefly/client/features/transactions/tx-view.vm';
import { FormatService } from '@spacefly/client/format/format.service';
import { EmptyState } from '../ui/empty-state';
import { Money } from '../ui/money';

/** One transaction: its fields, with edit and delete when SpaceFly can edit it (single-part expenses, income and transfers). */
@Component({
  selector: 'ns-transaction-view',
  imports: [EmptyState, Money],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar [title]="vm.tx()?.description ?? vm.i18n.t('nav.explorer')"></ActionBar>
    <ScrollView class="screen">
      <StackLayout class="screen-pad">
        @switch (vm.state()) {
          @case ('loading') {
            <ActivityIndicator busy="true"></ActivityIndicator>
          }
          @case ('missing') {
            <ns-empty [title]="vm.i18n.t('editor.tx.missing')" />
          }
          @case ('error') {
            <ns-empty [error]="true" [title]="vm.i18n.t('editor.tx.loadError')" />
            <Button [text]="vm.i18n.t('editor.retry')" class="btn btn-outline" (tap)="vm.reload()"></Button>
          }
          @case ('notEditable') {
            <StackLayout class="card">
              <Label [text]="vm.i18n.t('editor.tx.notEditable.title')" class="card-title"></Label>
              <Label [text]="vm.i18n.t('editor.tx.notEditable.' + (vm.blockedReason() === 'type' ? 'type' : 'splits'))" textWrap="true"></Label>
            </StackLayout>
            @if (vm.fireflyUrl(); as url) {
              <Button [text]="vm.i18n.t('editor.tx.editInFirefly')" class="btn btn-outline" (tap)="openUrl(url)"></Button>
            }
            <Button [text]="vm.i18n.t('forms.delete')" class="btn btn-danger" marginTop="8" (tap)="vm.remove()"></Button>
          }
          @case ('ready') {
            @if (vm.tx(); as tx) {
              <StackLayout class="card">
                <Label [text]="tx.description" class="card-title" textWrap="true"></Label>
                <Label [text]="vm.i18n.t('txType.' + tx.type) + ' · ' + f.date(tx.date, 'full') + (tx.time ? ' ' + tx.time : '')" class="muted small" textWrap="true"></Label>
                <ns-money [value]="tx.type === 'withdrawal' ? -+tx.amount : +tx.amount" [currency]="tx.currency" [tone]="tx.type === 'withdrawal' ? 'expense' : tx.type === 'deposit' ? 'income' : 'none'" marginTop="8" />
                @if (tx.foreignAmount) {
                  <Label [text]="tx.foreignAmount + ' ' + tx.foreignCurrency" class="muted small"></Label>
                }
              </StackLayout>
              <StackLayout class="card">
                <Label [text]="vm.i18n.t('editor.tx.from')" class="field-label"></Label>
                <Label [text]="tx.source.name"></Label>
                <Label [text]="vm.i18n.t('editor.tx.to')" class="field-label" marginTop="8"></Label>
                <Label [text]="tx.destination.name"></Label>
                @if (tx.category) {
                  <Label [text]="vm.i18n.t('common.category')" class="field-label" marginTop="8"></Label>
                  <Label [text]="tx.category"></Label>
                }
                @if (tx.tags.length) {
                  <Label [text]="vm.i18n.t('common.tag')" class="field-label" marginTop="8"></Label>
                  <Label [text]="tx.tags.join(', ')" textWrap="true"></Label>
                }
                @if (tx.notes) {
                  <Label [text]="vm.i18n.t('editor.tx.notes')" class="field-label" marginTop="8"></Label>
                  <Label [text]="tx.notes" textWrap="true"></Label>
                }
              </StackLayout>
              <Button [text]="vm.i18n.t('editor.tx.edit')" class="btn" (tap)="edit()"></Button>
              <Button [text]="vm.i18n.t('forms.delete')" class="btn btn-danger" marginTop="8" [isEnabled]="!vm.busy()" (tap)="vm.remove()"></Button>
            }
          }
        }
      </StackLayout>
    </ScrollView>
  `,
})
export class TransactionView {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(RouterExtensions);
  protected readonly f = inject(FormatService);
  protected readonly vm = txViewViewModel(signal(this.route.snapshot.paramMap.get('id') ?? undefined));

  protected edit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) void this.router.navigate(['/transactions', id, 'edit']);
  }

  protected openUrl(url: string): void {
    Utils.openUrl(url);
  }
}
