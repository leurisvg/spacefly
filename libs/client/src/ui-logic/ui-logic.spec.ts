import { TestBed } from '@angular/core/testing';
import { formatTestProviders } from '../../testing/format-providers';
import { FormatService } from '../format/format.service';
import { budgetStatus, meterModel } from './budget-status';
import { buildCalendarCells, calendarBlanks, shortAmount } from './calendar-cells';
import { deltaModel } from './delta';
import { fold } from './fold';
import { sparklineGeometry } from './sparkline';
import { nowTime, parseTime } from './time';

describe('ui-logic', () => {
  it('folds case and accents', () => expect(fold('Café ÑANDÚ')).toBe('cafe nandu'));

  it('folds decomposed accents and leaves other characters alone', () => {
    expect(fold('Cafe\u0301 Åre, Łódź 100%')).toBe('cafe are, lodz 100%');
  });

  it('reads typed times', () => {
    expect(parseTime('930')).toBe('09:30');
    expect(parseTime('21.05')).toBe('21:05');
    expect(parseTime('24:00')).toBeNull();
    expect(nowTime()).toMatch(/^\d{2}:\d{2}$/);
  });

  it('grades budget usage at 80 % and 100 %', () => {
    expect([null, 0.5, 0.8, 0.99, 1, 2].map(budgetStatus)).toEqual(['good', 'good', 'warning', 'warning', 'critical', 'critical']);
    expect(meterModel(1.5, false)).toEqual({ status: 'critical', fill: 100, percent: 150 });
    expect(meterModel(1.5, true)).toEqual({ status: 'critical', fill: 0, percent: 0 });
  });

  it('turns a change into direction and tone, neutral in privacy mode', () => {
    expect(deltaModel(120, 100, true, false)).toMatchObject({ direction: 'up', tone: 'positive', ratio: 0.2 });
    expect(deltaModel(120, 100, false, false)).toMatchObject({ direction: 'up', tone: 'negative' });
    expect(deltaModel(80, 100, true, false)).toMatchObject({ direction: 'down', tone: 'negative' });
    expect(deltaModel(5, null, true, false)).toMatchObject({ direction: 'flat', tone: 'neutral', ratio: null });
    expect(deltaModel(120, 100, true, true)).toMatchObject({ direction: 'flat', tone: 'neutral', pointsLabel: '0.0 pp' });
  });

  it('draws a sparkline inside its box, or nothing below two points', () => {
    expect(sparklineGeometry([1])).toBeNull();
    const g = sparklineGeometry([1, 3, 2], 100, 32)!;
    expect(g.line.split(' ')).toHaveLength(3);
    expect(g.last).toEqual([100, 16]);
    expect(g.area.startsWith('M0,32')).toBe(true);
  });

  describe('calendar cells', () => {
    const days = [
      { date: '2026-09-02', income: 0, expense: 50, balance: 100 },
      { date: '2026-09-03', income: 200, expense: 0, balance: null },
    ] as never;

    it('scales bars to the busiest day and flags the one that fits inside', () => {
      TestBed.configureTestingModule({ providers: formatTestProviders('en').providers });
      const cells = buildCalendarCells(TestBed.inject(FormatService), days, [], null, '2026-09-02');
      expect(cells.map((c) => [c.num, c.incH, c.expH, c.incInside, c.expInside, c.today, c.future])).toEqual([
        [2, 0, 25, false, false, true, false],
        [3, 100, 0, true, false, false, true],
      ]);
      expect(cells[0].tip).toContain('−RD$50.00');
    });

    it('offsets the first day to its weekday and abbreviates amounts', () => {
      expect(calendarBlanks(days)).toBe(2); // 2026-09-02 is a Wednesday
      expect([950, 1200].map((v) => shortAmount(v, false))).toEqual(['950', '1.2k']);
      expect(shortAmount(1200, true)).toBe('0');
    });
  });
});
