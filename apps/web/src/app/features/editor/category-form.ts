import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormField as Field } from '@angular/forms/signals';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { HlmTextarea } from '@spartan-ng/helm/textarea';
import { FormField } from '../../shared/forms/form-field';
import { FormFooter } from '../../shared/forms/form-footer';
import { categoryFormViewModel } from '@spacefly/client/features/editor/category-form.vm';
import { EntityForm } from './entity-form';

/** Create or edit a category (name and notes). */
@Component({
  selector: 'sf-category-form',
  imports: [Field, HlmButton, HlmInput, HlmSkeleton, HlmTextarea, FormField, FormFooter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (vm.state() === 'loading') {
      <div hlmSkeleton class="h-24 w-full"></div>
    } @else if (vm.state() !== 'ready') {
      <p class="text-sm" role="alert">{{ vm.i18n.t(vm.state() === 'missing' ? 'editor.missing' : 'editor.loadError') }}</p>
      <div class="mt-3 flex gap-2">
        <button hlmBtn size="sm" variant="outline" type="button" (click)="vm.cancel()">{{ vm.i18n.t('editor.back') }}</button>
        @if (vm.state() === 'error') {
          <button hlmBtn size="sm" type="button" (click)="vm.reload()">{{ vm.i18n.t('editor.retry') }}</button>
        }
      </div>
    } @else {
      <form class="flex flex-col gap-4" novalidate (submit)="$event.preventDefault(); vm.save()">
        <sf-form-field [label]="vm.i18n.t('editor.fields.name')" [required]="true" [field]="vm.f.name">
          <input hlmInput type="text" class="h-9" autocomplete="off" [formField]="vm.f.name" />
        </sf-form-field>
        <sf-form-field [label]="vm.i18n.t('editor.fields.notes')" [field]="vm.f.notes">
          <textarea hlmTextarea rows="3" [formField]="vm.f.notes"></textarea>
        </sf-form-field>
        <sf-form-footer inset="sheet" [saving]="vm.saving()" [canDelete]="vm.isEdit()" (save)="vm.save()" (dismissed)="vm.cancel()" (remove)="vm.remove()" />
      </form>
    }
  `,
})
export class CategoryForm extends EntityForm {
  protected readonly vm = categoryFormViewModel({ id: this.id, done: () => this.done.emit() });
}
