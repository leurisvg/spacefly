import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField } from '@angular/forms/signals';
import { isPositiveAmount } from '@shared';
import { formatTestProviders } from '../../../testing/format-providers';
import { PrivacyStore } from '../../core/state/privacy.store';
import { MoneyInput } from './money-input';

@Component({
  selector: 'sf-host',
  imports: [MoneyInput, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<sf-money-input [formField]="f.amount" currency="USD" ariaLabel="Amount" />`,
})
class Host {
  readonly model = signal({ amount: '' });
  readonly f = form(this.model);
}

function setup(hidden = false) {
  localStorage.clear();
  TestBed.configureTestingModule({ providers: formatTestProviders('en').providers });
  TestBed.inject(PrivacyStore).set(hidden);
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
  const amount = () => fixture.componentInstance.model().amount;
  const settle = async () => {
    for (let i = 0; i < 3; i++) {
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r, 0));
    }
  };
  const type = async (text: string) => {
    input.dispatchEvent(new Event('focus'));
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await settle();
  };
  const blur = async () => {
    input.dispatchEvent(new Event('blur'));
    await settle();
  };
  return { fixture, host: fixture.componentInstance, input, amount, settle, type, blur };
}

afterEach(() => localStorage.clear());

describe('MoneyInput', () => {
  it('shows the currency symbol', () => {
    const s = setup();
    expect(s.fixture.nativeElement.textContent).toContain('US$');
  });

  it.each([
    ['1,234.56', '1234.56'],
    ['1234,5', '1234.5'],
    ['1.234,56', '1234.56'],
    ['  75 ', '75'],
    ['.5', '0.5'],
  ])('parses %s as %s', async (typed, expected) => {
    const s = setup();
    await s.type(typed);
    expect(s.amount()).toBe(expected);
  });

  it('keeps unparsable text in the model so validation can flag it, and clears when emptied', async () => {
    const s = setup();
    await s.type('abc');
    expect(s.amount()).toBe('abc');
    expect(isPositiveAmount(s.amount())).toBe(false);
    await s.type('');
    expect(s.amount()).toBe('');
  });

  it('formats on blur and shows the plain number again on focus', async () => {
    const s = setup();
    await s.type('1234.5');
    expect(s.input.value).toBe('1234.5'); // what you typed, untouched while editing
    await s.blur();
    expect(s.input.value).toBe('1,234.50');
    expect(s.amount()).toBe('1234.5');
    s.input.dispatchEvent(new Event('focus'));
    await s.settle();
    expect(s.input.value).toBe('1234.5');
  });

  it('formats a value set from outside', async () => {
    const s = setup();
    s.host.model.set({ amount: '5000' });
    await s.settle();
    expect(s.input.value).toBe('5,000.00');
    s.host.model.set({ amount: '' });
    await s.settle();
    expect(s.input.value).toBe('');
  });

  it('marks the field touched on blur', async () => {
    const s = setup();
    expect(s.host.f.amount().touched()).toBe(false);
    await s.type('1');
    await s.blur();
    expect(s.host.f.amount().touched()).toBe(true);
  });

  it('blurs the value in privacy mode unless the field has focus', async () => {
    const s = setup(true);
    s.host.model.set({ amount: '250' });
    await s.settle();
    expect(s.input.className).toContain('blur-sm');
    s.input.dispatchEvent(new Event('focus'));
    await s.settle();
    expect(s.input.className).not.toContain('blur-sm');
    await s.blur();
    expect(s.input.className).toContain('blur-sm');
  });

  it('is not blurred when privacy mode is off', () => {
    expect(setup(false).input.className).not.toContain('blur-sm');
  });
});
