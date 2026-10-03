import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField as Field, maxLength, validate } from '@angular/forms/signals';
import type { CategoryEditPayload, CategoryWrite } from '@shared';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { HlmTextarea } from '@spartan-ng/helm/textarea';
import { FormField } from '../../shared/forms/form-field';
import { FormFooter } from '../../shared/forms/form-footer';
import { EntityForm } from './entity-form';

interface Model {
  name: string;
  notes: string;
}

/** Create or edit a category (name and notes). */
@Component({
  selector: 'sf-category-form',
  imports: [Field, HlmButton, HlmInput, HlmSkeleton, HlmTextarea, FormField, FormFooter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (state() === 'loading') {
      <div hlmSkeleton class="h-24 w-full"></div>
    } @else if (state() !== 'ready') {
      <p class="text-sm" role="alert">{{ i18n.t(state() === 'missing' ? 'editor.missing' : 'editor.loadError') }}</p>
      <div class="mt-3 flex gap-2">
        <button hlmBtn size="sm" variant="outline" type="button" (click)="cancel()">{{ i18n.t('editor.back') }}</button>
        @if (state() === 'error') {
          <button hlmBtn size="sm" type="button" (click)="reload()">{{ i18n.t('editor.retry') }}</button>
        }
      </div>
    } @else {
      <form class="flex flex-col gap-4" novalidate (submit)="$event.preventDefault(); save()">
        <sf-form-field [label]="i18n.t('editor.fields.name')" [required]="true" [field]="f.name">
          <input hlmInput type="text" class="h-9" autocomplete="off" [formField]="f.name" />
        </sf-form-field>
        <sf-form-field [label]="i18n.t('editor.fields.notes')" [field]="f.notes">
          <textarea hlmTextarea rows="3" [formField]="f.notes"></textarea>
        </sf-form-field>
        <sf-form-footer inset="sheet" [saving]="saving()" [canDelete]="isEdit()" (save)="save()" (dismissed)="cancel()" (remove)="remove()" />
      </form>
    }
  `,
})
export class CategoryForm extends EntityForm<Model, CategoryEditPayload> {
  protected readonly kind = 'category';
  protected readonly path = 'categories';
  protected readonly model = signal<Model>(this.blank());
  protected readonly f = form(this.model, (p) => {
    validate(p.name, (c) => (c.value().trim() ? undefined : { kind: 'required' }));
    maxLength(p.name, 255);
    maxLength(p.notes, 65000);
  });

  protected blank(): Model {
    return { name: '', notes: '' };
  }

  protected toModel(p: CategoryEditPayload): Model {
    return { name: p.name, notes: p.notes ?? '' };
  }

  protected toRequest(): CategoryWrite {
    const m = this.model();
    return { name: m.name.trim(), notes: m.notes.trim() || null };
  }

  protected displayName(): string {
    return this.model().name;
  }
}
