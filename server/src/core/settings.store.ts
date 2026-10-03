import { z } from 'zod';
import type { UserSettings } from '@shared';
import type { Db } from '../db/sqlite';

export const settingsSchema = z.object({
  excludedAccounts: z.array(z.string().max(64)).max(200).default([]),
  balanceMonths: z.coerce.number().int().min(2).max(60).default(6),
  sankeyThreshold: z.coerce.number().min(0).max(0.2).default(0),
});

export const DEFAULT_SETTINGS: UserSettings = settingsSchema.parse({});

/** SpaceFly's own per-user preferences (stored locally, never written to Firefly). */
export class SettingsStore {
  constructor(private readonly db: Db) {}

  get(userId: string): UserSettings {
    const row = this.db.prepare('SELECT value FROM settings WHERE user_id = ?').get(userId) as { value: string } | undefined;
    if (!row) return { ...DEFAULT_SETTINGS };
    const parsed = settingsSchema.safeParse(JSON.parse(row.value));
    return parsed.success ? parsed.data : { ...DEFAULT_SETTINGS };
  }

  put(userId: string, value: unknown): UserSettings {
    const settings = settingsSchema.parse(value);
    this.db.prepare('INSERT OR REPLACE INTO settings (user_id, value) VALUES (?, ?)').run(userId, JSON.stringify(settings));
    return settings;
  }
}
