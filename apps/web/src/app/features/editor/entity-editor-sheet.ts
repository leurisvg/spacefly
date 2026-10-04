import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { I18n } from '@spacefly/client/i18n/i18n';
import { AccountForm } from './account-form';
import { BillForm } from './bill-form';
import { BudgetForm } from './budget-form';
import { CategoryForm } from './category-form';
import { EntityEditor } from '@spacefly/client/state/entity-editor.service';
import { PiggyForm } from './piggy-form';
import { TagForm } from './tag-form';

/** Right-hand panel hosting the form of whichever record `EntityEditor` was asked to open. */
@Component({
  selector: 'sf-entity-editor-sheet',
  imports: [HlmSheetImports, AccountForm, BillForm, BudgetForm, CategoryForm, PiggyForm, TagForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-sheet side="right" [state]="open() ? 'open' : 'closed'" (closed)="editor.close()">
      <hlm-sheet-content *hlmSheetPortal="let ctx" class="w-full gap-0 p-0 sm:max-w-md">
        <hlm-sheet-header class="border-b border-border px-5 pb-4 pt-5">
          <h2 hlmSheetTitle class="pr-8 text-base">{{ title() }}</h2>
        </hlm-sheet-header>
        <div class="flex-1 overflow-y-auto px-5 py-4">
          @if (req(); as r) {
            @switch (r.kind) {
              @case ('category') {
                <sf-category-form [id]="r.id" (done)="editor.close()" />
              }
              @case ('tag') {
                <sf-tag-form [id]="r.id" (done)="editor.close()" />
              }
              @case ('budget') {
                <sf-budget-form [id]="r.id" (done)="editor.close()" />
              }
              @case ('bill') {
                <sf-bill-form [id]="r.id" (done)="editor.close()" />
              }
              @case ('account') {
                <sf-account-form [id]="r.id" [accountType]="r.accountType ?? 'asset'" (done)="editor.close()" />
              }
              @case ('piggy') {
                <sf-piggy-form [id]="r.id" (done)="editor.close()" />
              }
            }
          }
        </div>
      </hlm-sheet-content>
    </hlm-sheet>
  `,
})
export class EntityEditorSheet {
  protected readonly editor = inject(EntityEditor);
  private readonly i18n = inject(I18n);
  private readonly router = inject(Router);
  protected readonly req = this.editor.request;
  protected readonly open = computed(() => this.req() !== null);
  protected readonly title = computed(() => {
    const r = this.req();
    return r ? this.i18n.t(`editor.entity.${r.kind}.${r.id ? 'edit' : 'new'}`) : '';
  });

  constructor() {
    // Leaving the page (say, by following a link) leaves the panel behind.
    this.router.events
      .pipe(
        filter((e): e is NavigationStart => e instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        if (e.url.split('?')[0] !== this.router.url.split('?')[0]) this.editor.close();
      });
  }
}
