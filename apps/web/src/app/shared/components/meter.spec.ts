import { TestBed } from '@angular/core/testing';
import { formatTestProviders } from '../../../testing/format-providers';
import { PrivacyStore } from '../../core/state/privacy.store';
import { Meter } from './meter';

const T = { budget: { status: { good: 'On track', warning: 'Near limit', critical: 'Over budget' } } };

function render(ratio: number, hidden = false) {
  localStorage.clear();
  TestBed.configureTestingModule({ providers: formatTestProviders('en', T).providers });
  TestBed.inject(PrivacyStore).set(hidden);
  const fixture = TestBed.createComponent(Meter);
  fixture.componentRef.setInput('ratio', ratio);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return {
    text: el.textContent!.replace(/\s+/g, ' ').trim(),
    meter: el.querySelector('[role="meter"]')!,
    fill: el.querySelector<HTMLElement>('[role="meter"] > div')!,
  };
}

afterEach(() => localStorage.clear());

describe('Meter', () => {
  it('shows the status and the percentage', () => {
    const r = render(0.9);
    expect(r.text).toContain('Near limit');
    expect(r.text).toContain('90%');
    expect(r.meter.getAttribute('aria-valuenow')).toBe('90');
    expect(r.fill.style.width).toBe('90%');
  });

  it('hides percentage, status, fill and aria value in privacy mode', () => {
    const r = render(1.4, true);
    expect(r.text).toContain('0%');
    expect(r.text).not.toMatch(/Over budget|140/);
    expect(r.meter.getAttribute('aria-valuenow')).toBe('0');
    expect(r.meter.getAttribute('aria-label')).toBeNull();
    expect(r.fill.style.width).toBe('0%');
    expect(r.fill.style.background).toContain('muted-foreground');
  });
});
