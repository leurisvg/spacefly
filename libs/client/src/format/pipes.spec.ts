import { TestBed } from '@angular/core/testing';
import { formatTestProviders } from '../../testing/format-providers';
import { CompactPipe, DatePipe, MoneyPipe, MonthLabelPipe, PctPipe } from './pipes';

describe('format pipes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...formatTestProviders('en').providers, MoneyPipe, CompactPipe, PctPipe, DatePipe, MonthLabelPipe],
    });
  });

  it('money', () => {
    const pipe = TestBed.inject(MoneyPipe);
    expect(pipe.transform(1500)).toBe('RD$1,500.00');
    expect(pipe.transform(1500, 'USD', true, 0)).toBe('+US$1,500');
    expect(pipe.transform(null)).toBe('—');
  });

  it('compact', () => {
    const pipe = TestBed.inject(CompactPipe);
    expect(pipe.transform(2500)).toBe('RD$2.5K');
    expect(pipe.transform(2500, false)).toBe('2.5K');
  });

  it('pct', () => {
    const pipe = TestBed.inject(PctPipe);
    expect(pipe.transform(0.25)).toBe('25.0%');
    expect(pipe.transform(0.25, 0, true)).toBe('+25%');
    expect(pipe.transform(0.25, 1, false, false)).toBe('25.0%'); // settings opt out of privacy masking
  });

  it('fdate and monthLabel', () => {
    expect(TestBed.inject(DatePipe).transform('2026-01-15', 'long')).toBe('January 15, 2026');
    expect(TestBed.inject(MonthLabelPipe).transform('2026-01')).toBe('Jan 26');
  });

  it('are impure so a language switch re-renders them', () => {
    for (const pipe of [MoneyPipe, CompactPipe, PctPipe, DatePipe, MonthLabelPipe]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((pipe as any).ɵpipe.pure).toBe(false);
    }
  });
});
