import { Component, computed, effect, ElementRef, input, NO_ERRORS_SCHEMA, output, signal, viewChild } from '@angular/core';
import { AWebViewModule } from '@nativescript-community/ui-webview/angular';
import { buildTheme } from '@spacefly/client/charts/chart-theme';
import { hydrateSource, toPortableOption } from '@spacefly/client/charts/portable';
import type { EChartsCoreOption } from 'echarts/core';

/** What a tap on a chart element reports (the same fields the web `chartClick` event has). */
export interface ChartClick {
  dataIndex: number;
  name: string;
}

interface Bridge {
  executeJavaScript(code: string): Promise<unknown>;
}

/**
 * An ECharts chart inside a local WebView. The option comes from the shared builders (`libs/client`); its formatters are
 * replaced by serializable specs (`toPortableOption`) and rebuilt on the page by `hydrateOption`, so the mobile charts are
 * the web charts. Taps travel back through the WebView bridge.
 */
@Component({
  selector: 'ns-chart',
  imports: [AWebViewModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <AWebView #web src="~/assets/chart/chart.html" [height]="height()" backgroundColor="transparent" (loadFinished)="onLoaded()" (chartClick)="onTap($any($event))"></AWebView>
  `,
})
export class ChartWebView {
  readonly options = input.required<EChartsCoreOption>();
  readonly height = input(240);
  readonly chartClick = output<ChartClick>();

  private readonly web = viewChild.required<ElementRef<Bridge>>('web');
  private readonly ready = signal(false);
  /** The option as JSON; throws (and logs) if a builder used a formatter that isn't portable. */
  private readonly payload = computed(() => JSON.stringify(toPortableOption(this.options())));
  /** The ECharts theme of the active app theme (reads the palette signal, so it follows a theme change). */
  private readonly theme = computed(() => JSON.stringify(buildTheme()));

  constructor() {
    effect(() => {
      if (!this.ready()) return;
      const code = `window.sfRender(${this.payload()}, ${this.theme()});`;
      void this.web().nativeElement.executeJavaScript(code);
    });
  }

  protected async onLoaded(): Promise<void> {
    await this.web().nativeElement.executeJavaScript(`window.sfHydrate = ${hydrateSource()};`);
    this.ready.set(true);
  }

  protected onTap(event: { data?: ChartClick }): void {
    if (event.data) this.chartClick.emit(event.data);
  }
}
