import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RecordingAuthPlatform } from '../../testing/fakes';
import { AuthService } from '../auth/auth.service';
import { initialLang } from '../i18n/lang';
import { API_BASE_URL, baseUrlInterceptor } from './api-base-url';

describe('baseUrlInterceptor', () => {
  function setup(base: string | (() => string)) {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([baseUrlInterceptor])), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: base }],
    });
    return { http: TestBed.inject(HttpClient), ctrl: TestBed.inject(HttpTestingController) };
  }

  it('prefixes /api and /auth paths, trimming a trailing slash', () => {
    const { http, ctrl } = setup('http://10.0.2.2:3100/');
    http.get('/api/me').subscribe();
    ctrl.expectOne('http://10.0.2.2:3100/api/me');
    http.post('/auth/logout', {}).subscribe();
    ctrl.expectOne('http://10.0.2.2:3100/auth/logout');
  });

  it('leaves other URLs alone and does nothing with an empty base (web)', () => {
    const { http, ctrl } = setup('');
    http.get('/api/me').subscribe();
    ctrl.expectOne('/api/me');
    http.get('https://other.test/x').subscribe();
    ctrl.expectOne('https://other.test/x');
  });

  it('reads a function base on every request, so the setting can change at runtime', () => {
    let base = 'http://a.test';
    const { http, ctrl } = setup(() => base);
    http.get('/api/me').subscribe();
    ctrl.expectOne('http://a.test/api/me');
    base = 'http://b.test';
    http.get('/api/me').subscribe();
    ctrl.expectOne('http://b.test/api/me');
  });
});

describe('AuthService', () => {
  function setup() {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    return { auth: TestBed.inject(AuthService), ctrl: TestBed.inject(HttpTestingController), platform: TestBed.inject(RecordingAuthPlatform) };
  }

  it('checks the session once it is known to be valid', async () => {
    const { auth, ctrl } = setup();
    const first = auth.check();
    ctrl.expectOne('/api/me').flush({ authenticated: true, email: 'a@b.c', userId: '1' });
    expect(await first).toBe(true);
    expect(await auth.check()).toBe(true);
    ctrl.verify();
  });

  it('after a native login it re-checks the session and reports the result', async () => {
    const { auth, ctrl, platform } = setup();
    const done = auth.login('/transactions');
    await Promise.resolve();
    ctrl.expectOne('/api/me').flush({ authenticated: true, userId: '1' });
    expect(await done).toBe(true);
    expect(platform.logins).toEqual(['/transactions']);
  });

  it('does not touch the session when the platform redirects away', async () => {
    const { auth, ctrl, platform } = setup();
    platform.loginResult = 'redirecting';
    expect(await auth.login()).toBe(false);
    ctrl.verify();
  });

  it('logs out through the server, then lets the platform clean up even if the call fails', async () => {
    const { auth, ctrl, platform } = setup();
    const out = auth.logout();
    ctrl.expectOne('/auth/logout').flush(null, { status: 500, statusText: 'x' });
    await out;
    expect(auth.me()).toEqual({ authenticated: false });
    expect(platform.logouts).toBe(1);
  });
});

describe('initialLang', () => {
  it.each([
    ['en', 'es-DO', 'en'],
    ['es', 'en-US', 'es'],
    [null, 'en-GB', 'en'],
    [null, 'EN', 'en'],
    [null, 'fr-FR', 'es'],
    ['bogus', null, 'es'],
  ])('saved %j on a %j device starts in %s', (saved, device, expected) => expect(initialLang(saved, device)).toBe(expected));
});
