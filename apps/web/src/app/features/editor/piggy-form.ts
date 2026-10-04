import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { applyEach, form, FormField as Field, maxLength, validate } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMinus, lucidePlus, lucideX } from '@ng-icons/lucide';
import { isIsoDate, isPositiveAmount, parseAmount, type PiggyEditPayload, type PiggyWrite } from '@shared';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { HlmTextarea } from '@spartan-ng/helm/textarea';
import { EditorLookupsStore } from '../../core/state/editor-lookups.store';
import { MetaStore } from '../../core/state/meta.store';
import { Select } from '../../shared/components/select';
import { DateInput } from '../../shared/forms/date-input';
import { FormField } from '../../shared/forms/form-field';
import { FormFooter } from '../../shared/forms/form-footer';
import { MoneyInput } from '../../shared/forms/money-input';
import { EntityForm } from './entity-form';

interface Row {
  accountId: string;
  /** Money set aside in this goal from that account. */
  currentAmount: string;
  /** Scratch amount for "add / remove". */
  adjust: string;
}

interface Model {
  name: string;
  currency: string;
  targetAmount: string;
  startDate: string;
  targetDate: string;
  group: string;
  notes: string;
  accounts: Row[];
}

const cents = (amount: string): number => Math.round(Number(amount) * 100);

/**
 * Create or edit a goal (piggy bank): name, currency, target, dates and the accounts it saves from,
 * each with its amount. "Add / remove" moves the saved amount of one account up or down; saving always
 * sends the complete list, because Firefly replaces the goal's accounts with it.
 */
