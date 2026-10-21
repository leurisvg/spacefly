import { signal } from '@angular/core';
import { maxLength, validate } from '@angular/forms/signals';
import { isIsoDate, type TagEditPayload, type TagWrite } from '@spacefly/shared';
import { entityFormViewModel, type EntityFormInputs } from './entity-form.vm';

export interface TagModel {
  tag: string;
  date: string;
  description: string;
}

/** Create or edit a tag (name, optional date and description). */
export function tagFormViewModel(inputs: EntityFormInputs) {
  const blank = (): TagModel => ({ tag: '', date: '', description: '' });
  return entityFormViewModel<TagModel, TagEditPayload>({
    ...inputs,
    kind: 'tag',
    path: 'tags',
    model: signal(blank()),
    schema: (p) => {
      validate(p.tag, (c) => (c.value().trim() ? undefined : { kind: 'required' }));
      maxLength(p.tag, 255);
      validate(p.date, (c) => (!c.value() || isIsoDate(c.value()) ? undefined : { kind: 'date' }));
      maxLength(p.description, 65000);
    },
    blank,
    toModel: (p) => ({ tag: p.tag, date: p.date ?? '', description: p.description ?? '' }),
    toRequest: (m): TagWrite => ({ tag: m.tag.trim(), date: m.date || null, description: m.description.trim() || null }),
    displayName: (m) => m.tag,
  });
}
