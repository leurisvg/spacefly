import 'dart:math' as math;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../features/accounts/accounts_vm.dart' show BalanceLine;
import '../features/dashboard/dashboard_vm.dart' show Slice;
import '../format/formatter.dart';
import '../theme/app_theme.dart';

/// Gap between the labels of a category axis so they never overlap: every `n`th one.
int labelStep(int count, {int max = 6}) => count <= max ? 1 : (count / max).ceil();

FlTitlesData _titles(BuildContext context, {required Widget Function(double value) left, Widget Function(double value)? bottom, double leftSize = 52}) {
  final style = TextStyle(fontSize: 10, color: context.tokens.chartMuted);
  return FlTitlesData(
    topTitles: const AxisTitles(),
    rightTitles: const AxisTitles(),
    leftTitles: AxisTitles(
      sideTitles: SideTitles(
        showTitles: true,
        reservedSize: leftSize,
        getTitlesWidget: (value, meta) =>
            value == meta.max || value == meta.min && value != 0 ? const SizedBox.shrink() : SideTitleWidget(meta: meta, space: 4, child: DefaultTextStyle(style: style, child: left(value))),
      ),
    ),
    bottomTitles: AxisTitles(
      sideTitles: SideTitles(
        showTitles: bottom != null,
        reservedSize: 22,
        interval: 1,
        getTitlesWidget: (value, meta) =>
            value != value.roundToDouble() ? const SizedBox.shrink() : SideTitleWidget(meta: meta, space: 6, child: DefaultTextStyle(style: style, child: bottom!(value))),
      ),
    ),
  );
}

FlGridData _grid(BuildContext context) => FlGridData(
      show: true,
      drawVerticalLine: false,
      getDrawingHorizontalLine: (_) => FlLine(color: context.tokens.chartGrid, strokeWidth: 1),
    );

/// What each color of a chart stands for, in a row under it (the web's legend). A [line] item is drawn as a dash with a dot.
class ChartLegend extends StatelessWidget {
  const ChartLegend({super.key, required this.items});

  final List<({Color color, String label, bool line})> items;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Wrap(
        key: const Key('chart-legend'),
        spacing: 14,
        runSpacing: 4,
        children: [
          for (final item in items)
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                item.line
                    ? SizedBox(
                        width: 14,
                        height: 10,
                        child: Stack(alignment: Alignment.center, children: [
                          Container(height: 2, color: item.color),
                          Container(width: 6, height: 6, decoration: BoxDecoration(shape: BoxShape.circle, color: item.color)),
                        ]),
                      )
                    : Container(width: 10, height: 10, decoration: BoxDecoration(color: item.color, borderRadius: BorderRadius.circular(2))),
                const SizedBox(width: 5),
                Text(item.label, style: TextStyle(fontSize: 11, color: tokens.chartInk2)),
              ],
            ),
        ],
      ),
    );
  }
}

/// Income and expenses side by side per month. Tapping a month calls [onMonth]; the tooltip shows the net too.
class IncomeExpenseChart extends StatelessWidget {
  const IncomeExpenseChart({super.key, required this.months, required this.f, required this.incomeLabel, required this.expenseLabel, required this.netLabel, required this.onMonth, this.currency});

  final List<({String month, double income, double expense, double net})> months;
  final Formatter f;
  final String incomeLabel;
  final String expenseLabel;
  final String netLabel;
  final void Function(int index) onMonth;

