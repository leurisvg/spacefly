import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, type TestRequest } from '@angular/common/http/testing';
import { signal, type EnvironmentProviders, type Provider, type Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FiltersStore } from '../app/core/state/filters.store';
import { MetaStore } from '../app/core/state/meta.store';
import { formatTestProviders, loadTranslations } from './format-providers';
import { EN } from './translations';

export interface EditorHarness<T> {
  fixture: ComponentFixture<T>;
  http: HttpTestingController;
  refresh: ReturnType<typeof vi.fn>;
  el: HTMLElement;
  done: { count: number };
  settle: () => Promise<void>;
  /** Answer the next request matching method + url. */
  answer: (method: string, url: string, body: object | null, status?: number) => TestRequest;
  type: (selector: string, text: string) => Promise<void>;
  click: (text: string, within?: string) => Promise<void>;
  text: () => string;
}

let active: HttpTestingController | undefined;

/** Call from a spec file's top level: checks that no request was left unanswered. */
export function verifyNoPendingRequests(): void {
  afterEach(() => {
    active?.verify();
    active = undefined;
    localStorage.clear();
  });
}

/**
 * Mounts a form component with real translations, an HTTP backend you answer by hand and the minimum
 * store doubles. `inputs` are set before the first change detection.
 */
export async function mountEditor<T extends object>(
  component: Type<T>,
  inputs: Record<string, unknown> = {},
  extraProviders: (Provider | EnvironmentProviders)[] = [],
): Promise<EditorHarness<T>> {
  const refresh = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      ...formatTestProviders('en', EN).providers,
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: FiltersStore, useValue: { currency: signal('DOP'), refreshTick: signal(0), refresh } },
      {
        provide: MetaStore,
        useValue: {
          currencies: signal([
            { code: 'DOP', name: 'Peso', symbol: 'RD$', decimals: 2 },
            { code: 'USD', name: 'Dollar', symbol: 'US$', decimals: 2 },
          ]),
          primary: signal('DOP'),
          fireflyUrl: (p: string) => `https://firefly.example.com${p}`,
        },
      },
      ...extraProviders,
    ],
  });
  await loadTranslations();
  active = TestBed.inject(HttpTestingController);
  const http = active;
  const fixture = TestBed.createComponent(component);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  const done = { count: 0 };
  (fixture.componentInstance as { done?: { subscribe(fn: () => void): unknown } }).done?.subscribe(() => done.count++);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const settle = async () => {
    for (let i = 0; i < 5; i++) {
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r, 0));
    }
  };
  await settle();
  return {
    fixture,
    http,
    refresh,
    el,
    done,
    settle,
    answer: (method, url, body, status = 200) => {
      const req = http.expectOne((r) => r.method === method && r.url === url);
      req.flush(body, { status, statusText: 'x' });
      return req;
    },
    type: async (selector, text) => {
      const input = el.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
      input.value = text;
      input.dispatchEvent(new Event('input'));
      await settle();
    },
    click: async (text, within = 'button') => {
      const scope = within === 'button' ? el : (document.body.querySelector(within) as HTMLElement);
      const button = [...scope.querySelectorAll('button')].find((b) => b.textContent!.trim() === text);
      if (!button) throw new Error(`No button "${text}"`);
      button.click();
      await settle();
    },
    text: () => el.textContent!.replace(/\s+/g, ' '),
  };
}
