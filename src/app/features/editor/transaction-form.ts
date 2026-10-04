import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, linkedSignal, signal, untracked } from '@angular/core';
import { form, FormField as Field, maxLength, submit, validate, type FieldTree, type ValidationError } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRightLeft, lucideExternalLink, lucideInfo } from '@ng-icons/lucide';
import {
  amountSide,
  inferTransactionType,
  isIsoDate,
  isPositiveAmount,
  todayIso,
  type AccountInput,
  type AccountSlot,
  type TxEditPayload,
  type TxWriteRequest,
} from '@shared';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { HlmSwitch } from '@spartan-ng/helm/switch';
import { HlmTextarea } from '@spartan-ng/helm/textarea';
import { WriteApi, WriteError } from '../../core/api/write-api';
import { I18n } from '../../core/i18n/i18n';
import { BackNavigation } from '../../core/nav/back-navigation';
import { EditorLookupsStore } from '../../core/state/editor-lookups.store';
import { localPref } from '../../core/state/local-pref';
import { MetaStore } from '../../core/state/meta.store';
import { PageHeader } from '../../shared/components/page-header';
import { Section } from '../../shared/components/section';
import { Select } from '../../shared/components/select';
import { AccountPicker } from '../../shared/forms/account-picker';
import { Combobox } from '../../shared/forms/combobox';
import { ConfirmService } from '../../shared/forms/confirm.service';
import { DateInput } from '../../shared/forms/date-input';
import { FormField } from '../../shared/forms/form-field';
import { FormFooter } from '../../shared/forms/form-footer';
import { MoneyInput } from '../../shared/forms/money-input';
import { TagInput } from '../../shared/forms/tag-input';
import { nowTime, parseTime, TimeInput } from '../../shared/forms/time-input';
import { TxTypeBadge } from '../../shared/forms/tx-type-badge';

/** The form's own shape: strings everywhere so every control binds directly. */
interface TxModel {
  description: string;
  source: AccountInput | null;
  destination: AccountInput | null;
  amount: string;
  /** Amount in the other currency (received amount of a cross-currency transfer, or "other currency"). */
  foreignAmount: string;
  foreignCurrency: string;
  otherCurrency: boolean;
  date: string;
  /** `HH:mm`, or empty to let the server decide (noon, or the stored time when editing an unchanged day). */
  time: string;
  category: string;
  budgetId: string;
  billId: string;
  tags: string[];
  notes: string;
}

interface AfterSave {
  /** Stay on the form after saving instead of going back. */
  stay: boolean;
  /** When staying after a creation: empty the form (today's date, default account) instead of keeping the data. */
  reset: boolean;
}

const FALLBACK = '/transactions';
const blank = (): TxModel => ({
  description: '',
  source: null,
  destination: null,
  amount: '',
  foreignAmount: '',
  foreignCurrency: '',
  otherCurrency: false,
  date: todayIso(),
  time: nowTime(),
  category: '',
  budgetId: '',
  billId: '',
  tags: [],
  notes: '',
});

const isAfterSave = (v: unknown): v is AfterSave =>
  !!v && typeof v === 'object' && typeof (v as AfterSave).stay === 'boolean' && typeof (v as AfterSave).reset === 'boolean';

/**
 * Create or edit one transaction. The user never picks a type: it follows from the two accounts and is
 * shown live. Firefly's rules and webhooks always run on save. Routes: `/transactions/new` (optionally
 * pre-filled from the query string) and `/transactions/:id/edit`.
 */
