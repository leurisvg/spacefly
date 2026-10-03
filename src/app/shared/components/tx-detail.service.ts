import { Injectable, signal } from '@angular/core';
import type { TxFilter } from '@shared';

export interface TxDetailRequest {
  title: string;
  subtitle?: string;
  /** start/end default to the global period. */
  filter: Partial<TxFilter>;
}

/** Opens the side sheet with the transactions behind any chart element or row. */
@Injectable({ providedIn: 'root' })
export class TxDetailService {
  readonly request = signal<TxDetailRequest | null>(null);

  open(title: string, filter: Partial<TxFilter>, subtitle?: string): void {
    this.request.set({ title, filter, subtitle });
  }

  close(): void {
    this.request.set(null);
  }
}
