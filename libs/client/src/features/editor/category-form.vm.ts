import { signal } from '@angular/core';
import { maxLength, validate } from '@angular/forms/signals';
import type { CategoryEditPayload, CategoryWrite } from '@spacefly/shared';
import { entityFormViewModel, type EntityFormInputs } from './entity-form.vm';

export interface CategoryModel {
  name: string;
  notes: string;
}

/** Create or edit a category (name and notes). */
export function categoryFormViewModel(inputs: EntityFormInputs) {
  const model = signal<CategoryModel>({ name: '', notes: '' });
  return entityFormViewModel<CategoryModel, CategoryEditPayload>({
    ...inputs,
    kind: 'category',
    path: 'categories',
    model,
    schema: (p) => {
      validate(p.name, (c) => (c.value().trim() ? undefined : { kind: 'required' }));
      maxLength(p.name, 255);
      maxLength(p.notes, 65000);
    },
    blank: () => ({ name: '', notes: '' }),
    toModel: (p) => ({ name: p.name, notes: p.notes ?? '' }),
    toRequest: (m): CategoryWrite => ({ name: m.name.trim(), notes: m.notes.trim() || null }),
    displayName: (m) => m.name,
  });
}
