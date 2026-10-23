import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { BillRow, ProjectionReport } from '@spacefly/shared';
import { EN, formatTestProviders, loadTranslations } from '../../../testing';
import { EntityEditor } from '../../state/entity-editor.service';
import { FiltersStore } from '../../state/filters.store';
import { TxDetailService } from '../../state/tx-detail.service';
import { billsViewModel, billStatusTone, lastTwelveMonths, rankedBills } from './bills.vm';
import { goalProgress, goalsViewModel, goalTone } from './goals.vm';
import { eventsOn, projectionViewModel, resolveProjectionDays } from './projection.vm';
import { recurrenceAmount, recurrenceTone, recurrencesViewModel } from './recurring.vm';

async function setup() {
  TestBed.configureTestingModule({ providers: [...formatTestProviders('en', EN, { realStores: true }).providers, provideHttpClient(), provideHttpClientTesting()] });
  await loadTranslations('en');
  return { http: TestBed.inject(HttpTestingController) };
}

const settle = async () => {
  await Promise.resolve();
  TestBed.tick();
};

describe('bills', () => {
  const bill = (id: string, over: Partial<BillRow> = {}): BillRow => ({
    id,
    name: `Bill ${id}`,
    active: true,
    currency: 'DOP',
    amountMin: 10,
    amountMax: 10,
    amountAvg: 10,
    repeatFreq: 'monthly',
    skip: 0,
    monthlyEquivalent: 10,
    yearlyEquivalent: 120,
    nextDate: '2026-10-01',
    expectedInPeriod: [],
    paidInPeriod: [],
    status: 'pending',
    outOfRange: false,
    ...over,
  });

  it('tones the status of a subscription', () => {
    expect([billStatusTone('paid'), billStatusTone('pending'), billStatusTone('not-expected')]).toEqual(['good', 'warning', 'muted']);
  });

  it('ranks the active subscriptions that cost something by what they cost a year', () => {
    const ranked = rankedBills([bill('a', { yearlyEquivalent: 50 }), bill('b', { yearlyEquivalent: 500 }), bill('c', { active: false, yearlyEquivalent: 900 }), bill('d', { yearlyEquivalent: 0 })]);
    expect(ranked.map((b) => b.id)).toEqual(['b', 'a']);
  });

  it('looks at the last twelve months up to a date', () => {
    expect(lastTwelveMonths('2026-09-15')).toEqual({ start: '2025-09-16', end: '2026-09-15' });
  });

  const report = {
    data: {
      bills: [bill('1', { yearlyEquivalent: 100 }), bill('2', { yearlyEquivalent: 300 }), bill('3', { active: false })],
      monthlyTotal: 20,
      yearlyTotal: 240,
      paidCount: 1,
      pendingCount: 1,
      pendingAmount: 10,
    },
    meta: {},
  };

  it('opens the transactions of a subscription, and a bar over the last 12 months with the period to switch to', async () => {
    const { http } = await setup();
    const vm = TestBed.runInInjectionContext(() => billsViewModel());
    TestBed.tick();
    http.expectOne((r) => r.url === '/api/reports/bills').flush(report);
    await settle();
    expect(vm.active().map((b) => b.id)).toEqual(['2', '1']);
    expect(vm.table().rows.map((r) => r[0])).toEqual(['Bill 2', 'Bill 1']);
    const detail = TestBed.inject(TxDetailService);
    vm.open({ id: '1', name: 'Bill 1' });
    expect(detail.request()).toMatchObject({ title: 'Bill 1', filter: { bill: '1' } });
    // the bars are drawn bottom-up: the first one is the cheapest
    vm.openBar(0);
    expect(detail.request()).toMatchObject({ title: 'Bill 1', filter: { bill: '1' } });
    expect(detail.request()?.ranges?.map((r) => r.label)).toEqual(['Last 12 months', 'Selected period']);
    const range = detail.request()!.ranges![1];
    const period = TestBed.inject(FiltersStore).period();
    expect([range.start, range.end]).toEqual([period.start, period.end]);
    vm.openBar(7);
    expect(detail.request()?.filter['bill']).toBe('1');
  });

  it('creates and edits through the editor', async () => {
    await setup();
    const vm = TestBed.runInInjectionContext(() => billsViewModel());
    const editor = TestBed.inject(EntityEditor);
    vm.create();
    expect(editor.request()).toMatchObject({ kind: 'bill', id: null });
    vm.edit('4');
    expect(editor.request()).toMatchObject({ kind: 'bill', id: '4' });
  });
});

