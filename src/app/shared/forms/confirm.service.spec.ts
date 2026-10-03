import { TestBed } from '@angular/core/testing';
import { formatTestProviders, loadTranslations } from '../../../testing/format-providers';
import { EN } from '../../../testing/translations';
import { ConfirmService, type ConfirmOptions } from './confirm.service';

async function setup() {
  TestBed.configureTestingModule({ providers: formatTestProviders('en', EN).providers });
  await loadTranslations();
  const service = TestBed.inject(ConfirmService);
  const settle = () => new Promise((r) => setTimeout(r, 20));
  const dialog = () => document.body.querySelector('sf-confirm-dialog') as HTMLElement | null;
  const button = (text: string) => [...dialog()!.querySelectorAll('button')].find((b) => b.textContent!.trim() === text) as HTMLButtonElement;
  const ask = async (options: ConfirmOptions) => {
    const answer = service.confirm(options);
    await settle();
    return answer;
  };
  return { service, dialog, button, ask, settle };
}

describe('ConfirmService', () => {
  it('resolves true when confirmed', async () => {
    const s = await setup();
    const answer = s.service.confirm({ title: 'Delete it?', message: 'This cannot be undone.', confirmLabel: 'Delete', destructive: true });
    await s.settle();
    expect(s.dialog()!.textContent).toContain('Delete it?');
    expect(s.dialog()!.textContent).toContain('This cannot be undone.');
    s.button('Delete').click();
    expect(await answer).toBe(true);
  });

  it('resolves false when cancelled', async () => {
    const s = await setup();
    const answer = s.service.confirm({ title: 'Delete it?', message: 'Sure?' });
    await s.settle();
    s.button('Cancel').click();
    expect(await answer).toBe(false);
  });

  it('makes the user type the required text before enabling the button', async () => {
    const s = await setup();
    const answer = s.service.confirm({ title: 'Delete account', message: '12 transactions will be deleted.', confirmLabel: 'Delete', requireText: 'Banco Popular', destructive: true });
    await s.settle();
    expect(s.dialog()!.textContent).toContain('Type “Banco Popular” to confirm');
    const input = s.dialog()!.querySelector('input') as HTMLInputElement;
    const ok = s.button('Delete');
    expect(ok.disabled).toBe(true);

    const type = async (text: string) => {
      input.value = text;
      input.dispatchEvent(new Event('input'));
      await s.settle();
    };
    await type('Banco');
    expect(ok.disabled).toBe(true);
    await type('banco popular'); // case and accents don't matter
    expect(ok.disabled).toBe(false);
    ok.click();
    expect(await answer).toBe(true);
  });

  it('does not confirm with Enter until the text matches', async () => {
    const s = await setup();
    const answer = s.service.confirm({ title: 'Delete account', message: 'x', requireText: 'Visa' });
    await s.settle();
    const input = s.dialog()!.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await s.settle();
    expect(s.dialog()).not.toBeNull();
    s.button('Cancel').click();
    expect(await answer).toBe(false);
  });
});
