import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { MetaStore } from '../state/meta.store';
import { FiltersStore } from '../state/filters.store';

export type DateStyle = 'short' | 'long' | 'month' | 'monthShort' | 'weekday' | 'day' | 'full';

const SYMBOLS: Record<string, string> = { DOP: 'RD$', USD: 'US$', EUR: '€' };

/** Locale-aware number/date formatting (es-DO / en-US), cached per locale. */
@Injectable({ providedIn: 'root' })
export class FormatService {
  private readonly transloco = inject(TranslocoService);
  private readonly meta = inject(MetaStore);
  private readonly filters = inject(FiltersStore);
  readonly lang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  readonly locale = computed(() => (this.lang() === 'en' ? 'en-US' : 'es-DO'));
  private readonly cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

  symbol(currency?: string): string {
    const code = currency ?? this.filters.currency();
    return this.meta.currencies().find((c) => c.code === code)?.symbol ?? SYMBOLS[code] ?? code;
  }

  number(value: number, decimals = 2): string {
    return this.nf(`n${decimals}`, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
  }

  /** "RD$1,234.56" / "−RD$1,234.56" / "+US$12.00" (signed). */
  money(value: number | null | undefined, currency?: string, opts: { signed?: boolean; decimals?: number; abs?: boolean } = {}): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    const v = opts.abs ? Math.abs(value) : value;
    const sign = v < 0 ? '−' : opts.signed && v > 0 ? '+' : '';
    return `${sign}${this.symbol(currency)}${this.number(Math.abs(v), opts.decimals ?? 2)}`;
  }

  /** "RD$12.9K" style for axes, chips and tight spaces. */
  compact(value: number | null | undefined, currency?: string | false): string {
    if (value === null || value === undefined) return '—';
    const sign = value < 0 ? '−' : '';
    const n = this.nf('compact', { notation: 'compact', maximumFractionDigits: 1 }).format(Math.abs(value));
    return currency === false ? `${sign}${n}` : `${sign}${this.symbol(currency || undefined)}${n}`;
  }

  /** Ratio → "12.3 %" (es) / "12.3%" (en). */
  pct(ratio: number | null | undefined, decimals = 1, signed = false): string {
    if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return '—';
    const s = this.nf(`p${decimals}${signed}`, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      signDisplay: signed ? 'exceptZero' : 'auto',
    }).format(ratio);
    return s.replace('-', '−');
  }

  date(iso: string | null | undefined, style: DateStyle = 'short'): string {
    if (!iso) return '—';
    const opts: Record<DateStyle, Intl.DateTimeFormatOptions> = {
      short: { day: 'numeric', month: 'short' },
      long: { day: 'numeric', month: 'long', year: 'numeric' },
      full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
      month: { month: 'long', year: 'numeric' },
      monthShort: { month: 'short' },
      weekday: { weekday: 'short' },
      day: { weekday: 'short', day: 'numeric', month: 'short' },
    };
    const d = iso.length === 7 ? `${iso}-01` : iso.slice(0, 10);
    const [y, m, day] = d.split('-').map(Number);
    return this.df(style, { ...opts[style], timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, day)));
  }

  /** Abbreviated month label for chart axes: "sept 26". */
  monthLabel(month: string, withYear = true): string {
    const d = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1));
    const f = this.df(`m${withYear}`, withYear ? { month: 'short', year: '2-digit', timeZone: 'UTC' } : { month: 'short', timeZone: 'UTC' });
    return f.format(d).replace('.', '');
  }

  weekdayNames(): string[] {
    const f = this.df('wd', { weekday: 'narrow', timeZone: 'UTC' });
    // 2024-01-01 was a Monday.
    return Array.from({ length: 7 }, (_, i) => f.format(new Date(Date.UTC(2024, 0, 1 + i))));
  }

  private nf(key: string, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
    const k = `${this.locale()}|${key}`;
    let f = this.cache.get(k) as Intl.NumberFormat | undefined;
    if (!f) this.cache.set(k, (f = new Intl.NumberFormat(this.locale(), opts)));
    return f;
  }

  private df(key: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
    const k = `${this.locale()}|d|${key}`;
    let f = this.cache.get(k) as Intl.DateTimeFormat | undefined;
    if (!f) this.cache.set(k, (f = new Intl.DateTimeFormat(this.locale(), opts)));
    return f;
  }
}