describe('recurring', () => {
  it('signs what a recurrence moves', () => {
    expect(recurrenceAmount({ type: 'deposit', amount: 10 })).toBe(10);
    expect(recurrenceAmount({ type: 'withdrawal', amount: 10 })).toBe(-10);
    expect(recurrenceAmount({ type: 'transfer', amount: 10 })).toBe(10);
    expect([recurrenceTone('deposit'), recurrenceTone('withdrawal'), recurrenceTone('transfer')]).toEqual(['income', 'expense', 'none']);
  });

  it('asks for the recurrences without the period', async () => {
    const { http } = await setup();
    const vm = TestBed.runInInjectionContext(() => recurrencesViewModel());
    TestBed.tick();
    const req = http.expectOne((r) => r.url === '/api/reports/recurrences');
    expect(req.request.params.has('start')).toBe(false);
    req.flush({ data: { recurrences: [] }, meta: {} });
    await settle();
    expect(vm.r()?.recurrences).toEqual([]);
  });
});

describe('goals', () => {
  it('measures the progress of a goal, nothing in privacy mode', () => {
    expect(goalProgress(0.4, false)).toBe(40);
    expect(goalProgress(null, false)).toBe(0);
    expect(goalProgress(1.5, false)).toBe(100);
    expect(goalProgress(0.4, true)).toBe(0);
  });

  it('says whether a goal is on track, when it has a date to be on track for', () => {
    expect([goalTone({ onTrack: true }), goalTone({ onTrack: false }), goalTone({ onTrack: null })]).toEqual(['good', 'warning', null]);
  });

  it('asks for the goals and edits them through the editor', async () => {
    const { http } = await setup();
    const vm = TestBed.runInInjectionContext(() => goalsViewModel());
    TestBed.tick();
    http.expectOne((r) => r.url === '/api/reports/piggy-banks').flush({ data: { piggyBanks: [], totalSaved: 0, totalTarget: 0 }, meta: {} });
    await settle();
    const editor = TestBed.inject(EntityEditor);
    vm.create();
    expect(editor.request()).toMatchObject({ kind: 'piggy', id: null });
    vm.edit('2');
    expect(editor.request()).toMatchObject({ kind: 'piggy', id: '2' });
    expect(vm.progress({ pct: 0.25 })).toBe(25);
  });
});

describe('projection', () => {
  it('offers four horizons and falls back to 90 days', () => {
    expect(resolveProjectionDays('30')).toBe('30');
    expect(resolveProjectionDays('180')).toBe('180');
    expect(resolveProjectionDays('7')).toBe('90');
    expect(resolveProjectionDays(null)).toBe('90');
  });

  it('lists what happens on a day', () => {
    const events = [
      { date: '2026-09-02', name: 'Luz', kind: 'bill' as const, amount: -50 },
      { date: '2026-09-03', name: 'Sueldo', kind: 'recurrence' as const, amount: 900 },
      { date: '2026-09-02', name: 'Agua', kind: 'bill' as const, amount: -20 },
    ];
    expect(eventsOn(events, '2026-09-02').map((e) => e.name)).toEqual(['Luz', 'Agua']);
    expect(eventsOn(events, '2026-09-09')).toEqual([]);
  });

  const report: { data: ProjectionReport; meta: object } = {
    data: {
      startBalance: 1000,
      days: [
        { date: '2026-09-15', balance: 1000, inflow: 0, outflow: 0 },
        { date: '2026-09-16', balance: 950, inflow: 0, outflow: 50 },
      ],
      events: [{ date: '2026-09-16', name: 'Luz', kind: 'bill', amount: -50 }],
      horizons: [{ days: 30, balance: 900 }],
      lowest: { date: '2026-09-16', balance: 950 },
    },
    meta: {},
  };

  it('asks for 90 days by default, follows the horizon and words the lowest point', async () => {
    const { http } = await setup();
    const vm = TestBed.runInInjectionContext(() => projectionViewModel());
    TestBed.tick();
    http.expectOne((r) => r.url === '/api/reports/projection' && r.params.get('days') === '90' && !r.params.has('start')).flush(report);
    await settle();
    expect(vm.days()).toBe('90');
    expect(vm.lowestLabel()).toBe('Lowest point: RD$950.00 on September 16, 2026');
    expect(vm.table()?.rows).toEqual([['Wed, Sep 16', 'RD$0.00', 'RD$50.00', 'RD$950.00']]);
    expect(vm.options()).not.toBeNull();
    vm.setDays('180');
    TestBed.tick();
    expect(vm.days()).toBe('180');
    http.expectOne((r) => r.url === '/api/reports/projection' && r.params.get('days') === '180');
  });
});
