import { Injectable, signal } from '@angular/core';
import type { AccountWriteType } from '@spacefly/shared';

export type EntityKind = 'category' | 'tag' | 'budget' | 'bill' | 'account' | 'piggy';

export interface EntityRequest {
  kind: EntityKind;
  /** `null` creates a new record. */
  id: string | null;
  /** A new account starts as this type. */
  accountType?: AccountWriteType;
}

/** Opens the side panel that edits (or creates) a category, tag, budget, subscription, account or goal. */
@Injectable({ providedIn: 'root' })
export class EntityEditor {
  readonly request = signal<EntityRequest | null>(null);

  open(kind: EntityKind, id: string | null = null, extra: Partial<Pick<EntityRequest, 'accountType'>> = {}): void {
    this.request.set({ kind, id, ...extra });
  }

  close(): void {
    this.request.set(null);
  }
}
