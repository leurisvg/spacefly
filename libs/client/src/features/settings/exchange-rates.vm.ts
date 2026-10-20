import { httpResource } from '@angular/common/http';
import { computed, inject, signal } from '@angular/core';
import { isIsoDate, todayIso, type ExchangeRateRow, type ExchangeRatesResponse, type ExchangeRateWrite } from '@spacefly/shared';
import { WriteApi, WriteError } from '../../api/write-api';
import { I18n } from '../../i18n/i18n';
import { Confirm } from '../../platform/confirm';
import { Toast } from '../../platform/toast';

/** A rate typed by a person ("62,5", " 62.50 ") as the decimal string the server wants, or `null` when it isn't a number above zero. */
export function normalizeRate(input: string): string | null {
  const text = input.trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(text) && Number(text) > 0 ? text : null;
}

/** A stored rate as editable text: up to six decimals, without padding zeros. */
export function rateText(rate: number): string {
  return String(Number(rate.toFixed(6)));
}

/** Add, replace and delete the exchange rates stored in Firefly (the ones every converted amount uses). */
export function exchangeRatesViewModel() {
  const i18n = inject(I18n);
  const api = inject(WriteApi);
  const toast = inject(Toast);
  const confirm = inject(Confirm);

  const res = httpResource<ExchangeRatesResponse>(() => '/api/exchange-rates');
  const rows = computed(() => (res.hasValue() ? res.value().rates : []));
  const currencies = computed(() => (res.hasValue() ? res.value().currencies : []));
  const primary = computed(() => (res.hasValue() ? res.value().primary : ''));

  const picked = signal<string | null>(null);
  const currency = computed(() => picked() ?? currencies()[0] ?? '');
  const date = signal<string>(todayIso());
  const rate = signal('');
  const saving = signal(false);
  const error = signal<string | null>(null);

  const rateValue = computed(() => normalizeRate(rate()));
  const canSave = computed(() => !!currency() && isIsoDate(date()) && rateValue() !== null && !saving());
  /** The day already has a rate for this currency: saving replaces it. */
  const replaces = computed(() => rows().some((r) => r.currency === currency() && r.date === date()));

  function failure(err: unknown): string {
    if (err instanceof WriteError) {
      const first = Object.values(err.fields).flat()[0];
      if (first) return first;
    }
    return i18n.t('errors.generic');
  }

  return {
    i18n,
    res,
    rows,
    currencies,
    primary,
    currency,
    date,
    rate,
    saving,
    error,
    canSave,
    replaces,

    pick(code: string): void {
      picked.set(code);
    },

    /** Loads a stored rate into the form, to change its value. */
    edit(row: ExchangeRateRow): void {
      picked.set(row.currency);
      date.set(row.date);
      rate.set(rateText(row.rate));
      error.set(null);
    },

    async save(): Promise<void> {
      const value = rateValue();
      if (!canSave() || value === null) return;
      const body: ExchangeRateWrite = { currency: currency(), date: date(), rate: value };
      saving.set(true);
      error.set(null);
      try {
        await api.create('exchange-rates', body);
        toast.success(i18n.t('settings.exchange.saved'));
        rate.set('');
        res.reload();
      } catch (err) {
        error.set(failure(err));
      } finally {
        saving.set(false);
      }
    },

    async remove(row: ExchangeRateRow): Promise<void> {
      const ok = await confirm.confirm({
        title: i18n.t('settings.exchange.deleteTitle'),
        message: i18n.t('settings.exchange.deleteMessage', { currency: row.currency, date: row.date }),
        confirmLabel: i18n.t('forms.delete'),
        destructive: true,
      });
      if (!ok) return;
      try {
        await api.remove(`exchange-rates/${row.from}/${row.to}/${row.date}`);
        toast.success(i18n.t('settings.exchange.deleted'));
        res.reload();
      } catch (err) {
        toast.error(failure(err));
      }
    },
  };
}
