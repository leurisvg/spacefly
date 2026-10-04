export const LANG_KEY = 'spacefly.lang';
export const LANGS = ['es', 'en'] as const;
export type Lang = (typeof LANGS)[number];

/** The saved language if valid, else English for English devices, else Spanish. */
export function initialLang(saved: string | null | undefined, deviceLang: string | null | undefined): Lang {
  if (saved === 'es' || saved === 'en') return saved;
  return deviceLang?.toLowerCase().startsWith('en') ? 'en' : 'es';
}
