import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EN, formatTestProviders, loadTranslations } from '../../../testing';
import { TxDetailService } from '../../state/tx-detail.service';
import { calendarMonth, calendarViewModel } from './calendar.vm';

describe('calendarMonth', () => {
  it('keeps a whole month and snaps anything else to the month of its end', () => {
    expect(calendarMonth({ start: '2026-09-01', end: '2026-09-30' })).toEqual({ start: '2026-09-01', end: '2026-09-30' });
    expect(calendarMonth({ start: '2026-08-15', end: '2026-10-10' })).toEqual({ start: '2026-10-01', end: '2026-10-31' });
  });
});

describe('calendarViewModel', () => {
  const day = (date: string, balance: number | null) => ({ date, income: 0, expense: 0, transferIn: 0, transferOut: 0, count: 0, balance });
  const report = {
    data: { days: [day('2026-09-01', 100), day('2026-09-02', 80), day('2026-09-03', null)], scheduled: [], totals: { income: 0, expense: 20 }, maxValue: 20 },
    meta: {},
  };

  async function setup() {
    TestBed.configureTestingModule({ providers: [...formatTestProviders('en', EN, { realStores: true }).providers, provideHttpClient(), provideHttpClientTesting()] });
    await loadTranslations('en');
    const http = TestBed.inject(HttpTestingController);
    const vm = TestBed.runInInjectionContext(() => calendarViewModel());
    TestBed.tick();
    const req = http.expectOne((r) => r.url === '/api/reports/calendar');
    req.flush(report);
    await Promise.resolve();
    TestBed.tick();
    return { vm, http, req };
  }

  it('ends on the last known balance and plots only the known days', async () => {
    const { vm } = await setup();
    expect(vm.endBalance()).toBe(80);
    expect(vm.balanceOptions()).not.toBeNull();
  });

  it('opens a day within the active filters', async () => {
    const { vm } = await setup();
    const detail = TestBed.inject(TxDetailService);
    vm.setFilter('account', '7');
    vm.openDay('2026-09-02');
    expect(detail.request()?.filter).toEqual({ start: '2026-09-02', end: '2026-09-02', account: '7' });
    vm.setFilter('account', '');
    expect(vm.account()).toBe('');
  });

  it('does not fetch the year heatmap while showing the month', async () => {
    const { http } = await setup();
    http.expectNone((r) => r.url === '/api/reports/calendar/year');
  });
});
