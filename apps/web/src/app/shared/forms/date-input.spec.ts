import { TestBed } from '@angular/core/testing';
import { formatTestProviders } from '@spacefly/client/testing';
import { DateInput } from './date-input';

function setup(value: string) {
  localStorage.clear();
  TestBed.configureTestingModule({ providers: formatTestProviders('en', { forms: { pickDate: 'Pick a date', today: 'Today', yesterday: 'Yesterday' } }).providers });
  const fixture = TestBed.createComponent(DateInput);
  fixture.componentRef.setInput('value', value);
  fixture.detectChanges();
  return fixture;
}

describe('DateInput', () => {
  it('hands the calendar the same Date object until the value changes (a new one every check resets the month it shows)', () => {
    const fixture = setup('2026-10-04');
    const cmp = fixture.componentInstance as unknown as { date(): Date | undefined };
    const first = cmp.date();
    fixture.detectChanges();
    expect(cmp.date()).toBe(first);
    expect(first?.getFullYear()).toBe(2026);
    expect(first?.getMonth()).toBe(9);
    fixture.componentRef.setInput('value', '2024-03-15');
    fixture.detectChanges();
    expect(cmp.date()).not.toBe(first);
    expect(cmp.date()?.getMonth()).toBe(2);
  });

  it('has no date for an empty or malformed value', () => {
    expect((setup('').componentInstance as unknown as { date(): Date | undefined }).date()).toBeUndefined();
  });
});
