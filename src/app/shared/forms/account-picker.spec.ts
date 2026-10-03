import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField } from '@angular/forms/signals';
import type { AccountInput, AccountSlot, EditorAccount } from '@shared';
import { formatTestProviders, loadTranslations } from '../../../testing/format-providers';
import { EN } from '../../../testing/translations';
import { AccountPicker } from './account-picker';

const acc = (id: string, name: string, kind: EditorAccount['kind'], currency = 'DOP'): EditorAccount => ({
  id,
  name,
  kind,
  liabilityType: kind === 'liability' ? 'loan' : null,
  currency,
  role: null,
  group: null,
  balance: 0,
});
const ACCOUNTS = [
  acc('1', 'Banco Popular', 'asset'),
  acc('2', 'Cuenta USD', 'asset', 'USD'),
  acc('5', 'Préstamo vehículo', 'liability'),
  acc('10', 'Empresa SRL', 'revenue'),
  acc('20', 'Supermercado Nacional', 'expense'),
  acc('21', 'Netflix', 'expense'),
];

@Component({
  selector: 'sf-host',
  imports: [AccountPicker, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<sf-account-picker [formField]="f.account" [accounts]="accounts()" [side]="side()" [other]="other()" ariaLabel="Account" />`,
})
class Host {
  readonly accounts = signal(ACCOUNTS);
  readonly side = signal<'source' | 'destination'>('destination');
  readonly other = signal<AccountSlot>(null);
  readonly model = signal<{ account: AccountInput | null }>({ account: null });
  readonly f = form(this.model);
}

async function setup(side: 'source' | 'destination', other: AccountSlot = null) {
  TestBed.configureTestingModule({ providers: formatTestProviders('en', EN).providers });
  await loadTranslations();
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.side.set(side);
  fixture.componentInstance.other.set(other);
  fixture.detectChanges();
  const settle = async () => {
    for (let i = 0; i < 4; i++) {
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r, 0));
    }
  };
  const input = () => fixture.nativeElement.querySelector('input') as HTMLInputElement;
  const options = () => [...document.body.querySelectorAll('[role=option]')] as HTMLElement[];
  const labels = () => options().map((o) => [...o.querySelectorAll('span')].map((x) => x.textContent!.trim()).join(' '));
  const groups = () => [...document.body.querySelectorAll('[role=presentation]')].map((g) => g.textContent!.trim());
  const open = async () => {
    input().dispatchEvent(new Event('focus'));
    await settle();
  };
  const type = async (text: string) => {
    input().value = text;
    input().dispatchEvent(new Event('input'));
    await settle();
  };
  const press = async (key: string) => {
    input().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    await settle();
  };
  const value = () => fixture.componentInstance.model().account;
  return { fixture, host: fixture.componentInstance, input, options, labels, groups, open, type, press, settle, value };
}

afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = '')));

describe('AccountPicker', () => {
  it('groups destination accounts as assets, liabilities and expenses (no income sources)', async () => {
    const s = await setup('destination');
    await s.open();
    expect(s.groups()).toEqual(['Assets', 'Liabilities', 'Expenses']);
    expect(s.labels()).toEqual([
      'Banco Popular DOP',
      'Cuenta USD USD',
      'Préstamo vehículo DOP',
      'Supermercado Nacional DOP',
      'Netflix DOP',
    ]);
  });

  it('shows the balance of each account on the source side, in its own currency', async () => {
    const s = await setup('source');
    s.host.accounts.set([
      { ...ACCOUNTS[0]!, balance: 12345.5 },
      { ...ACCOUNTS[1]!, balance: -80 },
      { ...ACCOUNTS[2]!, balance: -420000 },
      ACCOUNTS[3]!,
    ]);
    await s.open();
    expect(s.labels()).toEqual(['Banco Popular RD$12,345.50', 'Cuenta USD −US$80.00', 'Préstamo vehículo −RD$420,000.00', 'Empresa SRL DOP']);
  });

  it('keeps showing the currency on the destination side', async () => {
    const s = await setup('destination');
    s.host.accounts.set([{ ...ACCOUNTS[0]!, balance: 999 }]);
    await s.open();
    expect(s.labels()).toEqual(['Banco Popular DOP']);
  });

  it('orders source accounts as assets, liabilities, then income sources', async () => {
    const s = await setup('source');
    await s.open();
    expect(s.groups()).toEqual(['Assets', 'Liabilities', 'Income']);
    expect(s.labels()).toContain('Empresa SRL DOP');
    expect(s.labels().some((l) => l.startsWith('Netflix'))).toBe(false);
  });

  it('filters while typing, ignoring case and accents, and picks an existing account by id', async () => {
    const s = await setup('destination');
    await s.open();
    await s.type('PRESTAMO');
    expect(s.labels()).toEqual(['Préstamo vehículo DOP', expect.stringContaining('New expense account')]);
    s.options()[0]!.click();
    await s.settle();
    expect(s.value()).toEqual({ id: '5' });
    expect(s.input().value).toBe('Préstamo vehículo');
  });

  it('offers to create a new expense account and keeps it as a name', async () => {
    const s = await setup('destination');
    await s.open();
    await s.type('Panadería La Esquina');
    expect(s.labels()).toEqual(['New expense account: “Panadería La Esquina”']);
    await s.press('Enter');
    expect(s.value()).toEqual({ name: 'Panadería La Esquina' });
    expect(s.input().value).toBe('Panadería La Esquina');
  });

  it('says "income source" when creating on the source side', async () => {
    const s = await setup('source');
    await s.open();
    await s.type('Cliente Nuevo');
    expect(s.labels()).toEqual(['New income source: “Cliente Nuevo”']);
  });

  it('does not offer to create something that already exists (no duplicates)', async () => {
    const s = await setup('destination');
    await s.open();
    await s.type('netflix');
    expect(s.labels()).toEqual(['Netflix DOP']); // an exact match, ignoring case: nothing to create
    await s.press('Enter');
    expect(s.value()).toEqual({ id: '21' });
  });

  it('marks accounts that cannot be combined with the other side as not valid', async () => {
    const s = await setup('destination', 'revenue'); // income source → only assets / liabilities make sense
    await s.open();
    const byLabel = (text: string) => s.options().find((o) => o.textContent!.includes(text))!;
    expect(byLabel('Banco Popular').getAttribute('aria-disabled')).toBeNull();
    expect(byLabel('Supermercado').getAttribute('aria-disabled')).toBe('true');
    expect(byLabel('Supermercado').textContent).toContain('Not compatible');
    byLabel('Supermercado').click();
    await s.settle();
    expect(s.value()).toBeNull();
    await s.type('Algo Nuevo');
    expect(s.options()[0]!.getAttribute('aria-disabled')).toBe('true'); // a new expense account is not valid here either
  });

  it('refuses new → new', async () => {
    const s = await setup('destination', 'new');
    await s.open();
    await s.type('Otro');
    expect(s.options()[0]!.getAttribute('aria-disabled')).toBe('true');
    await s.press('Enter');
    expect(s.value()).toBeNull();
  });

  it('shows the chosen account when the model is set from outside, and clears with an empty field', async () => {
    const s = await setup('destination');
    s.host.model.set({ account: { id: '20' } });
    await s.settle();
    expect(s.input().value).toBe('Supermercado Nacional');
    s.host.model.set({ account: { name: 'Algo' } });
    await s.settle();
    expect(s.input().value).toBe('Algo');
    await s.open();
    await s.type('');
    s.input().dispatchEvent(new Event('blur'));
    await s.settle();
    expect(s.value()).toBeNull();
  });

  it('puts back the previous text when the typed text matches nothing and nothing is created', async () => {
    const s = await setup('destination');
    s.host.model.set({ account: { id: '21' } });
    await s.settle();
    await s.open();
    await s.type('zzz');
    await s.press('Escape');
    expect(s.input().value).toBe('Netflix');
    expect(s.value()).toEqual({ id: '21' });
  });
});
