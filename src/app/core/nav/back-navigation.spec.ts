import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BackNavigation } from './back-navigation';

@Component({ template: '' })
class Page {}

async function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'a', component: Page },
        { path: 'b', component: Page },
        { path: 'fallback', component: Page },
      ]),
    ],
  });
  const router = TestBed.inject(Router);
  const back = TestBed.inject(BackNavigation);
  const location = TestBed.inject(Location);
  const spy = vi.spyOn(location, 'back').mockImplementation(() => undefined);
  return { router, back, spy };
}

describe('BackNavigation', () => {
  it('goes to the fallback route when the page was opened directly', async () => {
    const { router, back, spy } = await setup();
    await router.navigateByUrl('/a');
    expect(back.canGoBack).toBe(false);
    back.back('/fallback');
    await new Promise((r) => setTimeout(r));
    expect(spy).not.toHaveBeenCalled();
    expect(router.url).toBe('/fallback');
  });

  it('uses the browser history after navigating inside the app', async () => {
    const { router, back, spy } = await setup();
    await router.navigateByUrl('/a');
    await router.navigateByUrl('/b');
    expect(back.canGoBack).toBe(true);
    back.back('/fallback');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(router.url).toBe('/b');
  });

  it('does not count navigations that replace the current entry', async () => {
    const { router, back } = await setup();
    await router.navigateByUrl('/a');
    await router.navigateByUrl('/b', { replaceUrl: true });
    expect(back.canGoBack).toBe(false);
  });
});