@Component({
  selector: 'sf-piggy-form',
  imports: [Field, NgIcon, HlmButton, HlmInput, HlmSkeleton, HlmTextarea, Select, DateInput, FormField, FormFooter, MoneyInput],
  providers: [provideIcons({ lucideMinus, lucidePlus, lucideX })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (state() === 'loading') {
      <div hlmSkeleton class="h-32 w-full"></div>
    } @else if (state() !== 'ready') {
      <p class="text-sm" role="alert">{{ i18n.t(state() === 'missing' ? 'editor.missing' : 'editor.loadError') }}</p>
      <div class="mt-3 flex gap-2">
        <button hlmBtn size="sm" variant="outline" type="button" (click)="cancel()">{{ i18n.t('editor.back') }}</button>
        @if (state() === 'error') {
          <button hlmBtn size="sm" type="button" (click)="reload()">{{ i18n.t('editor.retry') }}</button>
        }
      </div>
    } @else {
      <form class="flex flex-col gap-4" novalidate (submit)="$event.preventDefault(); save()">
        <sf-form-field [label]="i18n.t('editor.fields.name')" [required]="true" [field]="f.name">
          <input hlmInput type="text" class="h-9" autocomplete="off" [formField]="f.name" />
        </sf-form-field>

        <div class="grid gap-3 sm:grid-cols-2">
          <sf-form-field [label]="i18n.t('editor.fields.currency')" [field]="f.currency">
            <sf-select [formField]="f.currency" [options]="currencyOptions()" [searchable]="false" [label]="i18n.t('editor.fields.currency')" class="w-full" />
          </sf-form-field>
          <sf-form-field [label]="i18n.t('editor.entity.piggy.target')" [field]="f.targetAmount">
            <sf-money-input [formField]="f.targetAmount" [currency]="model().currency" />
          </sf-form-field>
          <sf-form-field [label]="i18n.t('editor.entity.piggy.startDate')" [field]="f.startDate">
            <div class="flex items-center gap-2">
              <sf-date-input [formField]="f.startDate" />
              @if (model().startDate) {
                <button hlmBtn type="button" variant="ghost" size="sm" (click)="f.startDate().value.set('')">{{ i18n.t('editor.clear') }}</button>
              }
            </div>
          </sf-form-field>
          <sf-form-field [label]="i18n.t('editor.entity.piggy.targetDate')" [field]="f.targetDate">
            <div class="flex items-center gap-2">
              <sf-date-input [formField]="f.targetDate" />
              @if (model().targetDate) {
                <button hlmBtn type="button" variant="ghost" size="sm" (click)="f.targetDate().value.set('')">{{ i18n.t('editor.clear') }}</button>
              }
            </div>
          </sf-form-field>
        </div>

        <fieldset class="flex flex-col gap-3 rounded-lg border border-border/70 p-3">
          <legend class="px-1 text-xs text-muted-foreground">{{ i18n.t('editor.entity.piggy.accounts') }}</legend>
          <p class="text-xs text-muted-foreground">{{ i18n.t('editor.entity.piggy.adjustHint') }}</p>
          @for (row of f.accounts; track row().keyInParent(); let i = $index) {
            <div class="flex flex-col gap-2 rounded-md border border-border/60 p-2" role="group" [attr.aria-label]="accountName(model().accounts[i]?.accountId)">
              <div class="flex items-center gap-2">
                <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ accountName(model().accounts[i]?.accountId) }}</span>
                <button hlmBtn type="button" variant="ghost" size="icon-sm" [attr.aria-label]="i18n.t('editor.entity.piggy.remove', { name: accountName(model().accounts[i]?.accountId) })" (click)="removeAccount(i)">
                  <ng-icon name="lucideX" aria-hidden="true" />
                </button>
              </div>
              <sf-form-field [label]="i18n.t('editor.entity.piggy.saved')" [field]="row.currentAmount">
                <sf-money-input [formField]="row.currentAmount" [currency]="model().currency" />
              </sf-form-field>
              <div class="flex items-end gap-2">
                <sf-form-field class="flex-1" [label]="i18n.t('editor.entity.piggy.adjustLabel')">
                  <sf-money-input [formField]="row.adjust" [currency]="model().currency" />
                </sf-form-field>
                <button hlmBtn type="button" variant="outline" size="sm" [disabled]="!canAdjust(i)" (click)="adjust(i, 1)">
                  <ng-icon name="lucidePlus" aria-hidden="true" />{{ i18n.t('editor.entity.piggy.add') }}
                </button>
                <button hlmBtn type="button" variant="outline" size="sm" [disabled]="!canAdjust(i)" (click)="adjust(i, -1)">
                  <ng-icon name="lucideMinus" aria-hidden="true" />{{ i18n.t('editor.entity.piggy.subtract') }}
                </button>
              </div>
            </div>
          }
          <sf-form-field [field]="f.accounts">
            <sf-select
              [value]="''"
              (valueChange)="addAccount($event)"
              [options]="accountOptions()"
              [placeholder]="i18n.t('editor.entity.piggy.addAccount')"
              [label]="i18n.t('editor.entity.piggy.addAccount')"
              class="w-full"
            />
          </sf-form-field>
        </fieldset>

        <sf-form-field [label]="i18n.t('editor.fields.group')" [field]="f.group">
          <input hlmInput type="text" class="h-9" autocomplete="off" [formField]="f.group" />
        </sf-form-field>
        <sf-form-field [label]="i18n.t('editor.fields.notes')" [field]="f.notes">
          <textarea hlmTextarea rows="3" [formField]="f.notes"></textarea>
        </sf-form-field>

        <sf-form-footer inset="sheet" [saving]="saving()" [canDelete]="isEdit()" (save)="save()" (dismissed)="cancel()" (remove)="remove()" />
      </form>
    }
  `,
})
export class PiggyForm extends EntityForm<Model, PiggyEditPayload> {
  private readonly lookups = inject(EditorLookupsStore);
  private readonly meta = inject(MetaStore);

  protected readonly kind = 'piggy';
  protected readonly path = 'piggy-banks';
  protected readonly model = signal<Model>(this.blank());
  protected readonly f = form(this.model, (p) => {
    validate(p.name, (c) => (c.value().trim() ? undefined : { kind: 'required' }));
    maxLength(p.name, 255);
    maxLength(p.group, 255);
    maxLength(p.notes, 65000);
    validate(p.targetAmount, (c) => (!c.value().trim() || isPositiveAmount(c.value()) ? undefined : { kind: 'positive' }));
    validate(p.startDate, (c) => (!c.value() || isIsoDate(c.value()) ? undefined : { kind: 'date' }));
    validate(p.targetDate, (c) => {
      if (!c.value()) return undefined;
      if (!isIsoDate(c.value())) return { kind: 'date' };
      return this.model().startDate && c.value() < this.model().startDate ? { kind: 'endDate' } : undefined;
    });
    validate(p.accounts, (c) => (c.value().length ? undefined : { kind: 'accounts' }));
    applyEach(p.accounts, (row) => {
      validate(row.currentAmount, (c) => (/^\d+(\.\d+)?$/.test(c.value().trim()) ? undefined : { kind: 'amount' }));
    });
  });

  protected readonly currencyOptions = computed(() => this.lookups.currencies().map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` })));
  /** Asset accounts not in the goal yet; once the goal has one, only those in its currency. */
  protected readonly accountOptions = computed(() => {
    const m = this.model();
    const taken = new Set(m.accounts.map((a) => a.accountId));
    return this.lookups
      .accounts()
      .filter((a) => a.kind === 'asset' && !taken.has(a.id) && (m.accounts.length === 0 || a.currency === m.currency))
      .map((a) => ({ value: a.id, label: `${a.name} · ${a.currency}` }));
  });

  protected blank(): Model {
    return { name: '', currency: this.meta.primary(), targetAmount: '', startDate: '', targetDate: '', group: '', notes: '', accounts: [] };
  }

  protected toModel(p: PiggyEditPayload): Model {
    return {
      name: p.name,
      currency: p.currency,
      targetAmount: p.targetAmount ?? '',
      startDate: p.startDate ?? '',
      targetDate: p.targetDate ?? '',
      group: p.group ?? '',
      notes: p.notes ?? '',
      accounts: p.accounts.map((a) => ({ accountId: a.accountId, currentAmount: a.currentAmount, adjust: '' })),
    };
  }

  /** The complete list of accounts, always: Firefly drops the ones that aren't sent. */
  protected toRequest(): PiggyWrite {
    const m = this.model();
    return {
      name: m.name.trim(),
      currency: m.currency,
      targetAmount: m.targetAmount.trim() || null,
      startDate: m.startDate || null,
      targetDate: m.targetDate || null,
      group: m.group.trim() || null,
      notes: m.notes.trim() || null,
      accounts: m.accounts.map((a) => ({ accountId: a.accountId, currentAmount: a.currentAmount.trim() })),
    };
  }

  protected displayName(): string {
    return this.model().name;
  }

  protected accountName(id: string | undefined): string {
    return this.lookups.accounts().find((a) => a.id === id)?.name ?? id ?? '';
  }

  protected addAccount(id: string): void {
    if (!id) return;
    const account = this.lookups.accounts().find((a) => a.id === id);
    this.model.update((m) => ({
      ...m,
      // The first account decides the currency of the goal.
      currency: m.accounts.length === 0 && account ? account.currency : m.currency,
      accounts: [...m.accounts, { accountId: id, currentAmount: '0', adjust: '' }],
    }));
  }

  protected removeAccount(index: number): void {
    this.model.update((m) => ({ ...m, accounts: m.accounts.filter((_, i) => i !== index) }));
  }

  protected canAdjust(index: number): boolean {
    const raw = this.model().accounts[index]?.adjust ?? '';
    return isPositiveAmount(parseAmount(raw) ?? raw);
  }

  /** Adds to or removes from what one account has set aside (never below zero). */
  protected adjust(index: number, sign: 1 | -1): void {
    this.model.update((m) => ({
      ...m,
      accounts: m.accounts.map((row, i) => {
        if (i !== index || !this.canAdjust(i)) return row;
        const delta = cents(parseAmount(row.adjust) ?? row.adjust);
        const next = Math.max(0, cents(row.currentAmount) + sign * delta);
        return { ...row, currentAmount: (next / 100).toFixed(2), adjust: '' };
      }),
    }));
  }
}
