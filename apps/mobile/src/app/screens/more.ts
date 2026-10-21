import { Component, inject, NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterExtensions } from '@nativescript/angular';
import { I18n } from '@spacefly/client/i18n/i18n';

interface MoreItem {
  labelKey: string;
  route: string;
}

interface MoreSection {
  titleKey: string;
  items: MoreItem[];
}

/** Every mobile screen that is not a tab, grouped like the web sidebar. A screen appears here when its route exists. */
export const MORE_SECTIONS: MoreSection[] = [
  {
    titleKey: 'nav.sections.reports',
    items: [
      { labelKey: 'nav.monthly', route: '/reports/monthly' },
      { labelKey: 'nav.annual', route: '/reports/annual' },
      { labelKey: 'nav.flow', route: '/reports/flow' },
      { labelKey: 'nav.calendar', route: '/reports/calendar' },
    ],
  },
  {
    titleKey: 'nav.sections.analysis',
    items: [
      { labelKey: 'nav.categories', route: '/analysis/categories' },
      { labelKey: 'nav.tags', route: '/analysis/tags' },
      { labelKey: 'nav.merchants', route: '/analysis/merchants' },
      { labelKey: 'nav.incomeSources', route: '/analysis/income-sources' },
      { labelKey: 'nav.budgets', route: '/analysis/budgets' },
    ],
  },
  { titleKey: 'nav.sections.transactions', items: [{ labelKey: 'nav.newTransaction', route: '/transactions/new' }] },
];

/** The "More" tab: a list of the sections that have no tab of their own. */
@Component({
  selector: 'ns-more',
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ScrollView>
      <StackLayout class="screen-pad">
        @for (s of sections; track s.titleKey) {
          <Label [text]="i18n.t(s.titleKey)" class="eyebrow" marginTop="8" marginBottom="4"></Label>
          <StackLayout class="card">
            @for (item of s.items; track item.route) {
              <GridLayout columns="*, auto" class="row-divider" (tap)="go(item.route)">
                <Label col="0" [text]="i18n.t(item.labelKey)"></Label>
                <Label col="1" text="›" class="muted"></Label>
              </GridLayout>
            }
          </StackLayout>
        }
      </StackLayout>
    </ScrollView>
  `,
})
export class More {
  protected readonly i18n = inject(I18n);
  private readonly router = inject(RouterExtensions);
  protected readonly sections = MORE_SECTIONS;

  protected go(route: string): void {
    void this.router.navigate([route]);
  }
}
