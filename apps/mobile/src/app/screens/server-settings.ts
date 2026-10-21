import { Component, inject, NO_ERRORS_SCHEMA } from '@angular/core';
import { FLOW_THRESHOLDS } from '@spacefly/client/features/reports/flow.vm';
import { settingsViewModel } from '@spacefly/client/features/settings/settings.vm';
import { FormatService } from '@spacefly/client/format/format.service';
import { pickOne } from '../ui/picker';

/** The settings kept on the server: excluded accounts, balance history window, Sankey threshold, and the exchange rates in use. */
@Component({
  selector: 'ns-server-settings',
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    @if (vm.draft(); as d) {
      <StackLayout class="card">
        <Label [text]="vm.i18n.t('settings.excluded')" class="card-title"></Label>
        <Label [text]="vm.i18n.t('settings.excludedHint')" class="muted small" textWrap="true"></Label>
        @for (a of vm.accounts(); track a.id) {
          <GridLayout columns="*, auto" class="row-divider">
            <StackLayout col="0">
              <Label [text]="a.name" textWrap="false"></Label>
              <Label [text]="a.currency + (a.role ? ' · ' + vm.i18n.t('accounts.roles.' + a.role) : '')" class="muted small"></Label>
            </StackLayout>
            <Switch col="1" [checked]="d.excludedAccounts.includes(a.id)" (checkedChange)="vm.toggleExcluded(a.id, $any($event).value)"></Switch>
          </GridLayout>
        }
      </StackLayout>

      <StackLayout class="card">
        <Label [text]="vm.i18n.t('settings.preferences')" class="card-title"></Label>
        <Label [text]="vm.i18n.t('settings.balanceMonths')" class="field-label"></Label>
        <TextField class="field" keyboardType="number" [text]="'' + d.balanceMonths" (textChange)="setMonths($any($event).value)"></TextField>
        <Label [text]="vm.i18n.t('settings.sankeyThreshold')" class="field-label"></Label>
        <Label [text]="f.pct(d.sankeyThreshold, 1, false, { mask: false }) + ' ▾'" class="chip" horizontalAlignment="left" (tap)="pickThreshold()"></Label>
        <Button [text]="vm.i18n.t('settings.save')" class="btn" marginTop="8" [isEnabled]="!vm.saving()" (tap)="vm.save()"></Button>
      </StackLayout>
    } @else if (vm.res.isLoading()) {
      <ActivityIndicator busy="true"></ActivityIndicator>
    }

    @if (vm.res.value()?.rates?.length) {
      <StackLayout class="card">
        <Label [text]="vm.i18n.t('settings.rates')" class="card-title"></Label>
        <Label [text]="vm.i18n.t('settings.ratesHint')" class="muted small" textWrap="true"></Label>
        @for (r of vm.res.value()!.rates; track r.base + r.month) {
          <GridLayout columns="*, auto" class="row-divider">
            <StackLayout col="0">
              <Label [text]="f.date(r.month, 'month')" textWrap="false"></Label>
              <Label [text]="'1 ' + r.base + ' → ' + r.quote + ' · ' + vm.i18n.t('settings.sources.' + r.source)" class="muted small"></Label>
            </StackLayout>
            <Label col="1" [text]="r.rate.toFixed(4)" class="money"></Label>
          </GridLayout>
        }
      </StackLayout>
    }
  `,
})
export class ServerSettings {
  protected readonly vm = settingsViewModel();
  protected readonly f = inject(FormatService);

  /** The balance window is 2–60 months; anything else keeps the last valid value. */
  protected setMonths(text: string): void {
    const months = Number(text);
    if (Number.isInteger(months) && months >= 2 && months <= 60) this.vm.patch({ balanceMonths: months });
  }

  protected async pickThreshold(): Promise<void> {
    const options = FLOW_THRESHOLDS.map((t) => ({ value: String(t), label: this.f.pct(t, 1, false, { mask: false }) }));
    const picked = await pickOne(this.vm.i18n.t('settings.sankeyThreshold'), options, this.vm.i18n.t('forms.cancel'));
    if (picked !== null) this.vm.patch({ sankeyThreshold: Number(picked) });
  }
}
