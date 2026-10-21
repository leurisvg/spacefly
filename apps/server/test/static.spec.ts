import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { catalogVersion } from '../src/app';
import { setup } from './harness';

function site(catalogs: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), 'spacefly-static-'));
  writeFileSync(join(root, 'index.html'), '<!doctype html><html><head><title>SpaceFly</title></head><body></body></html>');
  mkdirSync(join(root, 'i18n'));
  for (const [name, text] of Object.entries(catalogs)) writeFileSync(join(root, 'i18n', name), text);
  return root;
}

describe('translation catalogs', () => {
  it('hashes their content: the same texts give the same version and any change gives another', async () => {
    const a = await catalogVersion(site({ 'es.json': '{"a":"1"}', 'en.json': '{"a":"1"}' }));
    const same = await catalogVersion(site({ 'es.json': '{"a":"1"}', 'en.json': '{"a":"1"}' }));
    const changed = await catalogVersion(site({ 'es.json': '{"a":"1"}', 'en.json': '{"a":"2"}' }));
    expect(a).toMatch(/^[0-9a-f]{10}$/);
    expect(same).toBe(a);
    expect(changed).not.toBe(a);
  });

  it('has no version without catalogs', async () => {
    expect(await catalogVersion('/nonexistent')).toBeNull();
  });

  it('stamps the page with the version so the app asks for a new URL after a deploy', async () => {
    const root = site({ 'es.json': '{"a":"1"}', 'en.json': '{"a":"1"}' });
    const { app } = setup({ STATIC_DIR: root });
    const res = await app.request('/reports/monthly');
    const html = await res.text();
    const version = await catalogVersion(root);
    expect(html).toContain(`<meta name="sf-i18n" content="${version}"></head>`);
    expect(res.headers.get('cache-control')).toBe('no-cache');
  });

  it('leaves the page alone when there are no catalogs', async () => {
    const root = site({});
    const { app } = setup({ STATIC_DIR: root });
    expect(await (await app.request('/')).text()).not.toContain('sf-i18n');
  });

  it('serves the catalogs to be revalidated, never kept', async () => {
    const root = site({ 'es.json': '{"a":"1"}' });
    const { app } = setup({ STATIC_DIR: root });
    const res = await app.request('/i18n/es.json?v=abc');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-cache');
    expect(await res.json()).toEqual({ a: '1' });
  });
});
