/**
 * Tooltip and label formatters whose text is known when the option is built: each one is a lookup into a
 * table that the builder fills up front (`table[key]`, `''` when missing).
 */
type KeyKind = 'index' | 'name' | 'dataName' | 'path' | 'sankey';

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
  return (p: Params | Params[]) => {
    const k = keyOf(key, p);
    return k === undefined ? '' : ((table as Record<string, string>)[k] ?? '');
  };
}

/** A formatter that always returns `value`. */
export const constant = (value: string) => () => value;

/** Tooltip/label by data index: `build(i)` runs once per index when the option is built. */
export const byIndex = (count: number, build: (i: number) => string) => byKey('index', Array.from({ length: count }, (_, i) => build(i)));

/** Result by name: `entries` are `[name, text]`. */
export const byName = (entries: [string, string][], key: 'name' | 'dataName' = 'name') => byKey(key, Object.fromEntries(entries));
