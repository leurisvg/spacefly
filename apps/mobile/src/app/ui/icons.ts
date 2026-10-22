/**
 * Glyphs of the bundled Lucide icon font (`src/fonts/lucide.ttf`, ISC license; NativeScript registers it as the `lucide` family
 * from the file name). Use them as the text of a Label with `class="row-icon"` (or `tab-icon`); the codepoints come from the
 * font's codepoints.json.
 */
export const ICON = {
  dashboard: '', // layout-dashboard
  transactions: '', // receipt
  accounts: '', // landmark
  more: '', // ellipsis
  settings: '', // settings
  receipt: '', // receipt-text
  out: '', // log-out
  in: '', // log-in
  list: '', // clipboard-list
  budget: '', // bookmark
  tag: '', // tag
  notes: '', // file-text
  piggy: '', // piggy-bank
  currency: '', // circle-dollar-sign
  date: '', // calendar-clock
  repeat: '', // repeat
  clear: 'x', // x (this one sits on a plain letter in the font)
  swap: '', // arrow-up-down
  chevronDown: '', // chevron-down
  check: '', // check
} as const;

export type IconName = keyof typeof ICON;
