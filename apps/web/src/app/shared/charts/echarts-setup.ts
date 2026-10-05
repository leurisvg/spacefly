/**
 * Tree-shaken ECharts build, loaded lazily by ngx-echarts on the first chart render
 * (keeps ECharts out of the initial bundle).
 */
import * as echarts from 'echarts/core';
import { BarChart, HeatmapChart, LineChart, PieChart, SankeyChart, SunburstChart, TreemapChart } from 'echarts/charts';
import {
  AriaComponent,
  CalendarComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { buildTheme } from '@spacefly/client/charts/chart-theme';
import { THEME_IDS } from '@spacefly/client/charts/palette';

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  SankeyChart,
  SunburstChart,
  TreemapChart,
  HeatmapChart,
  AriaComponent,
  CalendarComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
]);
// One ECharts theme per app theme; `sf-chart` picks `spacefly-<id>` (ngx-echarts re-inits the chart when it changes).
for (const id of THEME_IDS) echarts.registerTheme(`spacefly-${id}`, buildTheme(id));

export default echarts;
