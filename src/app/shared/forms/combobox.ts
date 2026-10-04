import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, model, output, signal, untracked, viewChild } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideChevronDown, lucidePlus } from '@ng-icons/lucide';
import { HlmInput } from '@spartan-ng/helm/input';
import { I18n } from '../../core/i18n/i18n';
import { fold } from './fold';

export interface ComboOption {
  value: string;
  label: string;
  group?: string;
  /** Secondary text on the right (a currency, a count…). */
  hint?: string;
  /** `negative` paints the hint red. */
  hintTone?: 'negative';
  /** Not selectable; rendered as not valid. */
  invalid?: boolean;
  invalidReason?: string;
}

export interface ComboSelection {
  value: string;
  /** `true` when the user chose "Create …": `value` is then the typed text. */
  created: boolean;
  label: string;
}

type Entry =
  | { kind: 'group'; key: string; label: string }
  | { kind: 'option'; key: string; option: ComboOption }
  | { kind: 'create'; key: string; label: string };

let nextId = 0;

/**
 * Searchable combobox with grouped options and an optional «Create "X"» entry (only offered when
 * nothing matches the text exactly). It is a form control: `value` is the picked option's value, or
 * the typed text when it was created (`created` tells which).
 */
@Component({
  selector: 'sf-combobox',
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, NgIcon, HlmInput],
  providers: [provideIcons({ lucideChevronDown, lucideCheck, lucidePlus })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <div cdkOverlayOrigin #origin="cdkOverlayOrigin" class="relative">
      <input
        #field
        hlmInput
        type="text"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        class="h-8 text-sm"
        [class.pr-8]="!showSuffix()"
        [class.pr-28]="showSuffix()"
        [value]="text()"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [attr.aria-label]="ariaLabel() || null"
        [attr.aria-invalid]="invalid() || null"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="open() ? listId : null"
        [attr.aria-activedescendant]="activeId()"
        (input)="onInput($any($event.target).value)"
        (focus)="onFocus()"
        (blur)="onBlur()"
        (keydown)="onKey($event)"
        (mousedown)="openList()"
      />
      @if (showSuffix()) {
        <span
          class="num pointer-events-none absolute right-8 top-1/2 max-w-24 -translate-y-1/2 truncate text-xs"
          [class.text-muted-foreground]="!suffixNegative()"
          [class.text-negative]="suffixNegative()"
          >{{ suffix() }}</span
        >
      }
      <ng-icon name="lucideChevronDown" class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
    </div>
    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="open() && !disabled() && (!freeText() || entries().length > 0)"
      [cdkConnectedOverlayWidth]="width()"
      [cdkConnectedOverlayOffsetY]="4"
      (overlayOutsideClick)="onOutside($event)"
      (detach)="open.set(false)"
    >
      <ul
        role="listbox"
        class="max-h-64 overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
        [id]="listId"
        [attr.aria-label]="ariaLabel() || null"
      >
        @for (e of entries(); track e.key; let i = $index) {
          @if (e.kind === 'group') {
            <li role="presentation" class="eyebrow px-2 pb-1 pt-2">{{ e.label }}</li>
          } @else {
            <!-- Listbox pattern: DOM focus stays on the input (aria-activedescendant); the mouse must not steal it. -->
            <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
            <li
              role="option"
              class="flex items-center gap-2 rounded px-2 py-1.5 text-sm"
              [id]="optionId(i)"
              [class.cursor-pointer]="!isDisabled(e)"
              [class.bg-muted]="i === active()"
              [class.opacity-50]="isDisabled(e)"
              [attr.aria-selected]="e.kind === 'option' && e.option.value === value() && !created()"
              [attr.aria-disabled]="isDisabled(e) || null"
              (mousedown)="$event.preventDefault()"
              (click)="choose(e)"
              (mousemove)="hover(i)"
            >
              @if (e.kind === 'create') {
                <ng-icon name="lucidePlus" class="text-primary" aria-hidden="true" />
                <span class="flex-1 truncate">{{ e.label }}</span>
                @if (createInvalid()) {
                  <span class="text-xs text-muted-foreground">{{ createInvalidReason() }}</span>
                }
              } @else {
                <span class="flex-1 truncate">{{ e.option.label }}</span>
                @if (e.option.invalid && e.option.invalidReason) {
                  <span class="text-xs text-muted-foreground">{{ e.option.invalidReason }}</span>
                } @else if (e.option.hint) {
                  <span class="num text-xs" [class.text-muted-foreground]="e.option.hintTone !== 'negative'" [class.text-negative]="e.option.hintTone === 'negative'">{{ e.option.hint }}</span>
                }
                @if (e.option.value === value() && !created()) {
                  <ng-icon name="lucideCheck" class="text-primary" aria-hidden="true" />
                }
              }
            </li>
          }
        } @empty {
          <li class="px-2 py-3 text-center text-xs text-muted-foreground">{{ i18n.t('common.noResults') }}</li>
        }
        @if (hiddenCount() > 0) {
          <li role="presentation" class="px-2 py-2 text-center text-xs text-muted-foreground">{{ i18n.t('forms.moreResults', { count: hiddenCount() }) }}</li>
        }
      </ul>
    </ng-template>
  `,
})
export class Combobox implements FormValueControl<string> {
  protected readonly i18n = inject(I18n);

  readonly options = input.required<ComboOption[]>();
  readonly value = model('');
  /** `true` while `value` holds text the user created rather than an option's value. */
  readonly created = model(false);
  readonly placeholder = input('');
  readonly ariaLabel = input('');
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly touched = input(false);
  readonly touch = output<void>();
  /** Offer «Create "X"» when the text matches no option exactly. */
  readonly allowCreate = input(false);
  /** Builds the label of the create entry; defaults to «Create "X"». */
  readonly createLabel = input<((name: string) => string) | null>(null);
  readonly createInvalid = input(false);
  readonly createInvalidReason = input('');
  /** Emptying the text clears the value. */
  readonly clearable = input(true);
  /** After a pick, empty the field again (tag inputs). */
  readonly resetOnPick = input(false);
  /** Text shown inside the field, right of the picked label (a balance…). Hidden while the list is open. */
  readonly suffix = input('');
  readonly suffixNegative = input(false);
  /** Cap on listed options; the rest is reached by typing. */
  readonly maxVisible = input(50);
  /** Emits on every choice, including clearing (`value: ''`). */
  readonly selection = output<ComboSelection>();
  /**
   * Plain text field with suggestions: `value` is always what is typed, options are only offered as
   * shortcuts (and nothing is listed when there are none). Enter keeps submitting the form unless a
   * suggestion was moved to with the arrow keys.
   */
  readonly freeText = input(false);
  /** Emits the text as the user types (to fetch suggestions). */
  readonly typed = output<string>();

  private readonly fieldEl = viewChild.required<ElementRef<HTMLInputElement>>('field');
  private readonly origin = viewChild.required(CdkOverlayOrigin);
  protected readonly uid = nextId++;
  protected readonly listId = `sf-combobox-${this.uid}`;
  protected readonly open = signal(false);
  protected readonly text = signal('');
  /** What the user typed since opening; empty means "show everything". */
  private readonly query = signal('');
  protected readonly active = signal(0);
  protected readonly width = signal(240);
  private readonly focused = signal(false);

  protected readonly showSuffix = computed(() => !!this.suffix() && !this.open() && !!this.value() && !this.created());

  private readonly selectedLabel = computed(() => {
    const v = this.value();
    if (!v) return '';
    if (this.created() || this.freeText()) return v;
    return this.options().find((o) => o.value === v)?.label ?? '';
  });

  private readonly built = computed(() => {
    const words = fold(this.query()).split(/\s+/).filter(Boolean);
    const matches = this.options().filter((o) => {
      if (!words.length) return true;
      const label = fold(`${o.label} ${o.group ?? ''}`);
      return words.every((w) => label.includes(w));
    });
    const cap = this.maxVisible();
    const shown = matches.slice(0, cap);
    const entries: Entry[] = [];
    let group: string | undefined;
    for (const option of shown) {
      if (option.group && option.group !== group) entries.push({ kind: 'group', key: `g:${option.group}`, label: option.group });
      group = option.group;
      entries.push({ kind: 'option', key: `o:${option.value}`, option });
    }
    const typed = this.query().trim();
    if (this.allowCreate() && typed && !this.options().some((o) => fold(o.label) === fold(typed))) {
      const label = this.createLabel()?.(typed) ?? this.i18n.t('forms.createOption', { name: typed });
      entries.push({ kind: 'create', key: 'create', label });
    }
    return { entries, hidden: matches.length - shown.length };
  });
  protected readonly entries = computed(() => this.built().entries);
  protected readonly hiddenCount = computed(() => this.built().hidden);
  protected readonly activeId = computed(() =>
    this.open() && this.active() >= 0 && this.entries()[this.active()] && this.entries()[this.active()]!.kind !== 'group' ? this.optionId(this.active()) : null,
  );

  constructor() {
    // Mirror the model into the text box while the user isn't typing.
    effect(() => {
      const label = this.selectedLabel();
      if (this.freeText()) {
        if (untracked(this.text) !== label) this.text.set(label);
      } else if (!untracked(this.focused) || !untracked(this.open)) this.text.set(label);
    });
    effect(() => {
      const id = this.activeId();
      if (id) queueMicrotask(() => document.getElementById(id)?.scrollIntoView?.({ block: 'nearest' }));
    });
  }

  protected optionId(i: number): string {
    return `sf-combobox-${this.uid}-opt-${i}`;
  }

  protected isDisabled(e: Entry): boolean {
    return (e.kind === 'option' && !!e.option.invalid) || (e.kind === 'create' && this.createInvalid());
  }

  protected openList(): void {
    if (this.disabled() || this.open()) return;
    this.width.set(this.origin().elementRef.nativeElement.offsetWidth);
    this.query.set('');
    this.open.set(true);
    const current = this.entries().findIndex((e) => e.kind === 'option' && e.option.value === this.value() && !this.created());
    this.active.set(this.freeText() ? -1 : current >= 0 ? current : this.firstSelectable(0, 1));
  }

  protected onFocus(): void {
    this.focused.set(true);
    this.fieldEl().nativeElement.select();
    this.openList();
  }

  protected onInput(text: string): void {
    this.text.set(text);
    this.openList();
    this.query.set(text);
    if (this.freeText()) {
      this.value.set(text);
      this.created.set(false);
      this.typed.emit(text);
      this.active.set(-1);
      return;
    }
    this.active.set(this.firstSelectable(0, 1));
  }

  protected onBlur(): void {
    this.focused.set(false);
    if (this.open()) this.settle();
    this.touch.emit();
  }

  protected onOutside(event: MouseEvent): void {
    if (!this.origin().elementRef.nativeElement.contains(event.target as Node)) {
      this.settle();
    }
  }

  /** Closing without choosing: an exact match is taken, emptying clears, anything else reverts. */
  private settle(): void {
    if (this.freeText()) {
      this.close();
      return;
    }
    const typed = this.text().trim();
    if (!typed) {
      if (this.clearable() && this.value()) this.apply({ value: '', created: false, label: '' });
    } else if (typed !== this.selectedLabel()) {
      const exact = this.options().find((o) => !o.invalid && fold(o.label) === fold(typed));
      if (exact) this.apply({ value: exact.value, created: false, label: exact.label });
      else if (this.resetOnPick() && this.allowCreate() && !this.createInvalid()) this.apply({ value: typed, created: true, label: typed });
      else this.text.set(this.selectedLabel());
    }
    this.close();
  }

  protected hover(i: number): void {
    if (this.entries()[i]?.kind !== 'group') this.active.set(i);
  }

  protected onKey(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!this.open()) {
          this.openList();
          break;
        }
        const dir = event.key === 'ArrowDown' ? 1 : -1;
        this.active.set(this.firstSelectable(this.active() + dir, dir, true));
        break;
      }
      case 'Enter': {
        if (!this.open()) break;
        const entry = this.entries()[this.active()];
        if (!entry && this.freeText()) break; // nothing picked: Enter submits the form as usual
        event.preventDefault();
        if (entry && entry.kind !== 'group') this.choose(entry);
        break;
      }
      case 'Escape':
        if (this.open()) {
          event.preventDefault();
          event.stopPropagation();
          if (!this.freeText()) this.text.set(this.selectedLabel());
          this.close();
        }
        break;
      case 'Tab':
        if (this.open()) this.settle();
        break;
    }
  }

  protected choose(e: Entry): void {
    if (e.kind === 'group' || this.isDisabled(e)) return;
    if (e.kind === 'create') this.apply({ value: this.query().trim(), created: true, label: this.query().trim() });
    else this.apply({ value: e.option.value, created: false, label: e.option.label });
    this.close();
    this.fieldEl().nativeElement.focus();
  }

  private apply(s: ComboSelection): void {
    if (this.resetOnPick()) {
      this.text.set('');
      this.selection.emit(s);
      return;
    }
    this.value.set(s.value);
    this.created.set(s.created);
    this.text.set(s.label);
    this.selection.emit(s);
  }

  private close(): void {
    this.open.set(false);
    this.query.set('');
  }

  /** The nearest selectable entry from `from`, walking in `dir`; stays put when there is none. */
  private firstSelectable(from: number, dir: 1 | -1, keepOnMiss = false): number {
    const list = this.entries();
    for (let i = from; i >= 0 && i < list.length; i += dir) {
      const e = list[i]!;
      if (e.kind !== 'group' && !this.isDisabled(e)) return i;
    }
    return keepOnMiss ? Math.min(Math.max(from - dir, 0), Math.max(list.length - 1, 0)) : 0;
  }
}
