import { Component, computed, effect, inject, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { I18n } from '@spacefly/client/i18n/i18n';
import { TabName, TabState } from '../platform/tab-state';
import { PeriodBar } from '../ui/period-bar';
import { Accounts } from './accounts';
import { Dashboard } from './dashboard';
import { Settings } from './settings';
import { Transactions } from './transactions';

const TABS: { name: TabName; labelKey: string }[] = [
  { name: 'dashboard', labelKey: 'nav.dashboard' },
  { name: 'transactions', labelKey: 'nav.explorer' },
  { name: 'accounts', labelKey: 'nav.assetAccounts' },
  { name: 'settings', labelKey: 'nav.settings' },
];

/**
 * The home screen: four tabs on one page. Tabs are built the first time they are opened and then only hidden, so each keeps its
 * scroll position and data (named router outlets in a native tab view are fragile; this needs none).
 */
@Component({
  selector: 'ns-home',
  imports: [PeriodBar, Dashboard, Transactions, Accounts, Settings],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar [title]="title()"></ActionBar>
    <GridLayout rows="auto, *, auto" class="screen">
      <StackLayout row="0">
        @if (showPeriod()) {
          <ns-period-bar />
        }
      </StackLayout>
      <GridLayout row="1">
        @if (visited().has('dashboard')) {
          <GridLayout [visibility]="visibility('dashboard')"><ns-dashboard /></GridLayout>
        }
        @if (visited().has('transactions')) {
          <GridLayout [visibility]="visibility('transactions')"><ns-transactions /></GridLayout>
        }
        @if (visited().has('accounts')) {
          <GridLayout [visibility]="visibility('accounts')"><ns-accounts /></GridLayout>
        }
        @if (visited().has('settings')) {
          <GridLayout [visibility]="visibility('settings')"><ns-settings /></GridLayout>
        }
      </GridLayout>
      <GridLayout row="2" columns="*, *, *, *" class="tab-bar">
        @for (t of tabs; track t.name; let i = $index) {
          <Label [col]="i" [text]="i18n.t(t.labelKey)" class="tab" [class.tab-on]="tab.current() === t.name" (tap)="tab.current.set(t.name)"></Label>
        }
      </GridLayout>
    </GridLayout>
  `,
})
export class Home {
  protected readonly i18n = inject(I18n);
  protected readonly tab = inject(TabState);
  protected readonly tabs = TABS;
  protected readonly visited = signal<ReadonlySet<TabName>>(new Set([this.tab.current()]));

  protected readonly title = computed(() => this.i18n.t(TABS.find((t) => t.name === this.tab.current())!.labelKey));
  protected readonly showPeriod = computed(() => this.tab.current() === 'dashboard' || this.tab.current() === 'transactions');

  constructor() {
    effect(() => {
      const current = this.tab.current();
      if (!this.visited().has(current)) this.visited.update((v) => new Set([...v, current]));
    });
  }

  protected visibility(name: TabName): 'visible' | 'collapse' {
    return this.tab.current() === name ? 'visible' : 'collapse';
  }
}
