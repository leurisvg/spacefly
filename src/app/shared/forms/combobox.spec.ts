import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField } from '@angular/forms/signals';
import { formatTestProviders, loadTranslations } from '../../../testing/format-providers';
import { EN } from '../../../testing/translations';
import { Combobox, type ComboOption } from './combobox';

@Component({
  selector: 'sf-host',
  imports: [Combobox, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<sf-combobox [formField]="f.text" [options]="options()" [freeText]="true" ariaLabel="Description" (typed)="heard.push($event)" />`,
})
class Host {
  readonly options = signal<ComboOption[]>([]);
  readonly heard: string[] = [];
  readonly model = signal({ text: '' });
  readonly f = form(this.model);
}

async function setup() {
  TestBed.configureTestingModule({ providers: formatTestProviders('en', EN).providers });
  await loadTranslations();
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const settle = async () => {
    for (let i = 0; i < 4; i++) {
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r, 0));
    }
  };
  const input = () => fixture.nativeElement.querySelector('input') as HTMLInputElement;
  const options = () => [...document.body.querySelectorAll('[role=option]')] as HTMLElement[];
  const type = async (text: string) => {
    input().focus(); // a real focus, like the user's: choosing an option must not re-open the list
    input().value = text;
    input().dispatchEvent(new Event('input'));
    await settle();
  };
  const press = (key: string) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    input().dispatchEvent(event);
    return event;
  };
  return { fixture, host: fixture.componentInstance, input, options, type, press, settle };
}

afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = '')));

describe('Combobox (free text with suggestions)', () => {
  it('keeps what is typed as the value, suggestion or not', async () => {
    const s = await setup();
    await s.type('Super');
    expect(s.host.model().text).toBe('Super');
    expect(s.host.heard).toEqual(['Super']);
  });

  it('lists nothing while there are no suggestions', async () => {
    const s = await setup();
    await s.type('Super');
    expect(s.options()).toEqual([]);
  });

  it('shows the next suggestions after the list went empty while they were being fetched', async () => {
    const s = await setup();
    await s.type('Co');
    s.host.options.set([{ value: 'Compra quincenal', label: 'Compra quincenal' }]);
    await s.settle();
    expect(s.options()).toHaveLength(1);
    // Typing more: the suggestions are re-fetched, so for a moment there are none…
    await s.type('Com');
    s.host.options.set([]);
    await s.settle();
    expect(s.options()).toEqual([]);
    // …and the list must come back when they arrive.
    s.host.options.set([{ value: 'Compra rápida', label: 'Compra rápida' }]);
    await s.settle();
    expect(s.options().map((o) => o.textContent!.trim())).toEqual(['Compra rápida']);
  });

  it('shows suggestions as they arrive and fills the field when one is clicked', async () => {
    const s = await setup();
    await s.type('Comp');
    s.host.options.set([{ value: 'Compra quincenal', label: 'Compra quincenal' }, { value: 'Compra rápida', label: 'Compra rápida' }]);
    await s.settle();
    expect(s.options().map((o) => o.textContent!.trim())).toEqual(['Compra quincenal', 'Compra rápida']);
    s.options()[1]!.click();
    await s.settle();
    expect(s.host.model().text).toBe('Compra rápida');
    expect(s.input().value).toBe('Compra rápida');
    expect(s.options()).toEqual([]); // closed
  });

  it('narrows the suggestions to the text while new ones are on the way', async () => {
    const s = await setup();
    s.host.options.set([{ value: 'Compra quincenal', label: 'Compra quincenal' }, { value: 'Netflix', label: 'Netflix' }]);
    await s.type('netf');
    expect(s.options().map((o) => o.textContent!.trim())).toEqual(['Netflix']);
  });

  it('Enter picks a suggestion only after moving to it with the arrows; otherwise it is left to the form', async () => {
    const s = await setup();
    s.host.options.set([{ value: 'Compra quincenal', label: 'Compra quincenal' }]);
    await s.type('Comp');
    expect(s.press('Enter').defaultPrevented).toBe(false);
    expect(s.host.model().text).toBe('Comp');
    s.press('ArrowDown');
    await s.settle();
    const enter = s.press('Enter');
    await s.settle();
    expect(enter.defaultPrevented).toBe(true);
    expect(s.host.model().text).toBe('Compra quincenal');
  });

  it('keeps the typed text when it loses focus or Escape closes the list', async () => {
    const s = await setup();
    s.host.options.set([{ value: 'Compra quincenal', label: 'Compra quincenal' }]);
    await s.type('Comp');
    s.press('Escape');
    await s.settle();
    expect(s.input().value).toBe('Comp');
    await s.type('Compx');
    s.input().dispatchEvent(new Event('blur'));
    await s.settle();
    expect(s.host.model().text).toBe('Compx');
    expect(s.host.f.text().touched()).toBe(true);
  });

  it('follows the model when it is reset from outside', async () => {
    const s = await setup();
    await s.type('Algo');
    s.host.model.set({ text: '' });
    await s.settle();
    expect(s.input().value).toBe('');
  });
});
