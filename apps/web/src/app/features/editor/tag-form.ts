import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField as Field, maxLength, validate } from '@angular/forms/signals';
import { isIsoDate, type TagEditPayload, type TagWrite } from '@shared';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { HlmTextarea } from '@spartan-ng/helm/textarea';
import { DateInput } from '../../shared/forms/date-input';
import { FormField } from '../../shared/forms/form-field';
import { FormFooter } from '../../shared/forms/form-footer';
import { EntityForm } from './entity-form';

interface Model {
  tag: string;
  date: string;
  description: string;
}

/** Create or edit a tag (name, optional date and description). */
@Component({
  selector: 'sf-tag-form',
  imports: [Field, HlmButton, HlmInput, HlmSkeleton, HlmTextarea, DateInput, FormField, FormFooter],
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
        <sf-form-field [label]="i18n.t('editor.fields.name')" [required]="true" [field]="f.tag">
          <input hlmInput type="text" class="h-9" autocomplete="off" [formField]="f.tag" />
        </sf-form-field>
        <sf-form-field [label]="i18n.t('editor.entity.tag.date')" [hint]="i18n.t('editor.entity.tag.dateHint')" [field]="f.date">
          <div class="flex items-center gap-2">
            <sf-date-input [formField]="f.date" />
            @if (model().date) {
              <button hlmBtn type="button" variant="ghost" size="sm" (click)="f.date().value.set('')">{{ i18n.t('editor.clear') }}</button>
            }
          </div>
        </sf-form-field>
        <sf-form-field [label]="i18n.t('editor.fields.description')" [field]="f.description">
          <textarea hlmTextarea rows="3" [formField]="f.description"></textarea>
        </sf-form-field>
        <sf-form-footer inset="sheet" [saving]="saving()" [canDelete]="isEdit()" (save)="save()" (dismissed)="cancel()" (remove)="remove()" />
      </form>
    }
  `,
})
export class TagForm extends EntityForm<Model, TagEditPayload> {
  protected readonly kind = 'tag';
  protected readonly path = 'tags';
  protected readonly model = signal<Model>(this.blank());
  protected readonly f = form(this.model, (p) => {
    validate(p.tag, (c) => (c.value().trim() ? undefined : { kind: 'required' }));
    maxLength(p.tag, 255);
    validate(p.date, (c) => (!c.value() || isIsoDate(c.value()) ? undefined : { kind: 'date' }));
    maxLength(p.description, 65000);
  });

  protected blank(): Model {
    return { tag: '', date: '', description: '' };
  }

  protected toModel(p: TagEditPayload): Model {
    return { tag: p.tag, date: p.date ?? '', description: p.description ?? '' };
  }

  protected toRequest(): TagWrite {
    const m = this.model();
    return { tag: m.tag.trim(), date: m.date || null, description: m.description.trim() || null };
  }

  protected displayName(): string {
    return this.model().tag;
  }
}
