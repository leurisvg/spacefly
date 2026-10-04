import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { RecurrencesReport } from '@spacefly/shared';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { reportResource } from '../../core/api/report-resource';
import { FORMAT_PIPES } from '../../core/format/pipes';
import { I18n } from '../../core/i18n/i18n';
import { EmptyState } from '../../shared/components/empty-state';
import { Money } from '../../shared/components/money';
import { PageHeader } from '../../shared/components/page-header';
import { Section } from '../../shared/components/section';

@Component({
  selector: 'sf-recurring',
  imports: [TranslocoPipe, HlmBadge, EmptyState, Money, PageHeader, Section, ...FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="i18n.t('nav.recurring')" [description]="i18n.t('recurring.description')" />
    <sf-section [title]="i18n.t('recurring.list')" [loading]="res.initialLoading()">
      @if (res.data(); as data) {
        @if (data.recurrences.length) {
          <div class="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            @for (r of data.recurrences; track r.id) {
              <article class="flex flex-col gap-2 rounded-lg border border-border bg-background/30 p-4" [class.opacity-50]="!r.active">
                <div class="flex items-start gap-2">
                  <div class="min-w-0 flex-1">
                    <h3 class="truncate font-medium">{{ r.title }}</h3>
                    <p class="truncate text-xs text-muted-foreground">{{ r.source }} → {{ r.destination }}</p>
                  </div>
                  <sf-money [value]="r.type === 'deposit' ? r.amount : -r.amount" [signed]="r.type !== 'transfer'" [tone]="r.type === 'deposit' ? 'income' : r.type === 'withdrawal' ? 'expense' : 'none'" />
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <span hlmBadge variant="secondary" class="text-[10px]">{{ 'txType.' + r.type | transloco }}</span>
                  <span hlmBadge variant="outline" class="text-[10px]">{{ r.repetition }}</span>
                  @if (r.category) {
                    <span hlmBadge variant="outline" class="text-[10px]">{{ r.category }}</span>
                  }
                  @if (!r.active) {
                    <span hlmBadge variant="outline" class="text-[10px]">{{ 'recurring.inactive' | transloco }}</span>
                  }
                </div>
                <div class="text-xs">
                  <span class="eyebrow">{{ 'recurring.next' | transloco }}</span>
                  <div class="mt-1 flex flex-wrap gap-1.5">
                    @for (d of r.nextOccurrences; track d) {
                      <span class="rounded bg-muted px-1.5 py-0.5">{{ d | fdate: 'short' }}</span>
                    } @empty {
                      <span class="text-muted-foreground">—</span>
                    }
                  </div>
                </div>
                @if (r.repeatUntil) {
                  <p class="text-xs text-muted-foreground">{{ 'recurring.until' | transloco: { date: (r.repeatUntil | fdate: 'long') } }}</p>
                }
              </article>
            }
          </div>
        } @else {
          <sf-empty [title]="i18n.t('recurring.none')" />
        }
      }
    </sf-section>
  `,
})
export class Recurring {
  protected readonly i18n = inject(I18n);
  protected readonly res = reportResource<RecurrencesReport>('reports/recurrences', () => ({}), { global: false });
}
