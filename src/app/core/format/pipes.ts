import { inject, Pipe, type PipeTransform } from '@angular/core';
import { FormatService, type DateStyle } from './format.service';

/** Impure so a language switch re-renders numbers and dates immediately. */
@Pipe({ name: 'money', pure: false })
export class MoneyPipe implements PipeTransform {
  private readonly f = inject(FormatService);
  transform(value: number | null | undefined, currency?: string | null, signed = false, decimals = 2): string {
    return this.f.money(value, currency ?? undefined, { signed, decimals });
  }
}

@Pipe({ name: 'compact', pure: false })
export class CompactPipe implements PipeTransform {
  private readonly f = inject(FormatService);
  transform(value: number | null | undefined, currency?: string | false): string {
    return this.f.compact(value, currency);
  }
}

@Pipe({ name: 'pct', pure: false })
export class PctPipe implements PipeTransform {
  private readonly f = inject(FormatService);
  transform(ratio: number | null | undefined, decimals = 1, signed = false): string {
    return this.f.pct(ratio, decimals, signed);
  }
}

@Pipe({ name: 'fdate', pure: false })
export class DatePipe implements PipeTransform {
  private readonly f = inject(FormatService);
  transform(iso: string | null | undefined, style: DateStyle = 'short'): string {
    return this.f.date(iso, style);
  }
}

@Pipe({ name: 'monthLabel', pure: false })
export class MonthLabelPipe implements PipeTransform {
  private readonly f = inject(FormatService);
  transform(month: string, withYear = true): string {
    return this.f.monthLabel(month, withYear);
  }
}

export const FORMAT_PIPES = [MoneyPipe, CompactPipe, PctPipe, DatePipe, MonthLabelPipe] as const;
