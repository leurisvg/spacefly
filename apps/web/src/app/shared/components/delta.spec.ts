import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgIcon } from '@ng-icons/core';
import { formatTestProviders } from '@spacefly/client/testing';
import { PrivacyStore } from '@spacefly/client/state/privacy.store';
import { Delta } from './delta';

function render(inputs: { value: number; previous: number | null; upIsGood?: boolean; points?: boolean }, hidden = false) {
  localStorage.clear();
  TestBed.configureTestingModule({ providers: formatTestProviders('en').providers });
  TestBed.inject(PrivacyStore).set(hidden);
  const fixture = TestBed.createComponent(Delta);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { text: el.textContent!.replace(/\s+/g, ' ').trim(), cls: el.className, icon: fixture.debugElement.query(By.directive(NgIcon)).componentInstance.name() as string };
}

afterEach(() => localStorage.clear());

describe('Delta', () => {
  it('shows an increase as positive when up is good', () => {
    const r = render({ value: 120, previous: 100 });
    expect(r.text).toBe('20.0%');
    expect(r.icon).toBe('lucideArrowUp');
    expect(r.cls).toContain('text-positive');
  });

  it('shows an increase as negative when up is bad (expenses)', () => {
    const r = render({ value: 120, previous: 100, upIsGood: false });
    expect(r.icon).toBe('lucideArrowUp');
    expect(r.cls).toContain('text-negative');
  });

  it('shows a decrease with a down arrow', () => {
    const r = render({ value: 80, previous: 100 });
    expect(r.text).toBe('20.0%');
    expect(r.icon).toBe('lucideArrowDown');
    expect(r.cls).toContain('text-negative');
  });

  it('is neutral with no change or no reference', () => {
    expect(render({ value: 5, previous: 5 }).icon).toBe('lucideMinus');
    TestBed.resetTestingModule();
    const r = render({ value: 5, previous: null });
    expect(r.cls).toContain('text-muted-foreground');
    expect(r.text).toBe('—');
  });

  it('shows a dash instead of a ratio when the reference is zero', () => {
    expect(render({ value: 5, previous: 0 }).text).toBe('—');
  });

  it('shows percentage points for rates', () => {
    expect(render({ value: 32.5, previous: 30, points: true }).text).toBe('2.5 pp');
  });

  it('hides the change in privacy mode: 0, no direction, no color', () => {
    const up = render({ value: 120, previous: 100 }, true);
    expect(up.text).toBe('0.0%');
    expect(up.icon).toBe('lucideMinus');
    expect(up.cls).toContain('text-muted-foreground');
    expect(up.cls).not.toContain('text-positive');
    TestBed.resetTestingModule();
    const down = render({ value: 80, previous: 100 }, true);
    expect(down.icon).toBe('lucideMinus');
    expect(down.cls).not.toContain('text-negative');
    TestBed.resetTestingModule();
    expect(render({ value: 32.5, previous: 30, points: true }, true).text).toBe('0.0 pp');
  });
});
