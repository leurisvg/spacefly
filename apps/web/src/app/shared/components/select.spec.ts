import { TestBed } from '@angular/core/testing';
import { formatTestProviders } from '../../../testing/format-providers';
import { Select, type SelectOption } from './select';

const T = { common: { search: 'Search…', noResults: 'No results' } };
const OPTIONS: SelectOption[] = [
  { value: '1', label: 'Alimentación' },
  { value: '2', label: 'Café y snacks' },
  { value: '3', label: 'Transporte' },
  { value: '4', label: 'Salud' },
  { value: '5', label: 'Salud mental' },
];

function setup(inputs: Record<string, unknown> = {}) {
  TestBed.configureTestingModule({ providers: formatTestProviders('en', T).providers });
  const fixture = TestBed.createComponent(Select);
  const ref = fixture.componentRef;
  ref.setInput('options', OPTIONS);
  ref.setInput('label', 'Category');
  ref.setInput('placeholder', 'All categories');
  for (const [k, v] of Object.entries(inputs)) ref.setInput(k, v);
  fixture.detectChanges();
  const trigger = () => fixture.nativeElement.querySelector('button[role="combobox"]') as HTMLButtonElement;
  const search = () => document.body.querySelector('input[role="combobox"]') as HTMLInputElement | null;
  const options = () => [...document.body.querySelectorAll('[role="option"]')] as HTMLElement[];
  const labels = () => options().map((o) => o.textContent!.trim());
  const settle = async () => {
    for (let i = 0; i < 5; i++) {
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r, 0));
    }
  };
  const open = async () => {
    trigger().click();
    await settle();
  };
  const type = async (text: string) => {
    const input = search()!;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await settle();
  };
  const press = async (key: string, el: Element | null = search()) => {
    el!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    await settle();
  };
  return { fixture, trigger, search, options, labels, open, type, press, settle, value: () => fixture.componentInstance.value() };
}

describe('Select', () => {
  it('shows the placeholder, then the selected label', () => {
    const s = setup();
    expect(s.trigger().textContent).toContain('All categories');
    expect(s.trigger().getAttribute('aria-label')).toBe('Category');
    expect(s.trigger().getAttribute('aria-expanded')).toBe('false');
    TestBed.resetTestingModule();
    const t = setup({ value: '3' });
    expect(t.trigger().textContent).toContain('Transporte');
  });

  it('opens with a search box and every option, the clear entry first', async () => {
    const s = setup();
    await s.open();
    expect(s.trigger().getAttribute('aria-expanded')).toBe('true');
    expect(s.search()).not.toBeNull();
    expect(s.labels()).toEqual(['All categories', ...OPTIONS.map((o) => o.label)]);
  });

  it('filters as you type, ignoring case and accents', async () => {
    const s = setup();
    await s.open();
    await s.type('cafe');
    expect(s.labels()).toEqual(['Café y snacks']);
    await s.type('ALIMENTACION');
    expect(s.labels()).toEqual(['Alimentación']);
    await s.type('salud');
    expect(s.labels()).toEqual(['Salud', 'Salud mental']);
  });

  it('needs every word to match, in any order', async () => {
    const s = setup();
    await s.open();
    await s.type('mental salud');
    expect(s.labels()).toEqual(['Salud mental']);
  });

  it('says so when nothing matches', async () => {
    const s = setup();
    await s.open();
    await s.type('zzz');
    expect(s.options()).toHaveLength(0);
    expect(document.body.textContent).toContain('No results');
  });

  it('picks with the keyboard: type, arrow down, Enter', async () => {
    const s = setup();
    await s.open();
    await s.type('salud');
    expect(s.search()!.getAttribute('aria-activedescendant')).toBe(s.options()[0].id);
    await s.press('ArrowDown');
    expect(s.search()!.getAttribute('aria-activedescendant')).toBe(s.options()[1].id);
    await s.press('Enter');
    expect(s.value()).toBe('5'); // "Salud mental"
    expect(s.trigger().textContent).toContain('Salud mental');
    expect(s.search()).toBeNull(); // closed
  });

  it('does not run past the ends of the list', async () => {
    const s = setup();
    await s.open();
    await s.type('transporte');
    await s.press('ArrowDown');
    await s.press('ArrowDown');
    await s.press('Enter');
    expect(s.value()).toBe('3');
  });

  it('picks with a click and marks the selected option', async () => {
    const s = setup();
    await s.open();
    s.options().find((o) => o.textContent!.includes('Transporte'))!.click();
    await s.settle();
    expect(s.value()).toBe('3');
    await s.open();
    const selected = s.options().filter((o) => o.getAttribute('aria-selected') === 'true');
    expect(selected.map((o) => o.textContent!.trim())).toEqual(['Transporte']);
  });

  it('clears the selection through the placeholder entry', async () => {
    const s = setup({ value: '2' });
    await s.open();
    s.options()[0].click();
    await s.settle();
    expect(s.value()).toBe('');
    expect(s.trigger().textContent).toContain('All categories');
  });

  it('hides the clear entry while searching', async () => {
    const s = setup();
    await s.open();
    await s.type('a');
    expect(s.labels()).not.toContain('All categories');
  });

  it('Escape closes it and returns focus to the trigger', async () => {
    const s = setup();
    await s.open();
    await s.press('Escape');
    expect(s.search()).toBeNull();
    expect(document.activeElement).toBe(s.trigger());
    expect(s.value()).toBe('');
  });

  it('starts every opening with an empty search', async () => {
    const s = setup();
    await s.open();
    await s.type('salud');
    await s.press('Escape');
    await s.open();
    expect(s.search()!.value).toBe('');
    expect(s.options()).toHaveLength(OPTIONS.length + 1);
  });

  it('opens with the arrow keys from the trigger', async () => {
    const s = setup();
    await s.press('ArrowDown', s.trigger());
    expect(s.search()).not.toBeNull();
  });

  it('can do without the search box for short fixed lists', async () => {
    const s = setup({ searchable: false });
    await s.open();
    expect(s.search()).toBeNull();
    expect(s.options()).toHaveLength(OPTIONS.length + 1);
    await s.press('ArrowDown', document.body.querySelector('[role="listbox"]'));
    await s.press('Enter', document.body.querySelector('[role="listbox"]'));
    expect(s.value()).toBe('1');
  });
});
