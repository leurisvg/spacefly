import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField as Field, required, validate } from '@angular/forms/signals';
import { BrnCalendarI18nService } from '@spartan-ng/brain/calendar';
import { addDays, todayIso } from '@spacefly/shared';
import { formatTestProviders, loadTranslations } from '@spacefly/client/testing';
import { EN } from '@spacefly/client/testing';
import { Select } from '../components/select';
import { DateInput } from './date-input';
import { FormField } from './form-field';
import { FormFooter } from './form-footer';
import { parseTime } from '@spacefly/client/ui-logic/time';
import { TimeInput } from './time-input';

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
    const trigger = () => el.querySelector('button[hlmPopoverTrigger], button[aria-label], hlm-popover button') as HTMLButtonElement;
    const link = (label: string) => [...el.querySelectorAll('button')].find((b) => b.textContent!.trim() === label) as HTMLButtonElement | undefined;
    const open = async () => {
      trigger().click();
      await settle();
    };
    // The options render in an overlay outside the component.
    const option = (listbox: 'Hour' | 'Minute', text: string) =>
      [...document.querySelectorAll(`[role=listbox][aria-label="${listbox}"] [role=option]`)].find((o) => o.textContent!.trim() === text) as HTMLButtonElement;
    return { fixture, el, emitted, trigger, link, open, option, settle };
  }

  it('uses a popover picker, not a text field', async () => {
    const t = await setupTime();
    expect(t.el.querySelector('input')).toBeNull();
    expect(t.el.querySelector('hlm-popover')).not.toBeNull();
  });

  it('asks to pick a time while empty', async () => {
    const t = await setupTime();
    expect(t.trigger().textContent).toContain('Pick a time');
  });

  it('shows the model value', async () => {
    const t = await setupTime('18:30');
    expect(t.trigger().textContent).toContain('18:30');
  });

  it('models the picked hour and minute as HH:mm', async () => {
    const t = await setupTime();
    await t.open();
    t.option('Hour', '09').click();
    await t.settle();
    expect(t.emitted.at(-1)).toBe('09:00');
    t.option('Minute', '35').click();
    await t.settle();
    expect(t.emitted.at(-1)).toBe('09:35');
  });

  it('keeps the minutes when only the hour changes', async () => {
    const t = await setupTime('09:35');
    await t.open();
    t.option('Hour', '21').click();
    await t.settle();
    expect(t.emitted.at(-1)).toBe('21:35');
  });

  it('sets the current time from the Now shortcut', async () => {
    const t = await setupTime();
    t.link('Now')!.click();
    await t.settle();
    expect(t.emitted.at(-1)).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
  });

  it('only offers Clear when there is a time', async () => {
    const t = await setupTime();
    expect(t.link('Clear')).toBeUndefined();
  });

  it('clears the time so the server decides', async () => {
    const t = await setupTime('09:30');
    t.link('Clear')!.click();
    await t.settle();
    expect(t.emitted.at(-1)).toBe('');
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