@Component({
  selector: 'sf-transaction-form',
  imports: [
    Field,
    NgIcon,
    HlmButton,
    HlmSkeleton,
    HlmSwitch,
    HlmTextarea,
    PageHeader,
    Section,
    Select,
    AccountPicker,
    Combobox,
    DateInput,
    FormField,
    FormFooter,
    MoneyInput,
    TagInput,
    TimeInput,
    TxTypeBadge,
  ],
  providers: [provideIcons({ lucideArrowRightLeft, lucideExternalLink, lucideInfo })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mx-auto flex w-full max-w-3xl flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="i18n.t(isEdit() ? 'nav.editTransaction' : 'nav.newTransaction')" [description]="i18n.t('editor.tx.description')" />

    @if (state() === 'loading') {
      <div class="flex flex-col gap-3">
        @for (i of [1, 2, 3, 4]; track i) {
          <div hlmSkeleton class="h-14 w-full"></div>
        }
      </div>
    } @else if (state() === 'notEditable') {
      <section class="flex flex-col gap-3 rounded-xl border border-status-warning/40 bg-status-warning/10 p-4 sm:p-5" role="alert">
        <h2 class="flex items-center gap-2 font-semibold"><ng-icon name="lucideInfo" aria-hidden="true" />{{ i18n.t('editor.tx.notEditable.title') }}</h2>
        <p class="text-sm">{{ i18n.t('editor.tx.notEditable.' + (blockedReason() === 'type' ? 'type' : 'splits')) }}</p>
        <div class="flex flex-wrap gap-2">
          @if (fireflyUrl(); as url) {
            <a hlmBtn size="sm" [href]="url" target="_blank" rel="noopener"><ng-icon name="lucideExternalLink" aria-hidden="true" />{{ i18n.t('editor.tx.editInFirefly') }}</a>
          }
          <button hlmBtn size="sm" variant="outline" type="button" (click)="cancel()">{{ i18n.t('editor.back') }}</button>
          <button hlmBtn size="sm" variant="destructive" type="button" (click)="remove()">{{ i18n.t('forms.delete') }}</button>
        </div>
      </section>
    } @else if (state() === 'missing' || state() === 'error') {
      <section class="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:p-5" role="alert">
        <p class="text-sm">{{ i18n.t(state() === 'missing' ? 'editor.tx.missing' : 'editor.tx.loadError') }}</p>
        <div class="flex gap-2">
          <button hlmBtn size="sm" variant="outline" type="button" (click)="cancel()">{{ i18n.t('editor.back') }}</button>
          @if (state() === 'error') {
            <button hlmBtn size="sm" type="button" (click)="reload()">{{ i18n.t('editor.retry') }}</button>
          }
        </div>
      </section>
    } @else {
      <form class="flex flex-col gap-4" novalidate (submit)="$event.preventDefault(); save()">
        <sf-section [title]="i18n.t('editor.tx.what')" [loading]="lookups.loading()">
          <div class="flex flex-col gap-4">
            <sf-form-field [label]="i18n.t('editor.tx.descriptionLabel')" [required]="true" [field]="f.description">
              <sf-combobox
                [formField]="f.description"
                [options]="descriptionOptions()"
                [freeText]="true"
                [maxVisible]="8"
                [ariaLabel]="i18n.t('editor.tx.descriptionLabel')"
                (typed)="onDescriptionTyped($event)"
              />
            </sf-form-field>

            <div class="grid items-start gap-3 md:grid-cols-[1fr_auto_1fr]">
              <sf-form-field [label]="i18n.t('editor.tx.from')" [required]="true" [field]="f.source">
                <sf-account-picker
                  [formField]="f.source"
                  [accounts]="lookups.accounts()"
                  side="source"
                  [other]="destinationSlot()"
                  [placeholder]="i18n.t('editor.tx.accountPlaceholder')"
                />
              </sf-form-field>
              <button
                hlmBtn
                type="button"
                variant="ghost"
                size="icon-sm"
                class="mt-6 hidden md:inline-flex"
                [attr.aria-label]="i18n.t('editor.tx.swap')"
                (click)="swap()"
              >
                <ng-icon name="lucideArrowRightLeft" aria-hidden="true" />
              </button>
              <sf-form-field [label]="i18n.t('editor.tx.to')" [required]="true" [field]="f.destination">
                <sf-account-picker
                  [formField]="f.destination"
                  [accounts]="lookups.accounts()"
                  side="destination"
                  [other]="sourceSlot()"
                  [placeholder]="i18n.t('editor.tx.accountPlaceholder')"
                />
              </sf-form-field>
            </div>
            <div class="-mt-2 flex items-center gap-3">
              <sf-tx-type-badge [source]="sourceSlot()" [destination]="destinationSlot()" />
              <button hlmBtn type="button" variant="ghost" size="sm" class="md:hidden" (click)="swap()">
                <ng-icon name="lucideArrowRightLeft" aria-hidden="true" />{{ i18n.t('editor.tx.swap') }}
              </button>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <sf-form-field [label]="i18n.t('editor.tx.amount')" [required]="true" [field]="f.amount">
                <sf-money-input [formField]="f.amount" [currency]="amountCurrency()" />
              </sf-form-field>
              @if (crossCurrency()) {
                <sf-form-field [label]="i18n.t('editor.tx.received', { currency: receivedCurrency() })" [required]="true" [field]="f.foreignAmount">
                  <sf-money-input [formField]="f.foreignAmount" [currency]="receivedCurrency()" />
                </sf-form-field>
              }
              <div class="flex flex-wrap items-start gap-3 sm:col-span-2">
                <sf-form-field class="min-w-0 flex-1" [label]="i18n.t('editor.tx.date')" [required]="true" [field]="f.date">
                  <sf-date-input [formField]="f.date" [ariaLabel]="i18n.t('editor.tx.date')" />
                </sf-form-field>
                <sf-form-field [label]="i18n.t('editor.tx.time')" [field]="f.time">
                  <sf-time-input [formField]="f.time" [ariaLabel]="i18n.t('editor.tx.time')" />
                </sf-form-field>
              </div>
            </div>

            @if (showOtherCurrency()) {
              <div class="flex flex-col gap-3 rounded-lg border border-border/70 p-3">
                <label class="flex items-center gap-2 text-sm">
                  <hlm-switch [formField]="f.otherCurrency" [aria-label]="i18n.t('editor.tx.otherCurrency')" />
                  <span>{{ i18n.t('editor.tx.otherCurrency') }}</span>
                </label>
                @if (model().otherCurrency) {
                  <div class="grid gap-3 sm:grid-cols-2">
                    <sf-form-field [label]="i18n.t('editor.tx.foreignCurrency')" [required]="true" [field]="f.foreignCurrency">
                      <sf-select [formField]="f.foreignCurrency" [options]="otherCurrencyOptions()" [searchable]="false" [label]="i18n.t('editor.tx.foreignCurrency')" class="w-full" />
                    </sf-form-field>
                    <sf-form-field [label]="i18n.t('editor.tx.foreignAmount')" [required]="true" [field]="f.foreignAmount">
                      <sf-money-input [formField]="f.foreignAmount" [currency]="model().foreignCurrency" />
                    </sf-form-field>
                  </div>
                }
              </div>
            }
          </div>
        </sf-section>

        <sf-section [title]="i18n.t('editor.tx.details')" [loading]="lookups.loading()">
          <div class="grid gap-4 sm:grid-cols-2">
            <sf-form-field [label]="i18n.t('common.category')" [field]="f.category">
              <sf-combobox
                [formField]="f.category"
                [options]="categoryOptions()"
                [allowCreate]="true"
                [placeholder]="i18n.t('editor.tx.categoryPlaceholder')"
                [ariaLabel]="i18n.t('common.category')"
              />
            </sf-form-field>
            @if (showBudgetBill()) {
              <sf-form-field [label]="i18n.t('common.budget')" [field]="f.budgetId">
                <sf-select [formField]="f.budgetId" [options]="budgetOptions()" [placeholder]="i18n.t('common.noBudget')" [label]="i18n.t('common.budget')" class="w-full" />
              </sf-form-field>
              <sf-form-field [label]="i18n.t('editor.tx.bill')" [field]="f.billId">
                <sf-select [formField]="f.billId" [options]="billOptions()" [placeholder]="i18n.t('editor.tx.noBill')" [label]="i18n.t('editor.tx.bill')" class="w-full" />
              </sf-form-field>
            }
            <sf-form-field class="sm:col-span-2" [label]="i18n.t('common.tag')" [field]="f.tags">
              <sf-tag-input [formField]="f.tags" [suggestions]="tagNames()" [ariaLabel]="i18n.t('common.tag')" />
            </sf-form-field>
            <sf-form-field class="sm:col-span-2" [label]="i18n.t('editor.tx.notes')" [field]="f.notes">
              <textarea hlmTextarea rows="3" [formField]="f.notes"></textarea>
            </sf-form-field>
          </div>
        </sf-section>

        @if (formErrors().length) {
          <p class="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm" role="alert">{{ formErrors().join(' ') }}</p>
        }

        <p class="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <ng-icon name="lucideInfo" aria-hidden="true" />{{ i18n.t('editor.tx.rules') }}
        </p>

        <div class="flex flex-wrap items-center gap-x-6 gap-y-2 px-1 text-sm">
          <label class="flex items-center gap-2">
            <hlm-switch [checked]="after().stay" (checkedChange)="setAfter({ stay: $event })" [aria-label]="i18n.t(isEdit() ? 'editor.tx.stayEdit' : 'editor.tx.stay')" />
            <span>{{ i18n.t(isEdit() ? 'editor.tx.stayEdit' : 'editor.tx.stay') }}</span>
          </label>
          @if (!isEdit()) {
            <label class="flex items-center gap-2" [class.opacity-50]="!after().stay">
              <hlm-switch [checked]="after().reset" [disabled]="!after().stay" (checkedChange)="setAfter({ reset: $event })" [aria-label]="i18n.t('editor.tx.reset')" />
              <span>{{ i18n.t('editor.tx.reset') }}</span>
            </label>
          }
        </div>

        <sf-form-footer
          [saving]="saving()"
          [canDelete]="isEdit()"
          (save)="save()"
          (dismissed)="cancel()"
          (remove)="remove()"
        />
      </form>
    }
  `,
})
export class TransactionForm {
  protected readonly i18n = inject(I18n);
  protected readonly lookups = inject(EditorLookupsStore);
  private readonly api = inject(WriteApi);
  private readonly meta = inject(MetaStore);
  private readonly back = inject(BackNavigation);
  private readonly confirm = inject(ConfirmService);

  /** Route param of `/transactions/:id/edit`. */
  readonly id = input<string | undefined>(undefined);
  /** Pre-fill from `/transactions/new?source=…&destination=…&date=…` (account ids or names). */
  readonly source = input<string | undefined>(undefined);
  readonly destination = input<string | undefined>(undefined);
  readonly date = input<string | undefined>(undefined);
  readonly description = input<string | undefined>(undefined);
  readonly amount = input<string | undefined>(undefined);
  readonly category = input<string | undefined>(undefined);
  readonly budget = input<string | undefined>(undefined);
  readonly bill = input<string | undefined>(undefined);

  protected readonly isEdit = computed(() => !!this.id());
  protected readonly state = signal<'loading' | 'ready' | 'notEditable' | 'missing' | 'error'>('ready');
  protected readonly blockedReason = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly after = localPref<AfterSave>('spacefly.tx.afterSave', { stay: false, reset: true }, isAfterSave);

  protected readonly model = signal<TxModel>(blank());
  protected readonly f = form(this.model, (p) => {
    validate(p.description, (c) => (c.value().trim() ? undefined : { kind: 'required' }));
    maxLength(p.description, 1000);
    maxLength(p.notes, 65000);
    validate(p.source, (c) => (c.value() ? undefined : { kind: 'required' }));
    validate(p.destination, (c) => {
      if (!c.value()) return { kind: 'required' };
      return this.sourceSlot() && this.type() === null ? { kind: 'combination' } : undefined;
    });
    validate(p.amount, (c) => (!c.value().trim() ? { kind: 'required' } : isPositiveAmount(c.value()) ? undefined : { kind: 'positive' }));
    validate(p.foreignAmount, (c) => {
      if (!this.foreignRequired()) return undefined;
      return !c.value().trim() ? { kind: 'foreign' } : isPositiveAmount(c.value()) ? undefined : { kind: 'positive' };
    });
    validate(p.foreignCurrency, (c) => (this.foreignRequired() && !this.crossCurrency() && !c.value() ? { kind: 'required' } : undefined));
    validate(p.date, (c) => (isIsoDate(c.value()) ? undefined : { kind: 'date' }));
    validate(p.time, (c) => (!c.value().trim() || parseTime(c.value()) ? undefined : { kind: 'time' }));
  });

  // ── What the chosen accounts mean ───────────────────────────────────────────
  private readonly accountById = computed(() => new Map(this.lookups.accounts().map((a) => [a.id, a])));
  private slotOf(v: AccountInput | null): AccountSlot {
    if (!v) return null;
    if ('name' in v) return 'new';
    return this.accountById().get(v.id)?.kind ?? null;
  }
  protected readonly sourceSlot = computed(() => this.slotOf(this.model().source));
  protected readonly destinationSlot = computed(() => this.slotOf(this.model().destination));
  private readonly sourceAccount = computed(() => {
    const s = this.model().source;
    return s && 'id' in s ? this.accountById().get(s.id) : undefined;
  });
  private readonly destinationAccount = computed(() => {
    const d = this.model().destination;
    return d && 'id' in d ? this.accountById().get(d.id) : undefined;
  });
  protected readonly type = computed(() => inferTransactionType(this.sourceSlot(), this.destinationSlot()));
  /** The amount is in the currency of the account on the amount side; the source's while the type is unknown. */
  protected readonly amountCurrency = computed(() => {
    const type = this.type();
    const account = type && amountSide(type) === 'destination' ? this.destinationAccount() : this.sourceAccount();
    return account?.currency ?? this.sourceAccount()?.currency ?? this.meta.primary();
  });
  protected readonly receivedCurrency = computed(() => this.destinationAccount()?.currency ?? '');
  protected readonly crossCurrency = computed(
    () => this.type() === 'transfer' && !!this.sourceAccount() && !!this.destinationAccount() && this.sourceAccount()!.currency !== this.destinationAccount()!.currency,
  );
  protected readonly showOtherCurrency = computed(() => this.type() === 'withdrawal' || this.type() === 'deposit');
  protected readonly showBudgetBill = computed(() => this.type() === 'withdrawal');
  private readonly foreignRequired = computed(() => this.crossCurrency() || (this.showOtherCurrency() && this.model().otherCurrency));

  // ── Option lists ────────────────────────────────────────────────────────────
  protected readonly categoryOptions = computed(() => this.lookups.categories().map((c) => ({ value: c.name, label: c.name })));
  protected readonly budgetOptions = computed(() => this.lookups.budgets().map((b) => ({ value: b.id, label: b.name })));
  protected readonly billOptions = computed(() =>
    this.lookups
      .bills()
      .filter((b) => b.active || b.id === this.model().billId)
      .map((b) => ({ value: b.id, label: b.name })),
  );
  protected readonly tagNames = computed(() => this.lookups.tags().map((t) => t.name));
  protected readonly otherCurrencyOptions = computed(() =>
    this.lookups
      .currencies()
      .filter((c) => c.code !== this.amountCurrency())
      .map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` })),
  );

  // ── Description suggestions: what was used before, as you type ──────────────
  private readonly descriptionTerm = signal('');
  private descriptionTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly suggestionsRes = httpResource<string[]>(() =>
    this.descriptionTerm() ? { url: '/api/lookups/descriptions', params: { q: this.descriptionTerm() } } : undefined,
  );
  /** The previous suggestions stay on screen while the next ones load, so the list doesn't flicker shut. */
  private readonly lastSuggestions = linkedSignal<string[] | undefined, string[]>({
    source: () => (this.suggestionsRes.hasValue() ? this.suggestionsRes.value() : undefined),
    computation: (value, previous) => value ?? previous?.value ?? [],
  });
  protected readonly descriptionOptions = computed(() => (this.descriptionTerm() ? this.lastSuggestions() : []).map((d) => ({ value: d, label: d })));

  protected onDescriptionTyped(text: string): void {
    clearTimeout(this.descriptionTimer);
    const term = text.trim();
    if (!term) this.descriptionTerm.set('');
    else this.descriptionTimer = setTimeout(() => this.descriptionTerm.set(term), 200);
  }

  protected readonly formErrors = computed(() => this.f().errors().map((e) => e.message ?? ''));
  protected readonly fireflyUrl = computed(() => (this.id() ? this.meta.fireflyUrl(`/transactions/show/${this.id()}`) : null));

  private initialized = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.descriptionTimer));
    // Edit mode: load the transaction whenever the route's id changes.
    effect(() => {
      const id = this.id();
      untracked(() => {
        if (id) void this.load(id);
        else this.state.set('ready');
      });
    });
    // Create mode: fill in the defaults once the account list is known.
    effect(() => {
      if (this.id() || this.initialized || !this.lookups.lookups()) return;
      untracked(() => {
        this.initialized = true;
        this.model.set(this.withDefaults(blank()));
      });
    });
  }

  /** Today's date, the default account and whatever the query string asked for. */
  private withDefaults(m: TxModel, useQuery = true): TxModel {
    const asAccount = (v: string | undefined): AccountInput | null => (!v ? null : this.accountById().has(v) ? { id: v } : { name: v });
    const defaultId = this.lookups.defaultAccountId();
    const q = useQuery ? this.queryValues() : null;
    return {
      ...m,
      source: asAccount(q?.source) ?? (defaultId ? { id: defaultId } : null),
      destination: asAccount(q?.destination),
      date: q?.date && isIsoDate(q.date) ? q.date : todayIso(),
      time: nowTime(),
      description: q?.description ?? m.description,
      amount: q?.amount && isPositiveAmount(q.amount) ? q.amount : m.amount,
      category: q?.category ?? m.category,
      budgetId: q?.budget ?? m.budgetId,
      billId: q?.bill ?? m.billId,
    };
  }

  private queryValues() {
    return {
      source: this.source(),
      destination: this.destination(),
      date: this.date(),
      description: this.description(),
      amount: this.amount(),
      category: this.category(),
      budget: this.budget(),
      bill: this.bill(),
    };
  }

  // ── Loading (edit) ──────────────────────────────────────────────────────────
  private async load(id: string): Promise<void> {
    this.state.set('loading');
    try {
      const tx = await this.api.getTransaction(id);
      this.model.set(this.fromPayload(tx));
      this.f().reset();
      this.state.set('ready');
    } catch (err) {
      if (err instanceof WriteError && err.kind === 'not_editable') {
        this.blockedReason.set(err.reason);
        this.state.set('notEditable');
      } else {
        this.state.set(err instanceof WriteError && err.kind === 'not_found' ? 'missing' : 'error');
      }
    }
  }

  protected reload(): void {
    const id = this.id();
    if (id) void this.load(id);
  }

  private fromPayload(tx: TxEditPayload): TxModel {
    const hasForeign = tx.type !== 'transfer' && !!tx.foreignAmount;
    return {
      description: tx.description,
      source: { id: tx.source.id },
      destination: { id: tx.destination.id },
      amount: tx.amount,
      foreignAmount: tx.foreignAmount ?? '',
      foreignCurrency: tx.foreignCurrency ?? '',
      otherCurrency: hasForeign,
      date: tx.date,
      time: tx.time ?? '',
      category: tx.category ?? '',
      budgetId: tx.budgetId ?? '',
      billId: tx.billId ?? '',
      tags: tx.tags,
      notes: tx.notes ?? '',
    };
  }

  // ── Actions ─────────────────────────────────────────────────────────────────
  protected swap(): void {
    this.model.update((m) => ({ ...m, source: m.destination, destination: m.source }));
  }

  protected setAfter(patch: Partial<AfterSave>): void {
    this.after.update((a) => ({ ...a, ...patch }));
  }

  protected cancel(): void {
    this.back.back(FALLBACK);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    await submit(this.f, {
      action: () => this.persist(),
      onInvalid: (root) => root().errorSummary()[0]?.fieldTree().focusBoundControl(),
    });
  }

  private request(): TxWriteRequest {
    const m = this.model();
    const type = this.type();
    const foreign = this.crossCurrency()
      ? { amount: m.foreignAmount, currency: this.receivedCurrency() }
      : this.showOtherCurrency() && m.otherCurrency
        ? { amount: m.foreignAmount, currency: m.foreignCurrency }
        : null;
    return {
      description: m.description.trim(),
      date: m.date,
      time: parseTime(m.time),
      source: m.source!,
      destination: m.destination!,
      amount: m.amount,
      foreignAmount: foreign?.amount ?? null,
      foreignCurrency: foreign?.currency ?? null,
      category: m.category.trim() || null,
      budgetId: type === 'withdrawal' ? m.budgetId || null : null,
      billId: type === 'withdrawal' ? m.billId || null : null,
      tags: m.tags,
      notes: m.notes.trim() || null,
    };
  }

  /** Sends the transaction and then does what "after saving" asks for. Returns server-side field errors, if any. */
  private async persist(): Promise<ValidationError.WithOptionalFieldTree[] | undefined> {
    this.saving.set(true);
    try {
      const id = this.id();
      if (id) await this.api.updateTransaction(id, this.request());
      else await this.api.createTransaction(this.request());
      toast.success(this.i18n.t(id ? 'editor.tx.updated' : 'editor.tx.created'));
      await this.afterSave();
      return undefined;
    } catch (err) {
      if (err instanceof WriteError) {
        if (err.kind === 'validation') return this.serverErrors(err);
        if (err.kind === 'not_editable') {
          this.blockedReason.set(err.reason);
          this.state.set('notEditable');
          return undefined;
        }
        toast.error(this.i18n.t(err.kind === 'network' ? 'editor.networkError' : 'errors.generic'));
        return undefined;
      }
      toast.error(this.i18n.t('errors.generic'));
      return undefined;
    } finally {
      this.saving.set(false);
    }
  }

  private async afterSave(): Promise<void> {
    const { stay, reset } = this.after();
    if (!stay) {
      this.back.back(FALLBACK);
    } else if (this.id()) {
      // Rules may have changed fields: show what Firefly actually stored.
      await this.load(this.id()!);
    } else if (reset) {
      this.model.set(this.withDefaults(blank(), false));
      this.f().reset();
      this.f.description().focusBoundControl();
    } else {
      this.f().reset();
    }
  }

  private serverErrors(err: WriteError): ValidationError.WithOptionalFieldTree[] {
    const targets: Record<string, FieldTree<unknown>> = {
      description: this.f.description,
      source: this.f.source,
      destination: this.f.destination,
      amount: this.f.amount,
      foreignAmount: this.f.foreignAmount,
      foreignCurrency: this.f.foreignCurrency,
      date: this.f.date,
      time: this.f.time,
      category: this.f.category,
      budgetId: this.f.budgetId,
      billId: this.f.billId,
      tags: this.f.tags,
      notes: this.f.notes,
    };
    return Object.entries(err.fields).flatMap(([key, messages]) =>
      messages.map((message) => ({ kind: 'server', message, fieldTree: targets[key] ?? this.f })),
    );
  }

  protected async remove(): Promise<void> {
    const id = this.id();
    if (!id) return;
    const name = this.model().description || this.i18n.t('nav.explorer');
    const ok = await this.confirm.confirm({
      title: this.i18n.t('editor.tx.deleteTitle'),
      message: this.i18n.t('editor.tx.deleteMessage', { name }),
      confirmLabel: this.i18n.t('forms.delete'),
      destructive: true,
    });
    if (!ok) return;
    this.saving.set(true);
    try {
      await this.api.deleteTransaction(id);
      toast.success(this.i18n.t('editor.tx.deleted'));
      this.back.back(FALLBACK);
    } catch {
      toast.error(this.i18n.t('errors.generic'));
    } finally {
      this.saving.set(false);
    }
  }
}
