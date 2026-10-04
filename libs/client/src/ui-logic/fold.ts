// The NativeScript Android V8 has no ICU: `\p{…}` throws at parse time and `normalize()` is a no-op there.
// So accents are stripped with an explicit table instead of NFD plus a Unicode property.
const LETTERS: Record<string, string> = {
  a: 'àáâãäåāăą',
  c: 'çćč',
  d: 'ďđ',
  e: 'èéêëēėęě',
  g: 'ğ',
  i: 'ìíîïīįı',
  l: 'ł',
  n: 'ñńň',
  o: 'òóôõöøōő',
  r: 'ŕř',
  s: 'śšş',
  t: 'ť',
  u: 'ùúûüūůűų',
  y: 'ýÿ',
  z: 'źżž',
};
const BASE = new Map<string, string>(Object.entries(LETTERS).flatMap(([base, chars]) => [...chars].map((c): [string, string] => [c, base])));

/** Lower-case and strip accents so "cafe" finds "Café". */
export const fold = (s: string): string => {
  let out = '';
  for (const c of s.toLowerCase()) out += BASE.get(c) ?? c;
  return out.replace(/[̀-ͯ]/g, '');
};
