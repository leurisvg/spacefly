import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { TxWriteRequest } from '@shared';
import { FiltersStore } from '../state/filters.store';
import { WriteApi, WriteError } from './write-api';

const REQ: TxWriteRequest = {
  description: 'Café',
  date: '2026-09-20',
  time: null,
  source: { id: '1' },
  destination: { name: 'Cafetería' },
  amount: '150.50',
  foreignAmount: null,
  foreignCurrency: null,
  category: null,
  budgetId: null,
  billId: null,
  tags: [],
  notes: null,
};

function setup() {
  const refresh = vi.fn();
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), { provide: FiltersStore, useValue: { refresh } }],
  });
  return { api: TestBed.inject(WriteApi), http: TestBed.inject(HttpTestingController), refresh };
}

describe('WriteApi', () => {
  it('posts a transaction and refreshes the reports afterwards', async () => {
    const { api, http, refresh } = setup();
    const result = api.createTransaction(REQ);
    const req = http.expectOne('/api/transactions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(REQ);
    expect(req.request.body).not.toHaveProperty('type');
    expect(refresh).not.toHaveBeenCalled();
    req.flush({ groupId: '5', journalId: '9', type: 'withdrawal' });
    await expect(result).resolves.toMatchObject({ type: 'withdrawal' });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('updates and deletes by id (encoded)', async () => {
    const { api, http, refresh } = setup();
    const put = api.updateTransaction('a/b', REQ);
    http.expectOne('/api/transactions/a%2Fb').flush({});
    await put;
    const del = api.deleteTransaction('7');
    const req = http.expectOne('/api/transactions/7');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await del;
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('does not refresh after a read', async () => {
    const { api, http, refresh } = setup();
    const read = api.getTransaction('3');
    http.expectOne('/api/transactions/3').flush({ groupId: '3' });
    await read;
    expect(refresh).not.toHaveBeenCalled();
  });

  it('turns a 422 into field errors and does not refresh', async () => {
    const { api, http, refresh } = setup();
    const result = api.createTransaction(REQ);
    http.expectOne('/api/transactions').flush({ error: 'validation', message: 'bad', fields: { destination: ['Nope'] } }, { status: 422, statusText: 'Unprocessable' });
    const err = (await result.catch((e: unknown) => e)) as WriteError;
    expect(err).toBeInstanceOf(WriteError);
    expect(err.kind).toBe('validation');
    expect(err.fields).toEqual({ destination: ['Nope'] });
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each([
    [409, { error: 'not_editable', reason: 'splits' }, 'not_editable', 'splits'],
    [404, { error: 'not_found' }, 'not_found', null],
    [504, { error: 'timeout' }, 'network', null],
    [0, null, 'network', null],
    [500, { error: 'internal_error' }, 'other', null],
  ] as const)('classifies status %s as %s', async (status, body, kind, reason) => {
    const { api, http } = setup();
    const result = api.getTransaction('1');
    http.expectOne('/api/transactions/1').flush(body, { status, statusText: 'x' });
    const err = (await result.catch((e: unknown) => e)) as WriteError;
    expect(err.kind).toBe(kind);
    expect(err.reason).toBe(reason);
    expect(err.fields).toEqual({});
  });

  it('lets non-HTTP errors through untouched', async () => {
    expect(new WriteError(500, null)).not.toBeInstanceOf(HttpErrorResponse);
  });
});
