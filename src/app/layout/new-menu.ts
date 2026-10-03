import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRightLeft, lucideFolderTree, lucidePiggyBank, lucidePlus, lucideReceipt, lucideTags, lucideTarget, lucideWallet } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { EntityEditor } from '../features/editor/entity-editor.service';

/** The "+ New" button of the top bar: starts a transaction or any other record. */
@Component({
  selector: 'sf-new-menu',
  imports: [NgIcon, RouterLink, TranslocoPipe, HlmButton, HlmDropdownMenuImports],
  providers: [provideIcons({ lucidePlus, lucideArrowRightLeft, lucideFolderTree, lucideTags, lucideTarget, lucideReceipt, lucideWallet, lucidePiggyBank })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button hlmBtn size="sm" [hlmDropdownMenuTrigger]="menu" align="end" [attr.aria-label]="'editor.newTitle' | transloco">
      <ng-icon name="lucidePlus" aria-hidden="true" /><span class="hidden sm:inline">{{ 'editor.new' | transloco }}</span>
    </button>
    <ng-template #menu>
      <hlm-dropdown-menu class="w-56">
        <a hlmDropdownMenuItem routerLink="/transactions/new"><ng-icon name="lucideArrowRightLeft" aria-hidden="true" />{{ 'editor.tx.new' | transloco }}</a>
        <hlm-dropdown-menu-separator />
        <button hlmDropdownMenuItem (triggered)="editor.open('category')"><ng-icon name="lucideFolderTree" aria-hidden="true" />{{ 'editor.entity.category.new' | transloco }}</button>
        <button hlmDropdownMenuItem (triggered)="editor.open('tag')"><ng-icon name="lucideTags" aria-hidden="true" />{{ 'editor.entity.tag.new' | transloco }}</button>
        <button hlmDropdownMenuItem (triggered)="editor.open('budget')"><ng-icon name="lucideTarget" aria-hidden="true" />{{ 'editor.entity.budget.new' | transloco }}</button>
        <button hlmDropdownMenuItem (triggered)="editor.open('bill')"><ng-icon name="lucideReceipt" aria-hidden="true" />{{ 'editor.entity.bill.new' | transloco }}</button>
        <hlm-dropdown-menu-separator />
        <button hlmDropdownMenuItem (triggered)="editor.open('account')"><ng-icon name="lucideWallet" aria-hidden="true" />{{ 'editor.entity.account.new' | transloco }}</button>
        <button hlmDropdownMenuItem (triggered)="editor.open('piggy')"><ng-icon name="lucidePiggyBank" aria-hidden="true" />{{ 'editor.entity.piggy.new' | transloco }}</button>
      </hlm-dropdown-menu>
    </ng-template>
  `,
})
export class NewMenu {
  protected readonly editor = inject(EntityEditor);
}
