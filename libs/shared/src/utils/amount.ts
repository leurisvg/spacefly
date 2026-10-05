/**
 * Money travels between browser and server as decimal strings ("1234.56"), never as floats,
 * so the digits the user typed reach Firefly untouched.
 */

const count = (s: string, ch: string): number => s.split(ch).length - 1;

/**
 * Parses what a person types into a canonical decimal string, or `null` when it isn't a number.
 * Handles `1,234.56`, `1234,5` and `1.234,56`. A lone separator followed by exactly three digits
 * is ambiguous (`1,234`); `decimal` says which character the user's locale uses as decimal mark.
 */
export function parseAmount(input: string, decimal: '.' | ',' = '.'): string | null {
  let s = input.trim().replace(/[\s\u00a0']/g, '');
  let sign = '';
  if (s.startsWith('-') || s.startsWith('+')) {
    if (s[0] === '-') sign = '-';
    s = s.slice(1);
  }
  if (!/^[\d.,]*\d[\d.,]*$/.test(s)) return null;

  let decimalMark: '.' | ',' | null = null;
  let groupMark: '.' | ',' | null = null;
  const dots = count(s, '.');
  const commas = count(s, ',');
  if (dots && commas) {
    decimalMark = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
    groupMark = decimalMark === '.' ? ',' : '.';
  } else if (dots || commas) {
    const sep = dots ? '.' : ',';
    const after = s.length - s.lastIndexOf(sep) - 1;
    if (count(s, sep) > 1 || (after === 3 && sep !== decimal)) groupMark = sep;
    else decimalMark = sep;
  }

  let int = s;
  let frac = '';
  if (decimalMark) {
    if (count(s, decimalMark) !== 1) return null;
    [int, frac] = s.split(decimalMark) as [string, string];
  }
  if (groupMark) {
    if (frac.includes(groupMark)) return null;
    const parts = int.split(groupMark);
    if (!/^\d{1,3}$/.test(parts[0]!) || parts.slice(1).some((p) => !/^\d{3}$/.test(p))) return null;
    int = parts.join('');
  }
  if (!/^\d*$/.test(int) || !/^\d*$/.test(frac) || (!int && !frac)) return null;
  int = int.replace(/^0+(?=\d)/, '') || '0';
  const out = frac ? `${int}.${frac}` : int;
  return Number(out) === 0 ? out : sign + out;
}

/** `true` for a canonical decimal string strictly greater than zero. */
export function isPositiveAmount(value: string | null | undefined): boolean {
  return !!value && /^\d+(\.\d+)?$/.test(value) && Number(value) > 0;
}

/**
 * Drops the padding zeros Firefly stores amounts with ("12800.00000000" → "12800.00"), keeping at least two decimals
 * and every digit that carries value ("0.12345600" → "0.123456"). Anything that isn't a plain decimal is returned as is.
 */
export function trimAmountZeros(value: string): string {
  const m = /^(-?\d+)\.(\d+)$/.exec(value);
  if (!m) return value;
  const fraction = m[2].replace(/0+$/, '').padEnd(2, '0');
  return `${m[1]}.${fraction}`;
}
