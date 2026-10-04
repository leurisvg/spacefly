import { readFileSync } from 'node:fs';

interface Tree {
  [key: string]: string | Tree;
}

/** Dotted paths of every leaf in a translation file. */
function leaves(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => (typeof value === 'string' ? [`${prefix}${key}`] : leaves(value, `${prefix}${key}.`)));
}

const load = (lang: string): Tree => JSON.parse(readFileSync(`libs/i18n/src/${lang}.json`, 'utf8'));

describe('i18n key parity', () => {
  const es = new Set(leaves(load('es')));
  const en = new Set(leaves(load('en')));

  it('has every Spanish key in English', () => {
    expect([...es].filter((k) => !en.has(k))).toEqual([]);
  });

  it('has every English key in Spanish', () => {
    expect([...en].filter((k) => !es.has(k))).toEqual([]);
  });
});
