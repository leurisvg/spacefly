import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { accessRenewInterceptor, PAGE_RELOAD } from './access-renew.interceptor';

describe('accessRenewInterceptor (expired Access session)', () => {
  let reload: ReturnType<typeof vi.fn>;
  let http: HttpClient;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    reload = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([accessRenewInterceptor])), provideHttpClientTesting(), { provide: PAGE_RELOAD, useValue: reload }],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
  });

  const fail = (method: 'GET' | 'POST', url: string) => {
    const req = method === 'GET' ? http.get(url) : http.post(url, {});
    req.subscribe({ error: () => undefined });
    ctrl.expectOne(url).error(new ProgressEvent('error'));
  };

  it('reloads once when a GET to the API is blocked', () => {
    fail('GET', '/api/transactions');
    fail('GET', '/api/transactions');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload on a failed write', () => {
    fail('POST', '/api/transactions');
    expect(reload).not.toHaveBeenCalled();
  });
});
