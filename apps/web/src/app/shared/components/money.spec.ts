import { TestBed } from '@angular/core/testing';
import { formatTestProviders } from '../../../testing/format-providers';
import { PrivacyStore } from '../../core/state/privacy.store';
import { Money } from './money';

function render(inputs: Record<string, unknown>, hidden = false) {
  localStorage.clear();
  TestBed.configureTestingModule({ providers: formatTestProviders('en').providers });
  TestBed.inject(PrivacyStore).set(hidden);
  const fixture = TestBed.createComponent(Money);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, text: el.textContent!.replace(/\s+/g, ' ').trim() };
}

afterEach(() => localStorage.clear());

describe('Money', () => {
  it('shows the amount, colored by sign', () => {
    const { text, el } = render({ value: -50, tone: 'auto' });
    expect(text).toBe('−RD$50.00');
    expect(el.className).toContain('text-negative');
  });

  it('shows 0 and no sign color in privacy mode', () => {
    const { text, el } = render({ value: -50, tone: 'auto' }, true);
    expect(text).toBe('RD$0.00');
    expect(el.className).not.toContain('text-negative');
    expect(el.className).not.toContain('text-positive');
  });

  it('masks the original foreign amount and converted value in the conversion tooltip', () => {
    const original = { amount: -3050, currency: 'USD', rate: 61 };
    const visible = render({ value: -3050, currency: 'DOP', original });
    const fx = (c: { fixture: { componentInstance: unknown } }) => (c.fixture.componentInstance as { fxText(): string }).fxText();
    expect(fx(visible)).toContain('−3,050.00 USD');
    TestBed.resetTestingModule();
    const masked = render({ value: -3050, currency: 'DOP', original }, true);
    expect(fx(masked)).not.toMatch(/3,?050/);
    expect(fx(masked)).toContain('0.00 USD');
    expect(fx(masked)).toContain('×61.0000'); // the rate is not an amount
  });

  it('reacts when privacy is toggled', () => {
    const { fixture, el } = render({ value: 1500 });
    expect(el.textContent).toContain('RD$1,500.00');
    TestBed.inject(PrivacyStore).set(true);
    fixture.detectChanges();
    expect(el.textContent).toContain('RD$0.00');
  });
});
