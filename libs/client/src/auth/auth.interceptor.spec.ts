import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RecordingAuthPlatform } from '../../testing/fakes';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let platform: RecordingAuthPlatform;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()] });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
    platform = TestBed.inject(RecordingAuthPlatform);
  });

  it('adds the CSRF header to writes against the API and the auth routes only', () => {
    http.post('/api/transactions', {}).subscribe();
    expect(ctrl.expectOne('/api/transactions').request.headers.get('X-SpaceFly')).toBe('1');
    http.post('/auth/logout', {}).subscribe();
    expect(ctrl.expectOne('/auth/logout').request.headers.get('X-SpaceFly')).toBe('1');
    http.post('https://elsewhere.test/x', {}).subscribe();
    expect(ctrl.expectOne('https://elsewhere.test/x').request.headers.has('X-SpaceFly')).toBe(false);
    http.get('/api/me').subscribe();
    expect(ctrl.expectOne('/api/me').request.headers.has('X-SpaceFly')).toBe(false);
  });

  it('asks the platform to handle a 401 from the API, except for /api/me', () => {
    http.get('/api/reports/monthly').subscribe({ error: () => undefined });
    ctrl.expectOne('/api/reports/monthly').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(platform.unauthorized).toBe(1);

    http.get('/api/me').subscribe({ error: () => undefined });
    ctrl.expectOne('/api/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(platform.unauthorized).toBe(1);
  });
});
