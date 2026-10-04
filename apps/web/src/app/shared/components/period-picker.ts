import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCalendarRange, lucideCheck, lucideChevronLeft, lucideChevronRight } from '@ng-icons/lucide';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { addMonths, isIsoDate, presetPeriod, todayIso, type PeriodPreset } from '@spacefly/shared';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmPopoverImports } from '@spartan-ng/helm/popover';
import { HlmSeparator } from '@spartan-ng/helm/separator';
import { FormatService } from '../../core/format/format.service';
import { FiltersStore } from '../../core/state/filters.store';

interface PresetOption {
  key: string;
  preset: Exclude<PeriodPreset, 'custom'>;
  anchor: () => string;
}

/** ◀ [period ▾] ▶ — month / quarter / year / YTD presets plus a custom range. */
@Component({
  selector: 'sf-period-picker',
  imports: [FormsModule, NgIcon, TranslocoPipe, HlmButton, HlmInput, HlmLabel, HlmPopoverImports, HlmSeparator],
  providers: [provideIcons({ lucideChevronLeft, lucideChevronRight, lucideCalendarRange, lucideCheck })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center rounded-lg border border-input bg-background/40' },
  template: `
    <button hlmBtn variant="ghost" size="icon-sm" class="rounded-r-none" (click)="filters.shift(-1)" [attr.aria-label]="'period.previous' | transloco">
      <ng-icon name="lucideChevronLeft" />
    </button>
    <hlm-popover [state]="open() ? 'open' : 'closed'" (stateChanged)="open.set($event === 'open')" align="center" sideOffset="6">
      <button hlmPopoverTrigger hlmBtn variant="ghost" size="sm" class="min-w-0 rounded-none px-2 font-medium sm:min-w-44" (click)="openPicker()">
        <ng-icon name="lucideCalendarRange" class="hidden text-muted-foreground sm:inline" />
        <span class="truncate capitalize">{{ label() }}</span>
      </button>
      <hlm-popover-content *hlmPopoverPortal="let ctx" class="w-72 p-2">
        <div class="flex flex-col">
          @for (o of options; track o.key) {
            <button
              type="button"
              class="flex h-8 items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-muted"
              (click)="pick(o)"
            >
              <span class="flex-1">{{ 'period.presets.' + o.key | transloco }}</span>
              @if (isSelected(o)) {
                <ng-icon name="lucideCheck" class="text-primary" />
              }
            </button>
          }
        </div>
        <hlm-separator class="my-2" />
        <form class="flex flex-col gap-2 px-1 pb-1" (ngSubmit)="applyCustom()">
          <span class="eyebrow">{{ 'period.custom' | transloco }}</span>
          <div class="grid grid-cols-2 gap-2">
            <label hlmLabel class="flex flex-col items-start gap-1 text-xs">
              {{ 'period.from' | transloco }}
              <input hlmInput type="date" class="h-8 w-full text-xs" name="start" [(ngModel)]="customStart" />
            </label>
            <label hlmLabel class="flex flex-col items-start gap-1 text-xs">
              {{ 'period.to' | transloco }}
              <input hlmInput type="date" class="h-8 w-full text-xs" name="end" [(ngModel)]="customEnd" />
            </label>
          </div>
          <button hlmBtn size="sm" type="submit" [disabled]="!customValid()">{{ 'period.apply' | transloco }}</button>
        </form>
      </hlm-popover-content>
    </hlm-popover>
    <button hlmBtn variant="ghost" size="icon-sm" class="rounded-l-none" (click)="filters.shift(1)" [attr.aria-label]="'period.next' | transloco">
      <ng-icon name="lucideChevronRight" />
    </button>
  `,
})
export class PeriodPicker {
  protected readonly filters = inject(FiltersStore);
  private readonly f = inject(FormatService);
  private readonly t = inject(TranslocoService);
  protected readonly open = signal(false);
  protected customStart = '';
  protected customEnd = '';

  protected readonly options: PresetOption[] = [
    { key: 'thisMonth', preset: 'month', anchor: () => todayIso() },
    { key: 'lastMonth', preset: 'month', anchor: () => addMonths(todayIso(), -1) },
    { key: 'thisQuarter', preset: 'quarter', anchor: () => todayIso() },
    { key: 'thisYear', preset: 'year', anchor: () => todayIso() },
    { key: 'lastYear', preset: 'year', anchor: () => addMonths(todayIso(), -12) },
    { key: 'ytd', preset: 'ytd', anchor: () => todayIso() },
  ];

  protected readonly label = computed(() => {
    this.f.lang();
    const p = this.filters.period();
    switch (this.filters.preset()) {
      case 'month':
        return this.f.date(p.start, 'month');
      case 'quarter':
        return `${this.t.translate('period.quarterShort')}${Math.floor((Number(p.start.slice(5, 7)) - 1) / 3) + 1} ${p.start.slice(0, 4)}`;
      case 'year':
        return p.start.slice(0, 4);
      case 'ytd':
        return `${this.t.translate('period.ytdShort')} ${p.start.slice(0, 4)}`;
      default:
        return `${this.f.date(p.start, 'short')} – ${this.f.date(p.end, 'long')}`;
    }
  });

  protected readonly customValid = () => isIsoDate(this.customStart) && isIsoDate(this.customEnd) && this.customStart <= this.customEnd;

  protected openPicker(): void {
    this.customStart = this.filters.period().start;
    this.customEnd = this.filters.period().end;
  }

  protected isSelected(o: PresetOption): boolean {
    const p = presetPeriod(o.preset, o.anchor());
    const cur = this.filters.period();
    return this.filters.preset() === o.preset && p.start === cur.start && p.end === cur.end;
  }

  protected pick(o: PresetOption): void {
    this.filters.setPreset(o.preset, o.anchor());
    this.open.set(false);
  }

  protected applyCustom(): void {
    if (!this.customValid()) return;
    this.filters.setCustom({ start: this.customStart, end: this.customEnd });
    this.open.set(false);
  }
}
