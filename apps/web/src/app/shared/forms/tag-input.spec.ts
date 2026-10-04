import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField } from '@angular/forms/signals';
import { formatTestProviders, loadTranslations } from '@spacefly/client/testing';
import { EN } from '@spacefly/client/testing';
import { TagInput } from './tag-input';

@Component({
  selector: 'sf-host',
  imports: [TagInput, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<sf-tag-input [formField]="f.tags" [suggestions]="['hogar', 'trabajo', 'viaje']" ariaLabel="Tags" />`,
})
class Host {
  readonly model = signal<{ tags: string[] }>({ tags: [] });
  readonly f = form(this.model);
}

async function setup(initial: string[] = []) {
  TestBed.configureTestingModule({ providers: formatTestProviders('en', EN).providers });
  await loadTranslations();
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.model.set({ tags: initial });
  fixture.detectChanges();
  const settle = async () => {
    for (let i = 0; i < 4; i++) {
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r, 0));
    }
  };
  const input = () => fixture.nativeElement.querySelector('input') as HTMLInputElement;
  const chips = () => [...fixture.nativeElement.querySelectorAll('li')].map((li: HTMLElement) => li.textContent!.trim());
  const options = () => [...document.body.querySelectorAll('[role=option]')].map((o) => o.textContent!.trim());
  const type = async (text: string) => {
    input().dispatchEvent(new Event('focus'));
    input().value = text;
    input().dispatchEvent(new Event('input'));
    await settle();
  };
  const press = async (key: string) => {
    input().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    await settle();
  };
  const tags = () => fixture.componentInstance.model().tags;
  return { fixture, input, chips, options, type, press, settle, tags };
}

afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = '')));

describe('TagInput', () => {
  it('shows the current tags as chips', async () => {
    const s = await setup(['hogar', 'viaje']);
    expect(s.chips()).toEqual(['#hogar', '#viaje']);
  });

  it('suggests existing tags that are not chosen yet', async () => {
    const s = await setup(['hogar']);
    await s.type('');
    expect(s.options()).toEqual(['trabajo', 'viaje']);
  });

  it('adds a suggestion by clicking it and empties the field', async () => {
    const s = await setup();
    await s.type('tra');
    (document.body.querySelector('[role=option]') as HTMLElement).click();
    await s.settle();
    expect(s.tags()).toEqual(['trabajo']);
    expect(s.input().value).toBe('');
  });

  it('adds free text with Enter, ignoring duplicates', async () => {
    const s = await setup(['hogar']);
    await s.type('Nuevo');
    expect(s.options()).toEqual(['Add “Nuevo”']);
    await s.press('Enter');
    expect(s.tags()).toEqual(['hogar', 'Nuevo']);
    await s.type('HOGAR');
    await s.press('Enter');
    expect(s.tags()).toEqual(['hogar', 'Nuevo']);
  });

  it('removes a tag with its button', async () => {
    const s = await setup(['hogar', 'viaje']);
    (s.fixture.nativeElement.querySelector('button[aria-label="Remove hogar"]') as HTMLButtonElement).click();
    await s.settle();
    expect(s.tags()).toEqual(['viaje']);
  });

  it('Backspace on an empty field removes the last tag', async () => {
    const s = await setup(['hogar', 'viaje']);
    await s.press('Backspace');
    expect(s.tags()).toEqual(['hogar']);
    await s.type('x');
    await s.press('Backspace');
    expect(s.tags()).toEqual(['hogar']); // text present: Backspace edits the text instead
  });
});
