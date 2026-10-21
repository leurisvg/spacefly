import { Component, computed, inject, NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouterExtensions } from '@nativescript/angular';
import { I18n } from '@spacefly/client/i18n/i18n';
import type { EntityKind } from '@spacefly/client/state/entity-editor.service';
import type { AccountWriteType } from '@spacefly/shared';
import { AccountForm } from './entity/account-form';
import { BillForm } from './entity/bill-form';
import { BudgetForm } from './entity/budget-form';
import { CategoryForm } from './entity/category-form';
import { PiggyForm } from './entity/piggy-form';
import { TagForm } from './entity/tag-form';

const KINDS: EntityKind[] = ['category', 'tag', 'budget', 'bill', 'account', 'piggy'];
const ACCOUNT_TYPES: AccountWriteType[] = ['asset', 'liability', 'expense', 'revenue'];

/** Create (`/edit/:kind`) or edit (`/edit/:kind/:id`) a category, tag, budget, subscription, account or goal. */
@Component({
  selector: 'ns-entity-form',
  imports: [AccountForm, BillForm, BudgetForm, CategoryForm, PiggyForm, TagForm],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar [title]="title()"></ActionBar>
    <ScrollView class="screen">
      <StackLayout class="screen-pad">
        @switch (kind) {
          @case ('category') {
            <ns-category-form [id]="id" (done)="close()" />
          }
          @case ('tag') {
            <ns-tag-form [id]="id" (done)="close()" />
          }
          @case ('budget') {
            <ns-budget-form [id]="id" (done)="close()" />
          }
          @case ('bill') {
            <ns-bill-form [id]="id" (done)="close()" />
          }
          @case ('account') {
            <ns-account-form [id]="id" [accountType]="accountType" (done)="close()" />
          }
          @case ('piggy') {
            <ns-piggy-form [id]="id" (done)="close()" />
          }
        }
      </StackLayout>
    </ScrollView>
  `,
})
export class EntityFormScreen {
  private readonly i18n = inject(I18n);
  private readonly router = inject(RouterExtensions);
  private readonly route = inject(ActivatedRoute).snapshot;

  protected readonly kind = (KINDS.find((k) => k === this.route.paramMap.get('kind')) ?? 'category') as EntityKind;
  protected readonly id = this.route.paramMap.get('id');
  protected readonly accountType = (ACCOUNT_TYPES.find((t) => t === this.route.queryParamMap.get('type')) ?? 'asset') as AccountWriteType;
  protected readonly title = computed(() => this.i18n.t(`editor.entity.${this.kind}.${this.id ? 'edit' : 'new'}`));

  protected close(): void {
    this.router.back();
  }
}
