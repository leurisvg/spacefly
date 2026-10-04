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
import { buildTheme } from './chart-theme';

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
echarts.registerTheme('spacefly', buildTheme());

export default echarts;
