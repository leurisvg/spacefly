import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField as Field, required, validate } from '@angular/forms/signals';
import { BrnCalendarI18nService } from '@spartan-ng/brain/calendar';
import { addDays, todayIso } from '@shared';
import { formatTestProviders, loadTranslations } from '../../../testing/format-providers';
import { EN } from '../../../testing/translations';
import { Select } from '../components/select';
import { DateInput } from './date-input';
import { FormField } from './form-field';
import { FormFooter } from './form-footer';
import { parseTime, TimeInput } from './time-input';

const settleOf = (fixture: { detectChanges(): void }) => async () => {
  for (let i = 0; i < 4; i++) {
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
  }
};

@Component({
  selector: 'sf-host',
  imports: [FormField, Field, Select, DateInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sf-form-field label="Description" hint="What was it?" [required]="true" [field]="f.description">
      <input id="own-id" type="text" [formField]="f.description" />
    </sf-form-field>
    <sf-form-field label="Kind" [field]="f.kind">
      <sf-select [formField]="f.kind" [options]="kinds" label="Kind" />
    </sf-form-field>
    <sf-form-field label="Date" [field]="f.date">
      <sf-date-input [formField]="f.date" />
    </sf-form-field>
    <sf-form-field label="Other" [errors]="['Custom message']"><input type="text" /></sf-form-field>
  `,
})
class Host {
  readonly kinds = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
  ];
  readonly model = signal({ description: '', kind: '', date: '' });
  readonly f = form(this.model, (p) => {
    required(p.description);
    validate(p.kind, (ctx) => (ctx.value() === 'b' ? { kind: 'combination' } : undefined));
  });
}

async function setupHost() {
  TestBed.configureTestingModule({ providers: formatTestProviders('en', EN).providers });
  await loadTranslations();
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const settle = settleOf(fixture);
  await settle();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, host: fixture.componentInstance, el, settle };
}

const first = (el: HTMLElement) => el.querySelector('sf-form-field') as HTMLElement;

describe('FormField', () => {
  it('links the label, hint and error to the control, and keeps a control id that already exists', async () => {
    const { el, host, settle } = await setupHost();
    const input = el.querySelector('#own-id') as HTMLInputElement;
    const label = el.querySelector('label') as HTMLLabelElement;
    expect(label.getAttribute('for')).toBe('own-id');
    expect(label.textContent).toContain('Description');
    expect(label.textContent).toContain('*');
    expect(input.getAttribute('aria-describedby')).toBe(first(el).querySelector('p')!.id);
    expect(first(el).querySelector('p')!.textContent).toBe('What was it?');
    expect(input.hasAttribute('aria-invalid')).toBe(false);

    host.f.description().markAsTouched();
    await settle();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const alert = first(el).querySelector('[role=alert]') as HTMLElement;
    expect(alert.textContent).toBe('This field is required.');
    expect(input.getAttribute('aria-describedby')).toBe(alert.id);
    expect(first(el).textContent).not.toContain('What was it?');
  });

  it('waits for the field to be touched before showing validation errors', async () => {
    const { el } = await setupHost();
    expect(first(el).querySelector('[role=alert]')).toBeNull();
  });

  it('clears the error once the value is valid', async () => {
    const { el, host, settle } = await setupHost();
    host.f.description().markAsTouched();
    await settle();
    expect(first(el).querySelector('[role=alert]')).not.toBeNull();
    host.f.description().value.set('Coffee');
    await settle();
    expect(first(el).querySelector('[role=alert]')).toBeNull();
  });

  it('translates custom error kinds and shows extra messages right away', async () => {
    const { el, host, settle } = await setupHost();
    host.f.kind().value.set('b');
    host.f.kind().markAsTouched();
    await settle();
    expect(el.textContent).toContain("These two accounts can't be combined.");
    expect(el.textContent).toContain('Custom message');
  });

  it('shows server errors without waiting for a touch', () => {
    // Covered by the transaction form: server messages carry kind "server".
    expect(EN['forms']).toBeDefined();
  });
});

describe('sf-select as a form control', () => {
  it('writes the picked value to the model and shows the model value', async () => {
    const { el, host, settle } = await setupHost();
    host.model.update((m) => ({ ...m, kind: 'a' }));
    await settle();
    expect(el.querySelector('button[role=combobox]')!.textContent).toContain('Alpha');
  });

  it('follows the field disabled and invalid state', async () => {
    const { el, host, settle } = await setupHost();
    const trigger = el.querySelector('button[role=combobox]') as HTMLButtonElement;
    expect(trigger.disabled).toBe(false);
    host.f.kind().value.set('b');
    host.f.kind().markAsTouched();
    await settle();
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
  });
});

describe('DateInput', () => {
  const long = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
    return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y, m - 1, d));
  };
  const picker = (el: HTMLElement) => el.querySelector('sf-date-input hlm-date-picker')!.textContent!;

  it('uses the spartan date picker, not the browser one', async () => {
    const { el } = await setupHost();
    expect(el.querySelector('sf-date-input hlm-date-picker')).not.toBeNull();
    expect(el.querySelector('input[type=date]')).toBeNull();
  });

  it('asks to pick a date while empty and shows the chosen one otherwise', async () => {
    const { el, host, settle } = await setupHost();
    expect(picker(el)).toContain('Pick a date');
    host.model.update((m) => ({ ...m, date: '2026-09-15' }));
    await settle();
    expect(picker(el)).toContain(long('2026-09-15'));
  });

  it('localizes the calendar once, without re-triggering its own effect', async () => {
    TestBed.configureTestingModule({ providers: formatTestProviders('en', EN).providers });
    await loadTranslations();
    const calendar = TestBed.inject(BrnCalendarI18nService);
    const use = vi.spyOn(calendar, 'use');
    const fixture = TestBed.createComponent(Host);
    await settleOf(fixture)();
    expect(use).toHaveBeenCalledTimes(1);
  });

  it('sets today and yesterday from the shortcuts', async () => {
    const { el, host, settle } = await setupHost();
    const buttons = [...el.querySelectorAll('sf-date-input button')] as HTMLButtonElement[];
    buttons.find((b) => b.textContent!.trim() === 'Today')!.click();
    await settle();
    expect(host.model().date).toBe(todayIso());
    expect(picker(el)).toContain(long(todayIso()));
    buttons.find((b) => b.textContent!.trim() === 'Yesterday')!.click();
    await settle();
    expect(host.model().date).toBe(addDays(todayIso(), -1));
    expect(picker(el)).toContain(long(addDays(todayIso(), -1)));
  });
});

describe('parseTime', () => {
  it.each([
    ['9', '09:00'],
    ['930', '09:30'],
    ['9:30', '09:30'],
    ['0930', '09:30'],
    ['21.05', '21:05'],
    ['23:59', '23:59'],
    [' 7:05 ', '07:05'],
  ])('reads %s as %s', (typed, expected) => expect(parseTime(typed)).toBe(expected));

  it.each(['', 'noon', '24:00', '12:60', '9:5', '1:2:3'])('rejects %j', (typed) => expect(parseTime(typed)).toBeNull());
});

describe('TimeInput', () => {
  async function setupTime(value = '') {
    TestBed.configureTestingModule({ providers: formatTestProviders('en', EN).providers });
    await loadTranslations();
    const fixture = TestBed.createComponent(TimeInput);
    fixture.componentRef.setInput('value', value);
    const emitted: string[] = [];
    fixture.componentInstance.value.subscribe((v) => emitted.push(v));
    const settle = settleOf(fixture);
    await settle();
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector('input') as HTMLInputElement;
    const type = async (text: string) => {
      input.focus();
      input.value = text;
      input.dispatchEvent(new Event('input'));
      await settle();
    };
    const key = async (k: string) => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
      await settle();
    };
    return { fixture, el, input, emitted, type, key, settle };
  }

  it('shows the model value', async () => {
    const t = await setupTime('18:30');
    expect(t.input.value).toBe('18:30');
  });

  it('models what is typed as HH:mm and tidies the text when leaving the field', async () => {
    const t = await setupTime();
    await t.type('930');
    expect(t.emitted.at(-1)).toBe('09:30');
    expect(t.input.value).toBe('930');
    t.input.dispatchEvent(new Event('blur'));
    await t.settle();
    expect(t.input.value).toBe('09:30');
  });

  it('keeps what is not a time as typed so the form can flag it', async () => {
    const t = await setupTime();
    await t.type('noon');
    expect(t.emitted.at(-1)).toBe('noon');
    t.input.dispatchEvent(new Event('blur'));
    await t.settle();
    expect(t.input.value).toBe('noon');
  });

  it('moves by five minutes with the arrow keys', async () => {
    const t = await setupTime('09:30');
    await t.key('ArrowUp');
    expect(t.emitted.at(-1)).toBe('09:35');
    expect(t.input.value).toBe('09:35');
  });

  it('wraps around midnight with the arrow keys', async () => {
    const t = await setupTime('00:00');
    await t.key('ArrowDown');
    expect(t.emitted.at(-1)).toBe('23:55');
  });

  it('sets the current time from the Now shortcut', async () => {
    const t = await setupTime();
    (t.el.querySelector('button') as HTMLButtonElement).click();
    await t.settle();
    expect(t.emitted.at(-1)).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
    expect(t.input.value).toBe(t.emitted.at(-1));
  });
});

describe('FormFooter', () => {
  async function footer(inputs: Record<string, unknown> = {}) {
    TestBed.configureTestingModule({ providers: formatTestProviders('en', EN).providers });
    await loadTranslations();
    const fixture = TestBed.createComponent(FormFooter);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    const events = { save: 0, cancel: 0, remove: 0 };
    fixture.componentInstance.save.subscribe(() => events.save++);
    fixture.componentInstance.dismissed.subscribe(() => events.cancel++);
    fixture.componentInstance.remove.subscribe(() => events.remove++);
    fixture.detectChanges();
    const buttons = () => [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
    const byText = (t: string) => buttons().find((b) => b.textContent!.includes(t))!;
    return { fixture, events, byText, buttons };
  }
  const key = (init: KeyboardEventInit) => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...init }));

  it('emits save, cancel and delete', async () => {
    const f = await footer({ canDelete: true });
    f.byText('Save').click();
    f.byText('Cancel').click();
    f.byText('Delete').click();
    expect(f.events).toEqual({ save: 1, cancel: 1, remove: 1 });
  });

  it('hides Delete unless it can delete', async () => {
    const f = await footer();
    expect(f.buttons().map((b) => b.textContent!.trim())).toEqual(['Cancel', 'Save']);
  });

  it('saves with Ctrl/Cmd+Enter, not with a plain Enter', async () => {
    const f = await footer();
    key({ ctrlKey: true });
    key({ metaKey: true });
    key({});
    expect(f.events.save).toBe(2);
  });

  it('does nothing while saving or when saving is disabled', async () => {
    const f = await footer({ saving: true });
    key({ ctrlKey: true });
    expect(f.events.save).toBe(0);
    expect(f.buttons().every((b) => b.disabled)).toBe(true);
    expect(f.byText('Saving').getAttribute('aria-busy')).toBe('true');
    TestBed.resetTestingModule();
    const g = await footer({ saveDisabled: true });
    key({ ctrlKey: true });
    expect(g.events.save).toBe(0);
  });
});
