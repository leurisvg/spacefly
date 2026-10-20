import { TestBed } from '@angular/core/testing';
import { TxDetailService } from './tx-detail.service';

describe('TxDetailService', () => {
  it('opens a plain request', () => {
    const s = TestBed.inject(TxDetailService);
    s.open('Food', { type: 'withdrawal', category: '3' });
    expect(s.request()).toEqual({ title: 'Food', filter: { type: 'withdrawal', category: '3' }, subtitle: undefined });
    s.close();
    expect(s.request()).toBeNull();
  });

  it('switches the range of an open request and ignores it when closed', () => {
    const s = TestBed.inject(TxDetailService);
    s.setRange({ start: '2026-01-01', end: '2026-01-31' });
    expect(s.request()).toBeNull();
    const ranges = [
      { label: 'Year', start: '2025-10-21', end: '2026-10-20' },
      { label: 'Period', start: '2026-10-01', end: '2026-10-31' },
    ];
    s.open('Netflix', { bill: '4', start: ranges[0].start, end: ranges[0].end }, undefined, ranges);
    s.setRange(ranges[1]);
    expect(s.request()!.filter).toEqual({ bill: '4', start: '2026-10-01', end: '2026-10-31' });
    expect(s.request()!.ranges).toEqual(ranges);
  });

  it('opens a grouped request: category ids go in the filter, members in the breakdown', () => {
    const s = TestBed.inject(TxDetailService);
    const rows = [
      { id: '6', name: 'Gym', value: 200 },
      { id: '7', name: 'Pets', value: 100 },
      { id: null, name: 'Uncategorized', value: 50 },
    ];
    s.openCategories('Others', rows, { type: 'withdrawal' });
    const r = s.request()!;
    expect(r.title).toBe('Others');
    expect(r.filter).toEqual({ type: 'withdrawal', categories: '6,7,none' });
    expect(r.breakdown).toEqual(rows);
  });
});
