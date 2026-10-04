import { TestBed } from '@angular/core/testing';
import type { AccountSlot } from '@spacefly/shared';
import { formatTestProviders, loadTranslations } from '../../../testing/format-providers';
import { EN } from '../../../testing/translations';
import { TxTypeBadge } from './tx-type-badge';

async function render(source: AccountSlot, destination: AccountSlot) {
  TestBed.configureTestingModule({ providers: formatTestProviders('en', EN).providers });
  await loadTranslations();
  const fixture = TestBed.createComponent(TxTypeBadge);
  fixture.componentRef.setInput('source', source);
  fixture.componentRef.setInput('destination', destination);
  fixture.detectChanges();
  const el = fixture.nativeElement.querySelector('[role=status]') as HTMLElement;
  return { fixture, el, text: () => el.textContent!.trim() };
}

describe('TxTypeBadge', () => {
  it.each<[AccountSlot, AccountSlot, string]>([
    ['asset', 'expense', 'Expense'],
    ['asset', 'new', 'Expense'],
    ['revenue', 'asset', 'Income'],
    ['new', 'liability', 'Income'],
    ['asset', 'asset', 'Transfer'],
    ['liability', 'liability', 'Transfer'],
  ])('%s → %s shows %s', async (source, destination, label) => {
    expect((await render(source, destination)).text()).toBe(label);
  });

  it('asks for the accounts until both are chosen', async () => {
    expect((await render(null, 'asset')).text()).toBe('Pick the accounts');
    TestBed.resetTestingModule();
    expect((await render('asset', null)).text()).toBe('Pick the accounts');
  });

  it('warns about a combination Firefly rejects', async () => {
    expect((await render('revenue', 'expense')).text()).toBe('Invalid combination');
    TestBed.resetTestingModule();
    expect((await render('new', 'new')).text()).toBe('Invalid combination');
  });

  it('is a polite live region and follows the accounts live', async () => {
    const { fixture, el } = await render('asset', null);
    expect(el.getAttribute('aria-live')).toBe('polite');
    fixture.componentRef.setInput('destination', 'expense');
    fixture.detectChanges();
    expect(el.textContent!.trim()).toBe('Expense');
  });
});
