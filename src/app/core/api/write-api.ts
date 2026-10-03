import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, type Observable } from 'rxjs';
import type { TxEditPayload, TxWriteRequest, TxWriteResult, ValidationErrorBody } from '@shared';
import { FiltersStore } from '../state/filters.store';

/** A failed write, with what the server said: field errors (422), "not editable" (409)… */
export class WriteError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`write failed (${status})`);
  }

  get kind(): 'validation' | 'not_editable' | 'not_found' | 'network' | 'other' {
    if (this.status === 422) return 'validation';
    if (this.status === 409) return 'not_editable';
    if (this.status === 404) return 'not_found';
    return this.status === 0 || this.status === 504 ? 'network' : 'other';
  }

  /** Field → messages, keyed like the request DTO. Empty unless this is a validation error. */
  get fields(): Record<string, string[]> {
    return this.kind === 'validation' ? ((this.body as ValidationErrorBody | null)?.fields ?? {}) : {};
  }

  /** Why the target can't be edited here (`splits` or `type`), for a 409. */
  get reason(): string | null {
    return this.kind === 'not_editable' ? ((this.body as { reason?: string } | null)?.reason ?? null) : null;
  }
}

/**
 * Create / update / delete through the BFF. The server invalidates its own cache, so after each
 * successful write this only has to nudge every visible report and lookup to refetch.
 */
@Injectable({ providedIn: 'root' })
export class WriteApi {
  private readonly http = inject(HttpClient);
  private readonly filters = inject(FiltersStore);

  get<T>(path: string): Promise<T> {
    return this.run(this.http.get<T>(`/api/${path}`), false);
  }

  create<T>(path: string, body: unknown): Promise<T> {
    return this.run(this.http.post<T>(`/api/${path}`, body));
  }

  update<T>(path: string, body: unknown): Promise<T> {
    return this.run(this.http.put<T>(`/api/${path}`, body));
  }

  remove(path: string): Promise<void> {
    return this.run(this.http.delete<void>(`/api/${path}`));
  }

  getTransaction(id: string): Promise<TxEditPayload> {
    return this.get(`transactions/${encodeURIComponent(id)}`);
  }

  createTransaction(req: TxWriteRequest): Promise<TxWriteResult> {
    return this.create('transactions', req);
  }

  updateTransaction(id: string, req: TxWriteRequest): Promise<TxWriteResult> {
    return this.update(`transactions/${encodeURIComponent(id)}`, req);
  }

  deleteTransaction(id: string): Promise<void> {
    return this.remove(`transactions/${encodeURIComponent(id)}`);
  }

  private async run<T>(request: Observable<T>, refresh = true): Promise<T> {
    try {
      const result = await firstValueFrom(request);
      if (refresh) this.filters.refresh();
      return result;
    } catch (err) {
      if (err instanceof HttpErrorResponse) throw new WriteError(err.status, err.error);
      throw err;
    }
  }
}
