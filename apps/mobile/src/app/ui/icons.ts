/**
 * Glyphs of the bundled Lucide icon font (`src/fonts/lucide.ttf`, ISC license; NativeScript registers it as the `lucide` family
 * from the file name). Use them as the text of a Label with `class="icon"`; the codepoints come from the font's codepoints.json.
 */
export const ICON = {
  dashboard: '', // layout-dashboard
  transactions: '', // receipt
  accounts: '', // landmark
  more: '', // ellipsis
  settings: '', // settings
} as const;

export type IconName = keyof typeof ICON;
