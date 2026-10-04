import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, type ActivatedRouteSnapshot, type RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

function run(authenticated: boolean) {
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: { check: () => Promise.resolve(authenticated) } },
      { provide: Router, useValue: { createUrlTree: (commands: unknown[], extras: unknown) => ({ commands, extras }) as unknown as UrlTree } },
    ],
  });
  return TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, { url: '/monthly?p=month' } as RouterStateSnapshot));
}

describe('authGuard', () => {
  it('lets an authenticated user through', async () => {
    expect(await run(true)).toBe(true);
  });

  it('redirects to /login with the return URL when there is no session (no NG0203 after the await)', async () => {
    const result = (await run(false)) as unknown as { commands: unknown[]; extras: unknown };
    expect(result.commands).toEqual(['/login']);
    expect(result.extras).toEqual({ queryParams: { returnTo: '/monthly?p=month' } });
  });
});
