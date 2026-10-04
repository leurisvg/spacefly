/**
 * Portable ECharts options.
 *
 * Mobile renders charts inside a WebView, so the option has to cross a JSON boundary. JSON has no
 * functions, but chart options are full of formatters. Every formatter in a shared builder is therefore
 * created with `tagged(spec, fn)`: on web `fn` runs as-is (a live closure), while `toPortableOption()`
 * swaps it for its serializable `spec` and `hydrateOption()` (which runs inside the WebView) rebuilds an
 * equivalent function from that spec. An untagged function makes `toPortableOption()` throw, and
 * `portable.spec.ts` runs every builder through it, so a builder that breaks portability fails in CI.
 *
 * Specs are data, not code:
 * - `compact`: the "12.9K" number format (locale, currency symbol and privacy flag captured at build time).
 * - `const`: a formatter whose result does not depend on its input.
 * - `byKey`: results precomputed per tooltip/label target, looked up by data index, name, tree path or sankey edge.
 */
export interface CompactSpec {
  k: 'compact';
  locale: string;
  /** `null` formats the bare number. */
  symbol: string | null;
  hidden: boolean;
  /** `self`: the formatter receives the number (axis labels); `value`: it receives `{ value }` (series labels). */
  field: 'self' | 'value';
  /** Format a zero as an empty label. */
  blankZero: boolean;
}

export type KeyKind = 'index' | 'name' | 'dataName' | 'path' | 'sankey';

export type FormatterSpec =
  | CompactSpec
  | { k: 'const'; value: string }
  | { k: 'byKey'; key: KeyKind; table: string[] | Record<string, string> };

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
const specs = new WeakMap<Function, FormatterSpec>();

/** Marks `fn` as portable, described by `spec`. Returns `fn` itself. */
export function tagged<F extends (...args: never[]) => unknown>(spec: FormatterSpec, fn: F): F {
  specs.set(fn, spec);
  return fn;
}

/** A formatter that always returns `value`. */
export const constant = (value: string) => tagged({ k: 'const', value }, () => value);

interface Params {
  dataIndex?: number;
  name?: string;
  data?: { name?: string; source?: string; target?: string };
  treePathInfo?: { name: string }[];
  dataType?: string;
}

function keyOf(kind: KeyKind, p: Params | Params[]): string | number | undefined {
  const one = Array.isArray(p) ? p[0] : p;
  switch (kind) {
    case 'index':
      return one.dataIndex;
    case 'name':
      return one.name;
    case 'dataName':
      return one.data?.name;
    case 'path':
      return one.treePathInfo?.slice(1).map((x) => x.name).join(' › ');
    case 'sankey':
      return one.dataType === 'edge' ? `${one.data?.source}→${one.data?.target}` : one.data?.name;
  }
}

/** A formatter whose results are known up front: `table[key]`, `''` when missing. */
export function byKey(key: KeyKind, table: string[] | Record<string, string>) {
  return tagged({ k: 'byKey', key, table }, (p: Params | Params[]) => {
    const k = keyOf(key, p);
    return k === undefined ? '' : ((table as Record<string, string>)[k] ?? '');
  });
}

/** Tooltip/label by data index: `build(i)` runs once per index when the option is built. */
export const byIndex = (count: number, build: (i: number) => string) => byKey('index', Array.from({ length: count }, (_, i) => build(i)));

/** Result by name: `entries` are `[name, text]`. */
export const byName = (entries: [string, string][], key: 'name' | 'dataName' = 'name') => byKey(key, Object.fromEntries(entries));

/** Replaces every tagged formatter by `{ __fn: spec }`; throws on any other function. */
export function toPortableOption(option: unknown): unknown {
  const walk = (value: unknown, path: string): unknown => {
    if (typeof value === 'function') {
      const spec = specs.get(value);
      if (!spec) throw new Error(`Untagged formatter at ${path}: wrap it in tagged() so it can run in the WebView`);
      return { __fn: spec };
    }
    if (Array.isArray(value)) return value.map((v, i) => walk(v, `${path}[${i}]`));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v, `${path}.${k}`)]));
    }
    return value;
  };
  return walk(option, 'option');
}

/**
 * Rebuilds the formatters of a portable option. SELF-CONTAINED: it must not reference anything outside
 * its own body, because `hydrateSource()` ships its source text into the WebView.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function hydrateOption(input: any): any {
  const formats: Record<string, Intl.NumberFormat> = {};
  const compact = (spec: any) => {
    const cache = spec.locale;
    const nf = (formats[cache] ??= new Intl.NumberFormat(spec.locale, { notation: 'compact', maximumFractionDigits: 1 }));
    return (arg: any) => {
      const value = spec.field === 'value' ? (arg && arg.value) : arg;
      if (spec.blankZero && !value) return '';
      if (value === null || value === undefined) return '—';
      const v = spec.hidden ? 0 : value;
      const sign = v < 0 ? '−' : '';
      return sign + (spec.symbol === null ? '' : spec.symbol) + nf.format(Math.abs(v));
    };
  };
  const keyOf = (kind: string, p: any) => {
    const one = Array.isArray(p) ? p[0] : p;
    if (kind === 'index') return one.dataIndex;
    if (kind === 'name') return one.name;
    if (kind === 'dataName') return one.data && one.data.name;
    if (kind === 'path') return one.treePathInfo && one.treePathInfo.slice(1).map((x: any) => x.name).join(' › ');
    return one.dataType === 'edge' ? one.data.source + '→' + one.data.target : one.data && one.data.name;
  };
  const make = (spec: any) => {
    if (spec.k === 'compact') return compact(spec);
    if (spec.k === 'const') return () => spec.value;
    return (p: any) => {
      const k = keyOf(spec.key, p);
      if (k === undefined || k === null) return '';
      const hit = spec.table[k];
      return hit === undefined ? '' : hit;
    };
  };
  const walk = (v: any): any => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      if (v.__fn && typeof v.__fn === 'object') return make(v.__fn);
      const out: any = {};
      for (const k of Object.keys(v)) out[k] = walk(v[k]);
      return out;
    }
    return v;
  };
  return walk(input);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** The hydrate function as source text, to inject into the WebView page. */
export const hydrateSource = (): string => `(${hydrateOption.toString()})`;
