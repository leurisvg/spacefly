import { Dialogs } from '@nativescript/core';

export interface PickerOption {
  value: string;
  label: string;
}

/** Native action sheet for choosing one of `options`; resolves the chosen value or `null` when dismissed. */
export async function pickOne(title: string, options: readonly PickerOption[], cancel: string): Promise<string | null> {
  if (!options.length) return null;
  const labels = options.map((o) => o.label);
  const picked = await Dialogs.action({ title, cancelButtonText: cancel, actions: labels });
  const index = labels.indexOf(picked);
  return index < 0 ? null : options[index].value;
}
