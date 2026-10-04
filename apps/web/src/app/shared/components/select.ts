import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, input, model, output, signal, viewChild } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideChevronDown, lucideSearch } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmPopoverImports } from '@spartan-ng/helm/popover';
import { fold } from '@spacefly/client/ui-logic/fold';

export interface SelectOption {
  value: string;
  label: string;
}

let nextId = 0;

/**
 * Select with a search box (combobox + listbox). Typing filters the options (accent- and case-insensitive,
 * every word must match); ↑ ↓ Home End move, Enter picks, Esc closes. With a `placeholder`, the first
 * entry clears the selection ("All categories"). Also a form control: `[formField]` binds `value`,
 * `disabled`, `invalid` and `touched`.
 */
@Component({
  selector: 'sf-select',
  imports: [NgIcon, TranslocoPipe, HlmInput, HlmPopoverImports],
  providers: [provideIcons({ lucideChevronDown, lucideSearch, lucideCheck })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative inline-flex' },
  template: `
    <hlm-popover class="block w-full" align="start" sideOffset="4" [state]="open() ? 'open' : 'closed'" (stateChanged)="onState($event === 'open')">
      <button
        #trigger
        hlmPopoverTrigger
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        class="flex h-8 w-full items-center rounded-md border border-input bg-background/40 pl-2.5 pr-8 text-left text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        [class.border-destructive]="invalid()"
        [disabled]="disabled()"
        [attr.aria-invalid]="invalid() || null"
        [attr.aria-label]="label() || null"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="open() ? listId : null"
        (keydown)="onTriggerKey($event)"
      >
        <span class="truncate" [class.text-muted-foreground]="!hasSelection()">{{ selectedLabel() }}</span>
      </button>
      <ng-icon name="lucideChevronDown" class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <hlm-popover-content *hlmPopoverPortal="let ctx" class="w-64 gap-1 p-1.5">
        @if (searchable()) {
          <div class="relative">
            <ng-icon name="lucideSearch" class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              hlmInput
              type="text"
              role="combobox"
              autocomplete="off"
              class="h-8 pl-8 text-sm"
              [attr.aria-label]="'common.search' | transloco"
              [attr.aria-controls]="listId"
              [attr.aria-expanded]="true"
              [attr.aria-activedescendant]="activeId()"
              [placeholder]="'common.search' | transloco"
              [value]="query()"
              (input)="onQuery($any($event.target).value)"
              (keydown)="onKey($event)"
            />
          </div>
        }
        <ul
          role="listbox"
          class="max-h-60 overflow-y-auto outline-none"
          [id]="listId"
          [attr.aria-label]="label() || null"
          [attr.tabindex]="searchable() ? null : 0"
          [attr.aria-activedescendant]="searchable() ? null : activeId()"
          (keydown)="onKey($event)"
        >
          @for (o of entries(); track o.value; let i = $index) {
            <!-- Listbox pattern: focus stays on the search box / listbox (aria-activedescendant) and the keys are handled there. -->
            <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
            <li
              role="option"
              class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm"
              [id]="optionId(i)"
              [class.bg-muted]="i === active()"
              [attr.aria-selected]="o.value === value()"
              (click)="choose(o.value)"
              (mousemove)="active.set(i)"
            >
              <span class="flex-1 truncate" [class.text-muted-foreground]="o.value === ''">{{ o.label }}</span>
              @if (o.value === value()) {
                <ng-icon name="lucideCheck" class="text-primary" />
              }
            </li>
          } @empty {
            <li class="px-2 py-3 text-center text-xs text-muted-foreground">{{ 'common.noResults' | transloco }}</li>
          }
        </ul>
      </hlm-popover-content>
    </hlm-popover>
  `,
})
export class Select {
  readonly options = input.required<SelectOption[]>();
  readonly value = model<string>('');
  readonly placeholder = input<string | null>(null);
  readonly label = input('');
  /** Show the search box. Turn off for short fixed lists. */
  readonly searchable = input(true);
  /** Form-control contract (see `FormValueControl`): the state a bound field pushes in. */
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly touched = input(false);
  /** Emits when the list closes, so a bound field becomes touched. */
  readonly touch = output<void>();

  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly uid = nextId++;
  protected readonly listId = `sf-select-list-${this.uid}`;
  protected readonly open = signal(false);
  protected readonly query = signal('');
  protected readonly active = signal(0);

  protected readonly hasSelection = computed(() => this.options().some((o) => o.value === this.value()));
  protected readonly selectedLabel = computed(() => this.options().find((o) => o.value === this.value())?.label ?? this.placeholder() ?? '');

  /** Matching options, preceded by the "clear" entry while the search box is empty. */
  protected readonly entries = computed<SelectOption[]>(() => {
    const words = fold(this.query()).split(/\s+/).filter(Boolean);
    const matches = this.options().filter((o) => {
      const label = fold(o.label);
      return words.every((w) => label.includes(w));
    });
    const clear = this.placeholder() && words.length === 0 ? [{ value: '', label: this.placeholder()! }] : [];
    return [...clear, ...matches];
  });

  protected readonly activeId = computed(() => (this.entries().length ? this.optionId(this.active()) : null));

  constructor() {
    // Keep the highlighted option visible while moving with the keyboard.
    effect(() => {
      const id = this.activeId();
      if (this.open() && id) queueMicrotask(() => document.getElementById(id)?.scrollIntoView?.({ block: 'nearest' }));
    });
  }

  protected optionId(i: number): string {
    return `sf-select-${this.uid}-opt-${i}`;
  }

  protected onState(open: boolean): void {
    const wasOpen = this.open();
    this.open.set(open);
    if (wasOpen && !open) this.touch.emit();
    if (open) {
      this.query.set('');
      this.active.set(Math.max(0, this.entries().findIndex((o) => o.value === this.value())));
    }
  }

  protected onQuery(value: string): void {
    this.query.set(value);
    this.active.set(0);
  }

  protected onTriggerKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.open.set(true);
      this.onState(true);
    }
  }

  protected onKey(event: KeyboardEvent): void {
    const last = this.entries().length - 1;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.active.set(Math.min(this.active() + 1, last));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.active.set(Math.max(this.active() - 1, 0));
        break;
      case 'Home':
      case 'End':
        // In the search box Home/End move the caret.
        if (!this.searchable()) {
          event.preventDefault();
          this.active.set(event.key === 'Home' ? 0 : Math.max(last, 0));
        }
        break;
      case 'Enter': {
        event.preventDefault();
        const entry = this.entries()[this.active()];
        if (entry) this.choose(entry.value);
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
    }
  }

  protected choose(value: string): void {
    this.value.set(value);
    this.close();
  }

  private close(): void {
    this.open.set(false);
    this.touch.emit();
    this.trigger()?.nativeElement.focus();
  }
}
