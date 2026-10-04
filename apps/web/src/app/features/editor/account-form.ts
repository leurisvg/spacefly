import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { disabled, form, FormField as Field, max, maxLength, min, validate } from '@angular/forms/signals';
import {
  daysInMonth,
  isIsoDate,
  todayIso,
  type AccountEditPayload,
  type AccountWrite,
  type AccountWriteType,
  type InterestPeriod,
  type LiabilityDirection,
  type LiabilityType,
} from '@spacefly/shared';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { HlmSwitch } from '@spartan-ng/helm/switch';
import { HlmTextarea } from '@spartan-ng/helm/textarea';
import { EditorLookupsStore } from '../../core/state/editor-lookups.store';
import { MetaStore } from '../../core/state/meta.store';
import { Select } from '../../shared/components/select';
import { DateInput } from '../../shared/forms/date-input';
import { FormField } from '../../shared/forms/form-field';
import { FormFooter } from '../../shared/forms/form-footer';
import { MoneyInput } from '../../shared/forms/money-input';
import { EntityForm } from './entity-form';

interface Model {
  type: AccountWriteType;
  name: string;
  active: boolean;
  iban: string;
  notes: string;
  currency: string;
  includeNetWorth: boolean;
  role: string;
  cardType: string;
  paymentDay: number;
  openingBalance: string;
  openingBalanceDate: string;
  liabilityType: LiabilityType;
  liabilityDirection: LiabilityDirection;
  interest: string;
  interestPeriod: InterestPeriod;
}

const TYPES: AccountWriteType[] = ['asset', 'liability', 'expense', 'revenue'];
const ROLES = ['defaultAsset', 'sharedAsset', 'savingAsset', 'ccAsset', 'cashWalletAsset'];
const SIGNED = /^-?\d+(\.\d+)?$/;

/** A card's payment day as a date this month (Firefly stores a date and only uses its day). */
function paymentDate(day: number): string {
  const month = todayIso().slice(0, 7);
  const clamped = Math.min(Math.max(Math.trunc(day) || 1, 1), daysInMonth(`${month}-01`));
  return `${month}-${String(clamped).padStart(2, '0')}`;
}

/**
 * Create or edit an account of any kind. The kind is chosen when creating and then fixed; the fields
 * shown follow it (role and opening balance for assets, interest and debt for liabilities…).
 * Deleting asks to type the account's name and says how many transactions go with it.
 */
