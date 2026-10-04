import { Injectable, signal } from '@angular/core';
import type { TxFilter } from '@spacefly/shared';

/** One member of a grouped slice (e.g. a category folded into "Others") with its amount. */
export interface BreakdownRow {
  id: string | null;
  name: string;
  value: number;
}

export interface TxDetailRequest {
  title: string;
  subtitle?: string;
  /** start/end default to the global period. */
  filter: Partial<TxFilter>;
  /** When the request covers a group of categories: what it is made of, with amounts. */
  breakdown?: BreakdownRow[];
}

/** Opens the side sheet with the transactions behind any chart element or row. */
@Injectable({ providedIn: 'root' })
export class TxDetailService {
  readonly request = signal<TxDetailRequest | null>(null);

  open(title: string, filter: Partial<TxFilter>, subtitle?: string): void {
    this.request.set({ title, filter, subtitle });
  }

  /** Transactions of a group of categories (a folded "Others" slice) plus a clickable breakdown of its members. */
  openCategories(title: string, rows: BreakdownRow[], filter: Partial<TxFilter> = {}): void {
    this.request.set({ title, filter: { ...filter, categories: rows.map((r) => r.id ?? 'none').join(',') }, breakdown: rows });
  }

  close(): void {
    this.request.set(null);
  }
}
