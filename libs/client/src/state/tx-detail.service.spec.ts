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
