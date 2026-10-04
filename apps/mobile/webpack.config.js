const webpack = require('@nativescript/webpack');
const path = require('node:path');

/** The repository root: Angular, rxjs and Transloco are installed there once, for every app. */
const root = path.resolve(__dirname, '../..');

module.exports = (env) => {
  webpack.init(env);
  webpack.useConfig('angular');

  webpack.chainWebpack((config) => {
    // libs/client sits outside this project, so resolution has to look in the root node_modules first: that is
    // the one copy of Angular, rxjs and Transloco (npm run check:deps fails if another one is installed).
    config.resolve.modules.clear().add(path.join(root, 'node_modules')).add('node_modules');
    // `--env.apiUrl=http://10.0.2.2:3100` pre-fills the server URL (development convenience, never a secret).
    config.plugin('DefinePlugin').tap((args) => {
      args[0] = { ...args[0], __SPACEFLY_API_URL__: JSON.stringify(env.apiUrl ?? '') };
      return args;
    });
  });

  // The chart page loads ECharts from a local file inside the WebView (src/assets/chart/chart.html).
  webpack.Utils.addCopyRule({
    from: 'node_modules/echarts/dist/echarts.min.js',
    to: 'assets/chart',
    context: root,
  });

  return webpack.resolveConfig();
};