  /// The currency of the amounts when it is not the display currency (an account kept in dollars).
  final String? currency;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final step = labelStep(months.length);
    final top = months.fold<double>(0, (m, x) => [m, x.income, x.expense, x.net].reduce((a, b) => a > b ? a : b));
    final bottom = months.fold<double>(0, (m, x) => x.net < m ? x.net : m);
    // Both charts share the vertical range and the room kept for the axes, so the net line sits over the bars it belongs to.
    final minY = f.hidden || bottom == 0 ? 0.0 : bottom * 1.1;
    final maxY = top == 0 || f.hidden ? 1.0 : top * 1.08;
    Widget monthLabel(double v) => v.toInt() % step == 0 && v.toInt() < months.length ? Text(f.monthLabel(months[v.toInt()].month, withYear: false)) : const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: 220,
          child: Stack(
            children: [
              BarChart(
                BarChartData(
                  minY: minY,
                  maxY: maxY,
                  alignment: BarChartAlignment.spaceAround,
                  gridData: _grid(context),
                  borderData: FlBorderData(show: false),
                  titlesData: _titles(context, left: (v) => Text(f.compact(v, currency: currency)), bottom: monthLabel),
                  barTouchData: BarTouchData(
                    touchCallback: (event, response) {
                      final spot = response?.spot;
                      if (event is FlTapUpEvent && spot != null) onMonth(spot.touchedBarGroupIndex);
                    },
                    touchTooltipData: BarTouchTooltipData(
                      getTooltipColor: (_) => tokens.chartTooltip,
                      getTooltipItem: (group, groupIndex, rod, rodIndex) {
                        if (rodIndex != 0) return null;
                        final m = months[groupIndex];
                        return BarTooltipItem(
                          '${f.date(m.month, DateStyle.month)}\n',
                          TextStyle(color: tokens.chartInk, fontWeight: FontWeight.w600, fontSize: 12),
                          children: [
                            TextSpan(text: '$incomeLabel  ${f.money(m.income, currency: currency)}\n', style: TextStyle(color: tokens.moneyIncome, fontWeight: FontWeight.w400)),
                            TextSpan(text: '$expenseLabel  ${f.money(-m.expense, currency: currency)}\n', style: TextStyle(color: tokens.moneyExpense, fontWeight: FontWeight.w400)),
                            TextSpan(text: '$netLabel  ${f.money(m.net, currency: currency, signed: true)}', style: TextStyle(color: tokens.moneyNet, fontWeight: FontWeight.w400)),
                          ],
                        );
                      },
                    ),
                  ),
                  barGroups: [
                    for (final (i, m) in months.indexed)
                      BarChartGroupData(
                        x: i,
                        barsSpace: 3,
                        barRods: [
                          BarChartRodData(toY: f.hidden ? 0 : m.income, color: tokens.moneyIncome, width: 7, borderRadius: const BorderRadius.vertical(top: Radius.circular(3))),
                          BarChartRodData(toY: f.hidden ? 0 : m.expense, color: tokens.moneyExpense, width: 7, borderRadius: const BorderRadius.vertical(top: Radius.circular(3))),
                        ],
                      ),
                  ],
                ),
              ),
              // The net of each month as a line over the bars: a transparent chart with the same range and axes, that takes no touches.
              IgnorePointer(
                child: LineChart(
                  LineChartData(
                    minX: -0.5,
                    maxX: months.length - 0.5,
                    minY: minY,
                    maxY: maxY,
                    gridData: const FlGridData(show: false),
                    borderData: FlBorderData(show: false),
                    titlesData: _titles(context, left: (v) => const SizedBox.shrink(), bottom: (v) => const SizedBox.shrink()),
                    lineTouchData: const LineTouchData(enabled: false),
                    lineBarsData: [
                      LineChartBarData(
                        spots: [for (final (i, m) in months.indexed) FlSpot(i.toDouble(), f.hidden ? 0 : m.net)],
                        color: tokens.moneyNet,
                        barWidth: 2,
                        dotData: FlDotData(show: true, getDotPainter: (_, __, ___, ____) => FlDotCirclePainter(radius: 3.5, color: tokens.moneyNet, strokeWidth: 1.5, strokeColor: tokens.chartSurface)),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        ChartLegend(items: [
          (color: tokens.moneyIncome, label: incomeLabel, line: false),
          (color: tokens.moneyExpense, label: expenseLabel, line: false),
          (color: tokens.moneyNet, label: netLabel, line: true),
        ]),
      ],
    );
  }
}

/// What was spent in a budget each month against its limit (a pale bar behind). Spending over the limit is drawn in the expense color.
/// Port of `budgetHistoryOption` in libs/client/src/charts/builders.ts.
class BudgetHistoryChart extends StatelessWidget {
  const BudgetHistoryChart({super.key, required this.history, required this.f, required this.spentLabel, required this.limitLabel});

  final List<({String month, double limit, double spent})> history;
  final Formatter f;
  final String spentLabel;
  final String limitLabel;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final step = labelStep(history.length);
    final top = history.fold<double>(0, (m, x) => [m, x.limit, x.spent].reduce((a, b) => a > b ? a : b));
    return SizedBox(
      height: 220,
      child: BarChart(
        BarChartData(
          maxY: top == 0 ? 1 : top * 1.08,
          alignment: BarChartAlignment.spaceAround,
          gridData: _grid(context),
          borderData: FlBorderData(show: false),
          titlesData: _titles(
            context,
            left: (v) => Text(f.compact(v)),
            bottom: (v) => v.toInt() % step == 0 && v.toInt() < history.length ? Text(f.monthLabel(history[v.toInt()].month, withYear: false)) : const SizedBox.shrink(),
          ),
          barTouchData: BarTouchData(
            touchTooltipData: BarTouchTooltipData(
              getTooltipColor: (_) => tokens.chartTooltip,
              getTooltipItem: (group, groupIndex, rod, rodIndex) {
                final x = history[groupIndex];
                return BarTooltipItem(
                  '${f.date(x.month, DateStyle.month)}\n',
                  TextStyle(color: tokens.chartInk, fontWeight: FontWeight.w600, fontSize: 12),
                  children: [
                    TextSpan(text: '$spentLabel  ${f.money(x.spent)}\n', style: TextStyle(color: rod.color, fontWeight: FontWeight.w400)),
                    TextSpan(text: '$limitLabel  ${f.money(x.limit)}', style: TextStyle(color: tokens.chartInk2, fontWeight: FontWeight.w400)),
                    if (x.limit > 0 && !f.hidden) TextSpan(text: '\n${f.pct(x.spent / x.limit, decimals: 0)}', style: TextStyle(color: tokens.chartInk2, fontWeight: FontWeight.w400)),
                  ],
                );
              },
            ),
          ),
          barGroups: [
            for (final (i, x) in history.indexed)
              BarChartGroupData(
                x: i,
                barRods: [
                  BarChartRodData(
                    toY: f.hidden ? 0 : x.spent,
                    color: x.limit > 0 && x.spent > x.limit ? tokens.moneyExpense : tokens.moneyBudget,
                    width: 12,
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(3)),
                    backDrawRodData: BackgroundBarChartRodData(show: x.limit > 0 && !f.hidden, toY: x.limit, color: tokens.chartInk2.withValues(alpha: 0.25)),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

/// A ring of the top categories with their total in the middle; tapping a slice calls [onSlice].
class DonutChart extends StatelessWidget {
  const DonutChart({super.key, required this.slices, required this.centerLabel, required this.centerCaption, required this.onSlice});

  final List<Slice> slices;
  final String centerLabel;
  final String centerCaption;
  final void Function(int index) onSlice;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final total = slices.fold<double>(0, (a, s) => a + s.value);
    return SizedBox(
      height: 200,
      child: Stack(
        alignment: Alignment.center,
        children: [
          PieChart(
            PieChartData(
              sectionsSpace: 2,
              centerSpaceRadius: 62,
              sections: [
                for (final s in slices)
                  PieChartSectionData(value: total == 0 ? 1 : s.value, color: s.color, radius: 22, showTitle: false, borderSide: BorderSide(color: tokens.chartSurface, width: 2)),
              ],
              pieTouchData: PieTouchData(
                touchCallback: (event, response) {
                  final index = response?.touchedSection?.touchedSectionIndex;
                  if (event is FlTapUpEvent && index != null && index >= 0) onSlice(index);
                },
              ),
            ),
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(centerLabel, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: tokens.chartInk)),
              Text(centerCaption, style: TextStyle(fontSize: 11, color: tokens.chartInk2)),
            ],
          ),
        ],
      ),
    );
  }
}

/// One or more lines over a shared x axis; the first line can be filled underneath. The x axis is a list of months unless [labels]
/// gives its own texts (days of a month…); [yFormat] writes the y axis and tooltip values (percentages), [tipTitle] sets the heading
/// of the tooltip (the month by default) and [tipDetail] adds lines under the values. With several lines a legend names them.
/// [zeroLine] draws the line of zero when the values cross it and [step] holds each value until the next one (a balance that only
/// changes on the days something happens).
class LinesChart extends StatelessWidget {
  const LinesChart({super.key, required this.months, required this.lines, required this.f, this.area = false, this.height = 200, this.labels, this.yFormat, this.tipTitle, this.tipDetail, this.zeroLine = false, this.step = false, this.zoomable = false});

  final List<String> months;
  final List<BalanceLine> lines;
  final Formatter f;
  final bool area;
  final double height;
  final List<String>? labels;
  final String Function(double value)? yFormat;
  final String Function(int index)? tipTitle;
  final String? Function(int index)? tipDetail;
  final bool zeroLine;
  final bool step;

  /// Pinch and drag zoom the x axis (a long series of days).
  final bool zoomable;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final count = labels?.length ?? months.length;
    final labelEvery = labelStep(count);
    final axis = yFormat ?? (double v) => f.compact(v);
    final tip = yFormat ?? (double v) => f.money(v);
    String xLabel(int i) => labels != null ? labels![i] : f.monthLabel(months[i], withYear: false);
    String? title(int i) => tipTitle != null ? tipTitle!(i) : (labels == null && i < months.length ? f.date(months[i], DateStyle.month) : null);
    final all = [for (final l in lines) ...l.values];
    final crossesZero = zeroLine && !f.hidden && all.isNotEmpty && all.reduce(math.min) <= 0 && all.reduce(math.max) >= 0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: height,
          child: LineChart(
            transformationConfig: zoomable ? const FlTransformationConfig(scaleAxis: FlScaleAxis.horizontal, maxScale: 12) : const FlTransformationConfig(),
            LineChartData(
              gridData: _grid(context),
              borderData: FlBorderData(show: false),
              extraLinesData: ExtraLinesData(horizontalLines: [if (crossesZero) HorizontalLine(y: 0, color: tokens.chartAxis, strokeWidth: 1)]),
              titlesData: _titles(
                context,
                left: (v) => Text(axis(v)),
                bottom: (v) => v.toInt() % labelEvery == 0 && v.toInt() < count ? Text(xLabel(v.toInt())) : const SizedBox.shrink(),
              ),
              lineTouchData: LineTouchData(
                touchTooltipData: LineTouchTooltipData(
                  getTooltipColor: (_) => tokens.chartTooltip,
                  getTooltipItems: (spots) {
                    final detail = spots.isEmpty ? null : tipDetail?.call(spots.first.spotIndex);
                    return [
                      for (final (n, s) in spots.indexed)
                        LineTooltipItem(
                          n == 0 && title(s.spotIndex) != null ? '${title(s.spotIndex)}\n' : '',
                          TextStyle(color: tokens.chartInk, fontWeight: FontWeight.w600, fontSize: 12),
                          children: [
                            TextSpan(text: '${lines[s.barIndex].name}  ${tip(s.y)}', style: TextStyle(color: lines[s.barIndex].color, fontSize: 12, fontWeight: FontWeight.w500)),
                            if (n == spots.length - 1 && detail != null && detail.isNotEmpty) TextSpan(text: '\n$detail', style: TextStyle(color: tokens.chartInk2, fontSize: 11, fontWeight: FontWeight.w400)),
                          ],
                        ),
                    ];
                  },
                ),
              ),
              lineBarsData: [
                for (final (i, line) in lines.indexed)
                  LineChartBarData(
                    spots: [for (final (x, y) in line.values.indexed) FlSpot(x.toDouble(), f.hidden ? 0 : y)],
                    isCurved: false,
                    isStepLineChart: step,
                    color: line.color,
                    barWidth: 2,
                    dotData: FlDotData(
                        show: line.values.length <= 14, getDotPainter: (_, __, ___, ____) => FlDotCirclePainter(radius: 3, color: line.color, strokeWidth: 1.5, strokeColor: tokens.chartSurface)),
                    belowBarData: BarAreaData(show: area && i == 0, color: line.color.withValues(alpha: 0.18)),
                  ),
              ],
            ),
          ),
        ),
        if (lines.length > 1) ChartLegend(items: [for (final l in lines) (color: l.color, label: l.name, line: true)]),
      ],
    );
  }
}

/// The running sum of several series at each position: the top edge of each band of a stacked area. Pure so it is tested without drawing.
List<List<double>> cumulativeSeries(List<List<double>> series) {
  final longest = series.fold<int>(0, (m, s) => s.length > m ? s.length : m);
  final sums = List<double>.filled(longest, 0);
  return [
    for (final s in series)
      [
        for (var i = 0; i < longest; i++) sums[i] += i < s.length ? s[i] : 0,
      ],
  ];
}

/// Several series stacked on top of each other, each band in its own color; the tooltip tells each series' own value, not the running sum.
class StackedAreaChart extends StatelessWidget {
  const StackedAreaChart({super.key, required this.months, required this.lines, required this.f, this.height = 240, this.currency});

  final List<String> months;
  final List<BalanceLine> lines;
  final Formatter f;
  final double height;
  final String? currency;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final step = labelStep(months.length);
    final stacked = cumulativeSeries([for (final l in lines) l.values]);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: height,
          child: LineChart(
        LineChartData(
          minY: 0,
          gridData: _grid(context),
          borderData: FlBorderData(show: false),
          titlesData: _titles(
            context,
            left: (v) => Text(f.compact(v, currency: currency)),
            bottom: (v) => v.toInt() % step == 0 && v.toInt() < months.length ? Text(f.monthLabel(months[v.toInt()], withYear: false)) : const SizedBox.shrink(),
          ),
          lineTouchData: LineTouchData(
            touchTooltipData: LineTouchTooltipData(
              getTooltipColor: (_) => tokens.chartTooltip,
              getTooltipItems: (spots) => [
                for (final (n, s) in spots.indexed)
                  LineTooltipItem(
                    n == 0 ? '${f.date(months[s.spotIndex], DateStyle.month)}\n' : '',
                    TextStyle(color: tokens.chartInk, fontWeight: FontWeight.w600, fontSize: 12),
                    children: [
                      TextSpan(
                          text: '${lines[s.barIndex].name}  ${f.money(lines[s.barIndex].values[s.spotIndex], currency: currency)}',
                          style: TextStyle(color: lines[s.barIndex].color, fontSize: 12, fontWeight: FontWeight.w500))
                    ],
                  ),
              ],
            ),
          ),
          lineBarsData: [
            for (final (i, line) in lines.indexed)
              LineChartBarData(
                spots: [for (final (x, y) in stacked[i].indexed) FlSpot(x.toDouble(), f.hidden ? 0 : y)],
                color: line.color,
                barWidth: 1.5,
                dotData: const FlDotData(show: false),
                belowBarData: BarAreaData(show: i == 0, color: line.color.withValues(alpha: 0.4)),
              ),
          ],
          betweenBarsData: [
            for (var i = 1; i < lines.length; i++) BetweenBarsData(fromIndex: i - 1, toIndex: i, color: lines[i].color.withValues(alpha: 0.4)),
          ],
        ),
      ),
        ),
        ChartLegend(items: [for (final l in lines) (color: l.color, label: l.name, line: false)]),
      ],
    );
  }
}

