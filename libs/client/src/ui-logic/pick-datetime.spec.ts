import { isoToLocalDate, localDateToIso, localDateToTime, timeToLocalDate } from './pick-datetime';

describe('pick-datetime', () => {
  it('round-trips a date through the local date a picker uses', () => {
    expect(localDateToIso(isoToLocalDate('2026-03-09', '2000-01-01'))).toBe('2026-03-09');
    expect(localDateToIso(isoToLocalDate('2024-02-29', '2000-01-01'))).toBe('2024-02-29');
  });

  it('falls back when the date is empty or invalid', () => {
    expect(localDateToIso(isoToLocalDate('', '2026-10-20'))).toBe('2026-10-20');
    expect(localDateToIso(isoToLocalDate('2026-13-40', '2026-10-20'))).toBe('2026-10-20');
  });

  it('round-trips a time and reads loosely typed ones', () => {
    expect(localDateToTime(timeToLocalDate('07:05', '12:00'))).toBe('07:05');
    expect(localDateToTime(timeToLocalDate('930', '12:00'))).toBe('09:30');
  });

  it('falls back when the time is empty or invalid', () => {
    expect(localDateToTime(timeToLocalDate('', '18:30'))).toBe('18:30');
    expect(localDateToTime(timeToLocalDate('99:99', '18:30'))).toBe('18:30');
  });
});
