import { Component, inject, NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { FormatService } from '@spacefly/client/format/format.service';
import { I18n } from '@spacefly/client/i18n/i18n';
import { FiltersStore } from '@spacefly/client/state/filters.store';
import { MetaStore } from '@spacefly/client/state/meta.store';
import { PERIOD_PRESET_OPTIONS, periodLabel } from '@spacefly/client/ui-logic/period-presets';
import { pickOne } from './picker';

/** Previous / next period, the period presets (tap the label) and the display currency, shared by the screens that depend on them. */
@Component({
  selector: 'ns-period-bar',
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <GridLayout columns="auto, *, auto, auto" class="screen-pad">
      <Label col="0" text="‹" class="btn-small chip" (tap)="filters.shift(-1)"></Label>
      <Label col="1" [text]="label() + ' ▾'" horizontalAlignment="center" verticalAlignment="center" (tap)="pick()"></Label>
      <Label col="2" text="›" class="btn-small chip" (tap)="filters.shift(1)"></Label>
      <StackLayout col="3" orientation="horizontal" marginLeft="8">
        @for (c of meta.currencies(); track c.code) {
          <Label [text]="c.code" class="chip" [class.chip-on]="filters.currency() === c.code" (tap)="filters.setCurrency(c.code)"></Label>
        }
      </StackLayout>
    </GridLayout>
  `,
})
export class PeriodBar {
  protected readonly filters = inject(FiltersStore);
  protected readonly meta = inject(MetaStore);
  private readonly f = inject(FormatService);
  private readonly i18n = inject(I18n);
  private readonly transloco = inject(TranslocoService);

  protected label(): string {
    this.i18n.t('period.custom');
    return periodLabel(this.filters.preset(), this.filters.period(), { date: (iso, style) => this.f.date(iso, style), translate: (key) => this.transloco.translate(key) });
  }

  protected async pick(): Promise<void> {
    const options = PERIOD_PRESET_OPTIONS.map((o) => ({ value: o.key, label: this.i18n.t('period.presets.' + o.key) }));
    const key = await pickOne(this.i18n.t('period.custom'), options, this.i18n.t('forms.cancel'));
    const chosen = PERIOD_PRESET_OPTIONS.find((o) => o.key === key);
    if (chosen) this.filters.setPreset(chosen.preset, chosen.anchor());
  }
}
