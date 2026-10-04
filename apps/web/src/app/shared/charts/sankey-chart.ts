import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import type { SankeyNode, SankeyReport } from '@spacefly/shared';
import { FormatService } from '../../core/format/format.service';
import { I18n } from '../../core/i18n/i18n';
import { sankeyOption } from './builders';
import { Chart } from './chart';
import { BreakpointService } from './breakpoint';

/** Money-flow Sankey; vertical on phones. Emits the clicked node (with its drill-down filter). */
@Component({
  selector: 'sf-sankey-chart',
  imports: [Chart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<sf-chart [options]="options()" [height]="chartHeight()" [ariaLabel]="i18n.t('flow.title')" (chartClick)="onClick($event)" />`,
})
export class SankeyChart {
  protected readonly i18n = inject(I18n);
  private readonly f = inject(FormatService);
  private readonly bp = inject(BreakpointService);
  readonly report = input.required<SankeyReport>();
  readonly height = input<string | null>(null);
  readonly nodeClick = output<SankeyNode>();

  private readonly vertical = computed(() => this.bp.mobile());

  protected readonly chartHeight = computed(() => {
    if (this.height()) return this.height()!;
    const nodes = this.report().nodes.length;
    return this.vertical() ? `${Math.max(34, nodes * 1.6)}rem` : `${Math.min(Math.max(26, nodes * 1.9), 60)}rem`;
  });

  protected readonly options = computed(() => sankeyOption(this.f, this.report(), (n) => this.label(n), this.vertical()));

  label(n: SankeyNode): string {
    return n.labelKey ? this.i18n.t(n.labelKey) : n.label;
  }

  protected onClick(e: { dataType?: string; data?: unknown }): void {
    if (e.dataType !== 'node') return;
    const node = this.report().nodes.find((n) => n.id === (e.data as { name: string }).name);
    if (node?.filter) this.nodeClick.emit(node);
  }
}
