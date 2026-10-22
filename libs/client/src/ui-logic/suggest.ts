import { fold } from './fold';

export interface Suggestion {
  value: string;
  label: string;
}

/**
 * The options to offer under a text field while it is typed into: those that contain the text (ignoring case and accents), best
 * matches (prefix) first, at most `max`. Nothing is offered once the text already is one of them, so the list closes by itself
 * after a pick.
 */
export function suggestionsFor(options: readonly Suggestion[], text: string, max = 6): Suggestion[] {
  const q = fold(text.trim());
  if (q && options.some((o) => fold(o.label) === q)) return [];
  const found = q ? options.filter((o) => fold(o.label).includes(q)) : options;
  const starts = (o: Suggestion) => (q && fold(o.label).startsWith(q) ? 0 : 1);
  return found
    .map((o, i) => ({ o, i }))
    .sort((a, b) => starts(a.o) - starts(b.o) || a.i - b.i)
    .slice(0, max)
    .map(({ o }) => o);
}
