import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { formatTestProviders } from '../../../testing/format-providers';
import { FiltersStore } from '../../core/state/filters.store';
import { TxDetailService } from './tx-detail.service';
import { TxDetailSheet } from './tx-detail-sheet';

const T = { tx: { breakdown: 'Categories in this group', none: 'No transactions', count: 'Transactions' }, common: { uncategorized: 'Uncategorized' }, txType: {} };

async function setup() {
  localStorage.clear();
  const filters = { currency: signal('DOP'), period: signal({ start: '2026-09-01', end: '2026-09-30' }), refreshTick: signal(0) };
  TestBed.configureTestingModule({
    providers: [...formatTestProviders('en', T).providers, { provide: FiltersStore, useValue: filters }, provideHttpClient(), provideHttpClientTesting()],
  });
  const fixture = TestBed.createComponent(TxDetailSheet);
  fixture.detectChanges();
  return { fixture, detail: TestBed.inject(TxDetailService), http: TestBed.inject(HttpTestingController) };
}

/** The mocked request stays pending, so the app is never "stable": just run change detection a few times. */
async function settle(fixture: { detectChanges(): void }) {
  for (let i = 0; i < 5; i++) {
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
  }
}

const text = () => document.body.textContent!.replace(/\s+/g, ' ');

describe('TxDetailSheet breakdown', () => {
  it('lists the folded categories with amounts and requests all of their transactions', async () => {
    const { fixture, detail, http } = await setup();
    detail.openCategories(
      'Others',
      [
        { id: '6', name: 'Gym', value: 200 },
        { id: null, name: 'Uncategorized', value: 50 },
      ],
      { type: 'withdrawal' },
    );
    await settle(fixture);

    const req = http.expectOne((r) => r.url === '/api/transactions');
    expect(req.request.params.get('categories')).toBe('6,none');
    expect(req.request.params.get('type')).toBe('withdrawal');
    expect(text()).toContain('Categories in this group');
    expect(text()).toContain('Gym');
    expect(text()).toContain('RD$200.00');
    expect(text()).toContain('Uncategorized');
    expect(text()).toContain('RD$50.00');
  });

  it('drills into one category when it is clicked, keeping the type', async () => {
    const { fixture, detail, http } = await setup();
    detail.openCategories('Others', [{ id: '6', name: 'Gym', value: 200 }], { type: 'withdrawal' });
    await settle(fixture);
    http.expectOne((r) => r.url === '/api/transactions');

    const btn = [...document.body.querySelectorAll('button')].find((b) => b.textContent!.includes('Gym'))!;
    btn.click();
    await settle(fixture);

    expect(detail.request()).toMatchObject({ title: 'Gym', filter: { category: '6', type: 'withdrawal' } });
    expect(detail.request()!.breakdown).toBeUndefined();
    expect(detail.request()!.filter.categories).toBeUndefined();
  });

  it('shows no breakdown for an ordinary request', async () => {
    const { fixture, detail } = await setup();
    detail.open('Food', { type: 'withdrawal', category: '3' });
    await settle(fixture);
    expect(text()).not.toContain('Categories in this group');
  });
});
