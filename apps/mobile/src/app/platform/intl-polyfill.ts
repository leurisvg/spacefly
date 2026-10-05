/**
 * The NativeScript Android V8 is built without ICU, so there is no `Intl` at all (iOS' JavaScriptCore has one).
 * `FormatService` needs NumberFormat and DateTimeFormat for the two locales the app ships (es-DO, en-US), so on a
 * runtime without `Intl` load the FormatJS polyfills and their data, in dependency order. Called before bootstrap.
 *
 * `DateTimeFormat` only ever runs with `timeZone: 'UTC'` here, which needs no time-zone data.
 */
export async function ensureIntl(): Promise<void> {
  const native = (globalThis as { Intl?: Partial<typeof Intl> }).Intl;
  if (native?.NumberFormat && native.DateTimeFormat) return;
  if (!native) (globalThis as { Intl?: unknown }).Intl = {};

  await import('@formatjs/intl-getcanonicallocales/polyfill-force.js');
  await import('@formatjs/intl-locale/polyfill-force.js');
  await import('@formatjs/intl-pluralrules/polyfill-force.js');
  await import('@formatjs/intl-pluralrules/locale-data/es.js');
  await import('@formatjs/intl-pluralrules/locale-data/en.js');
  await import('@formatjs/intl-numberformat/polyfill-force.js');
  await import('@formatjs/intl-numberformat/locale-data/es-DO.js');
  await import('@formatjs/intl-numberformat/locale-data/en.js');
  await import('@formatjs/intl-datetimeformat/polyfill-force.js');
  await import('@formatjs/intl-datetimeformat/locale-data/es-DO.js');
  await import('@formatjs/intl-datetimeformat/locale-data/en.js');
}