/// The savings rate of each month as columns (the expense color below zero) with the line of zero; a month without income (`null`) has
/// no column. [rates] are percentages. Port of `savingsRateOption` in libs/client/src/charts/builders.ts.
class SavingsRateChart extends StatelessWidget {
  const SavingsRateChart({super.key, required this.months, required this.rates, required this.f, required this.label, this.height = 200});

  final List<String> months;
  final List<double?> rates;
  final Formatter f;

  /// What the tooltip calls the figure ("Savings rate").
  final String label;
  final double height;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final step = labelStep(months.length);
    final known = rates.whereType<double>();
    final top = known.fold<double>(0, math.max);
    final bottom = known.fold<double>(0, math.min);
    return SizedBox(
      height: height,
      child: BarChart(
        BarChartData(
          minY: f.hidden || bottom == 0 ? 0 : bottom * 1.1,
          maxY: f.hidden || top == 0 ? 1 : top * 1.1,
          alignment: BarChartAlignment.spaceAround,
          gridData: _grid(context),
          borderData: FlBorderData(show: false),
          extraLinesData: ExtraLinesData(horizontalLines: [HorizontalLine(y: 0, color: tokens.chartAxis, strokeWidth: 1)]),
          titlesData: _titles(
            context,
            // privacy mode flattens every tick to 0 %, like the compact money axes
            left: (v) => Text(f.hidden ? '0%' : f.share(v)),
            bottom: (v) => v.toInt() % step == 0 && v.toInt() < months.length ? Text(f.monthLabel(months[v.toInt()], withYear: false)) : const SizedBox.shrink(),
          ),
          barTouchData: BarTouchData(
            touchTooltipData: BarTouchTooltipData(
              getTooltipColor: (_) => tokens.chartTooltip,
              getTooltipItem: (group, groupIndex, rod, rodIndex) {
                final v = rates[groupIndex];
                return BarTooltipItem(
                  '${f.date(months[groupIndex], DateStyle.month)}\n',
                  TextStyle(color: tokens.chartInk, fontWeight: FontWeight.w600, fontSize: 12),
                  children: [TextSpan(text: '$label  ${v == null ? '—' : f.share(v)}', style: TextStyle(color: tokens.moneySavings, fontWeight: FontWeight.w400))],
                );
              },
            ),
          ),
          barGroups: [
            for (final (i, v) in rates.indexed)
              BarChartGroupData(
                x: i,
                barRods: [
                  if (v != null)
                    BarChartRodData(
                      toY: f.hidden ? 0 : v,
                      color: v >= 0 ? tokens.moneySavings : tokens.moneyExpense,
                      width: months.length > 8 ? 12 : 18,
                      borderRadius: v >= 0 ? const BorderRadius.vertical(top: Radius.circular(4)) : const BorderRadius.vertical(bottom: Radius.circular(4)),
                    ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

/// One bar per category of a fixed list (the weekdays, the months of a year), all in one color. Tapping a bar calls [onBar].
class CategoryBarsChart extends StatelessWidget {
  const CategoryBarsChart({super.key, required this.labels, required this.values, required this.color, required this.f, required this.seriesName, this.currency, this.onBar, this.height = 200});

  final List<String> labels;
  final List<double> values;
  final Color color;
  final Formatter f;

  /// What the tooltip calls the bars ("Expenses").
  final String seriesName;
  final String? currency;
  final void Function(int index)? onBar;
  final double height;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final step = labelStep(labels.length, max: 8);
    final top = values.fold<double>(0, (m, v) => v > m ? v : m);
    return SizedBox(
      height: height,
      child: BarChart(
        BarChartData(
          maxY: top == 0 ? 1 : null,
          alignment: BarChartAlignment.spaceAround,
          gridData: _grid(context),
          borderData: FlBorderData(show: false),
          titlesData: _titles(context,
              left: (v) => Text(f.compact(v, currency: currency)), bottom: (v) => v.toInt() % step == 0 && v.toInt() < labels.length ? Text(labels[v.toInt()]) : const SizedBox.shrink()),
          barTouchData: BarTouchData(
            touchCallback: (event, response) {
              final spot = response?.spot;
              if (onBar != null && event is FlTapUpEvent && spot != null) onBar!(spot.touchedBarGroupIndex);
            },
            touchTooltipData: BarTouchTooltipData(
              getTooltipColor: (_) => tokens.chartTooltip,
              getTooltipItem: (group, groupIndex, rod, rodIndex) => BarTooltipItem(
                '${labels[groupIndex]}\n',
                TextStyle(color: tokens.chartInk, fontWeight: FontWeight.w600, fontSize: 12),
                children: [TextSpan(text: '$seriesName  ${f.money(values[groupIndex], currency: currency)}', style: TextStyle(color: color, fontWeight: FontWeight.w400))],
              ),
            ),
          ),
          barGroups: [
            for (final (i, v) in values.indexed)
              BarChartGroupData(
                  x: i, barRods: [BarChartRodData(toY: f.hidden ? 0 : v, color: color, width: labels.length > 8 ? 10 : 18, borderRadius: const BorderRadius.vertical(top: Radius.circular(3)))]),
          ],
        ),
      ),
    );
  }
}

/// A tiny trend line with no axes.
class SparkLine extends StatelessWidget {
  const SparkLine({super.key, required this.values, required this.color});

  final List<double> values;
  final Color color;

  @override
  Widget build(BuildContext context) {
    if (values.length < 2) return const SizedBox.shrink();
    return LineChart(
      LineChartData(
        gridData: const FlGridData(show: false),
        borderData: FlBorderData(show: false),
        titlesData: const FlTitlesData(show: false),
        lineTouchData: const LineTouchData(enabled: false),
        lineBarsData: [
          LineChartBarData(
            spots: [for (final (i, v) in values.indexed) FlSpot(i.toDouble(), v)],
            isCurved: true,
            color: color,
            barWidth: 2,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(show: true, color: color.withValues(alpha: 0.15)),
          ),
        ],
      ),
    );
  }
}
