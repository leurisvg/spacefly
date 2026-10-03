import type { Hono } from 'hono';
import type { z } from 'zod';
import type { AppEnv } from '../app.types';
import type { FireflyData } from '../core/firefly-data';
import type { FfResource, FfSingle } from '../firefly/firefly.types';
import { idParam, parseBody } from './write.schemas';

/** How one kind of Firefly record (a category, a budget…) maps to its SpaceFly write/edit DTOs. */
export interface EntityConfig<Write, Edit, Attrs> {
  /** URL segment under `/api` (`categories`) and path under Firefly's `/api/v1` (`/v1/categories`). */
  name: string;
  ff: string;
  schema: z.ZodType<Write, unknown>;
  /** Body for create / update. On update, `current` is the stored record, so cleared fields can be sent explicitly empty. */
  body(write: Write, current?: FfResource<Attrs>): Record<string, unknown> | Promise<Record<string, unknown>>;
  /** What the edit form loads. */
  edit(record: FfResource<Attrs>, data: FireflyData): Edit | Promise<Edit>;
  /** Anything extra before deleting (e.g. block it). */
  beforeDelete?(record: FfResource<Attrs>, data: FireflyData): void | Promise<void>;
}

/**
 * GET / POST / PUT / DELETE for one kind of record. Every successful write drops the user's cache:
 * names of categories, budgets or accounts are embedded in the cached ledger, so renames and deletions
 * must not leave stale months behind.
 */
export function crudRoutes<Write, Edit, Attrs>(api: Hono<AppEnv>, cfg: EntityConfig<Write, Edit, Attrs>): void {
  const path = (id: string) => `${cfg.ff}/${encodeURIComponent(id)}`;
  const idOf = (raw: string) => idParam.parse(raw);

  api.get(`/${cfg.name}/:id`, async (c) => {
    const data = c.get('data');
    const record = (await data.ff.get<FfSingle<Attrs>>(path(idOf(c.req.param('id'))))).data;
    return c.json(await cfg.edit(record, data));
  });

  api.post(`/${cfg.name}`, async (c) => {
    const data = c.get('data');
    const write = await parseBody(c, cfg.schema);
    const created = await c.get('writer').post<FfSingle<Attrs>>(cfg.ff, await cfg.body(write));
    data.invalidate();
    return c.json({ id: created.data.id }, 201);
  });

  api.put(`/${cfg.name}/:id`, async (c) => {
    const data = c.get('data');
    const id = idOf(c.req.param('id'));
    const write = await parseBody(c, cfg.schema);
    const current = (await data.ff.get<FfSingle<Attrs>>(path(id))).data;
    await c.get('writer').put(path(id), await cfg.body(write, current));
    data.invalidate();
    return c.json({ id });
  });

  api.delete(`/${cfg.name}/:id`, async (c) => {
    const data = c.get('data');
    const id = idOf(c.req.param('id'));
    if (cfg.beforeDelete) await cfg.beforeDelete((await data.ff.get<FfSingle<Attrs>>(path(id))).data, data);
    await c.get('writer').delete(path(id));
    data.invalidate();
    return c.body(null, 204);
  });
}