@Component({
  selector: 'sf-account-form',
  imports: [Field, HlmButton, HlmInput, HlmSkeleton, HlmSwitch, HlmTextarea, Select, DateInput, FormField, FormFooter, MoneyInput],
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
        <sf-form-field [label]="i18n.t('editor.entity.account.type')" [hint]="isEdit() ? i18n.t('editor.entity.account.typeLocked') : ''" [field]="f.type">
          <sf-select [formField]="f.type" [options]="typeOptions()" [searchable]="false" [label]="i18n.t('editor.entity.account.type')" class="w-full" />
        </sf-form-field>
        <sf-form-field [label]="i18n.t('editor.fields.name')" [required]="true" [field]="f.name">
          <input hlmInput type="text" class="h-9" autocomplete="off" [formField]="f.name" />
        </sf-form-field>

        @if (isAsset()) {
          <sf-form-field [label]="i18n.t('editor.entity.account.role')" [required]="true" [field]="f.role">
            <sf-select [formField]="f.role" [options]="roleOptions()" [searchable]="false" [label]="i18n.t('editor.entity.account.role')" class="w-full" />
          </sf-form-field>
          @if (model().role === 'ccAsset') {
            <div class="grid gap-3 sm:grid-cols-2">
              <sf-form-field [label]="i18n.t('editor.entity.account.cardType')" [field]="f.cardType">
                <sf-select [formField]="f.cardType" [options]="cardOptions()" [searchable]="false" [label]="i18n.t('editor.entity.account.cardType')" class="w-full" />
              </sf-form-field>
              <sf-form-field [label]="i18n.t('editor.entity.account.paymentDay')" [required]="true" [field]="f.paymentDay">
                <input hlmInput type="number" class="h-9" inputmode="numeric" [formField]="f.paymentDay" />
              </sf-form-field>
            </div>
          }
        }

        @if (isLiability()) {
          <div class="grid gap-3 sm:grid-cols-2">
            <sf-form-field [label]="i18n.t('editor.entity.account.liabilityType')" [field]="f.liabilityType">
              <sf-select [formField]="f.liabilityType" [options]="liabilityOptions()" [searchable]="false" [label]="i18n.t('editor.entity.account.liabilityType')" class="w-full" />
            </sf-form-field>
            <sf-form-field [label]="i18n.t('editor.entity.account.direction')" [field]="f.liabilityDirection">
              <sf-select [formField]="f.liabilityDirection" [options]="directionOptions()" [searchable]="false" [label]="i18n.t('editor.entity.account.direction')" class="w-full" />
            </sf-form-field>
            <sf-form-field [label]="i18n.t('editor.entity.account.interest')" [required]="true" [field]="f.interest">
              <input hlmInput type="text" class="h-9" inputmode="decimal" autocomplete="off" [formField]="f.interest" />
            </sf-form-field>
            <sf-form-field [label]="i18n.t('editor.entity.account.interestPeriod')" [field]="f.interestPeriod">
              <sf-select [formField]="f.interestPeriod" [options]="interestPeriodOptions()" [searchable]="false" [label]="i18n.t('editor.entity.account.interestPeriod')" class="w-full" />
            </sf-form-field>
          </div>
        }

        @if (isOwned()) {
          <sf-form-field [label]="i18n.t('editor.fields.currency')" [field]="f.currency">
            <sf-select [formField]="f.currency" [options]="currencyOptions()" [searchable]="false" [label]="i18n.t('editor.fields.currency')" class="w-full" />
          </sf-form-field>
          <div class="grid gap-3 sm:grid-cols-2">
            <sf-form-field [label]="i18n.t(isLiability() ? 'editor.entity.account.owed' : 'editor.entity.account.openingBalance')" [field]="f.openingBalance">
              <sf-money-input [formField]="f.openingBalance" [currency]="model().currency" />
            </sf-form-field>
            <sf-form-field [label]="i18n.t(isLiability() ? 'editor.entity.account.startDate' : 'editor.entity.account.openingBalanceDate')" [field]="f.openingBalanceDate">
              <sf-date-input [formField]="f.openingBalanceDate" />
            </sf-form-field>
          </div>
          <label class="flex items-center gap-2 text-sm">
            <hlm-switch [formField]="f.includeNetWorth" [aria-label]="i18n.t('editor.entity.account.includeNetWorth')" />
            <span>{{ i18n.t('editor.entity.account.includeNetWorth') }}</span>
          </label>
        }

        <sf-form-field [label]="i18n.t('editor.entity.account.iban')" [field]="f.iban">
          <input hlmInput type="text" class="h-9" autocomplete="off" [formField]="f.iban" />
        </sf-form-field>
        <label class="flex items-center gap-2 text-sm">
          <hlm-switch [formField]="f.active" [aria-label]="i18n.t('editor.fields.active')" />
          <span>{{ i18n.t('editor.fields.active') }}</span>
        </label>
        <sf-form-field [label]="i18n.t('editor.fields.notes')" [field]="f.notes">
          <textarea hlmTextarea rows="3" [formField]="f.notes"></textarea>
        </sf-form-field>

        <sf-form-footer inset="sheet" [saving]="saving()" [canDelete]="isEdit()" (save)="save()" (dismissed)="cancel()" (remove)="remove()" />
      </form>
    }
  `,
})
export class AccountForm extends EntityForm<Model, AccountEditPayload> {
  private readonly lookups = inject(EditorLookupsStore);
  private readonly meta = inject(MetaStore);

  /** The kind a new account starts as. */
  readonly accountType = input<AccountWriteType>('asset');

  protected readonly kind = 'account';
  protected readonly path = 'accounts';
  private transactionCount = 0;
  protected readonly model = signal<Model>(this.blank());
  protected readonly f = form(this.model, (p) => {
    disabled(p.type, () => this.isEdit());
    validate(p.name, (c) => (c.value().trim() ? undefined : { kind: 'required' }));
    maxLength(p.name, 255);
    maxLength(p.iban, 64);
    maxLength(p.notes, 65000);
    validate(p.paymentDay, (c) => (this.model().role === 'ccAsset' && !(c.value() >= 1 && c.value() <= 31) ? { kind: 'day' } : undefined));
    min(p.paymentDay, 1);
    max(p.paymentDay, 31);
    validate(p.interest, (c) => (this.isLiability() && !/^\d+(\.\d+)?$/.test(c.value().trim()) ? { kind: 'interest' } : undefined));
    validate(p.openingBalance, (c) => (!c.value().trim() || SIGNED.test(c.value()) ? undefined : { kind: 'amount' }));
    validate(p.openingBalanceDate, (c) => {
      if (!c.value()) return this.model().openingBalance.trim() ? { kind: 'required' } : undefined;
      return isIsoDate(c.value()) ? undefined : { kind: 'date' };
    });
  });

  protected readonly isAsset = computed(() => this.model().type === 'asset');
  protected readonly isLiability = computed(() => this.model().type === 'liability');
  protected readonly isOwned = computed(() => this.isAsset() || this.isLiability());

  protected readonly typeOptions = computed(() => TYPES.map((t) => ({ value: t, label: this.i18n.t(`editor.entity.account.types.${t}`) })));
  protected readonly roleOptions = computed(() => ROLES.map((r) => ({ value: r, label: this.i18n.t(`accounts.roles.${r}`) })));
  protected readonly cardOptions = computed(() => [{ value: 'monthlyFull', label: this.i18n.t('editor.entity.account.cardTypes.monthlyFull') }]);
  protected readonly liabilityOptions = computed(() => (['loan', 'debt', 'mortgage'] as const).map((t) => ({ value: t, label: this.i18n.t(`editor.entity.account.liabilityTypes.${t}`) })));
  protected readonly directionOptions = computed(() => (['debit', 'credit'] as const).map((t) => ({ value: t, label: this.i18n.t(`editor.entity.account.directions.${t}`) })));
  protected readonly interestPeriodOptions = computed(() => (['daily', 'monthly', 'yearly'] as const).map((t) => ({ value: t, label: this.i18n.t(`editor.entity.account.interestPeriods.${t}`) })));
  protected readonly currencyOptions = computed(() => this.lookups.currencies().map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` })));

  constructor() {
    super();
    // A new account starts as the kind it was opened for.
    effect(() => {
      const type = this.accountType();
      untracked(() => {
        if (!this.id()) this.model.update((m) => ({ ...m, type }));
      });
    });
  }

  protected blank(): Model {
    return {
      type: 'asset',
      name: '',
      active: true,
      iban: '',
      notes: '',
      currency: this.meta.primary(),
      includeNetWorth: true,
      role: 'defaultAsset',
      cardType: 'monthlyFull',
      paymentDay: 1,
      openingBalance: '',
      openingBalanceDate: '',
      liabilityType: 'loan',
      liabilityDirection: 'debit',
      interest: '0',
      interestPeriod: 'monthly',
    };
  }

  protected toModel(p: AccountEditPayload): Model {
    this.transactionCount = p.transactionCount;
    return {
      type: p.type,
      name: p.name,
      active: p.active,
      iban: p.iban ?? '',
      notes: p.notes ?? '',
      currency: p.currency ?? this.meta.primary(),
      includeNetWorth: p.includeNetWorth,
      role: p.role ?? 'defaultAsset',
      cardType: p.creditCardType ?? 'monthlyFull',
      paymentDay: p.monthlyPaymentDate ? Number(p.monthlyPaymentDate.slice(8, 10)) : 1,
      openingBalance: p.openingBalance ?? '',
      openingBalanceDate: p.openingBalanceDate ?? '',
      liabilityType: p.liabilityType ?? 'loan',
      liabilityDirection: p.liabilityDirection ?? 'debit',
      interest: p.interest ?? '0',
      interestPeriod: p.interestPeriod ?? 'monthly',
    };
  }

  protected toRequest(): AccountWrite {
    const m = this.model();
    const owned = m.type === 'asset' || m.type === 'liability';
    const card = m.type === 'asset' && m.role === 'ccAsset';
    const hasBalance = owned && m.openingBalance.trim() !== '';
    return {
      type: m.type,
      name: m.name.trim(),
      active: m.active,
      iban: m.iban.trim() || null,
      notes: m.notes.trim() || null,
      currency: owned ? m.currency : null,
      includeNetWorth: m.includeNetWorth,
      role: m.type === 'asset' ? m.role : null,
      creditCardType: card ? m.cardType : null,
      monthlyPaymentDate: card ? paymentDate(m.paymentDay) : null,
      openingBalance: hasBalance ? m.openingBalance.trim() : null,
      openingBalanceDate: hasBalance ? m.openingBalanceDate : null,
      liabilityType: m.type === 'liability' ? m.liabilityType : null,
      liabilityDirection: m.type === 'liability' ? m.liabilityDirection : null,
      interest: m.type === 'liability' ? m.interest.trim() : null,
      interestPeriod: m.type === 'liability' ? m.interestPeriod : null,
    };
  }

  protected displayName(): string {
    return this.model().name;
  }

  protected override deleteWarning(): string | null {
    return this.transactionCount ? this.i18n.t('editor.entity.account.deleteWarning', { count: this.transactionCount }) : null;
  }

  protected override deleteRequireText(): string {
    return this.model().name;
  }
}
