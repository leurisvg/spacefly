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
        getTitlesWidget: (value, meta) => value == meta.max || value == meta.min && value != 0 ? const SizedBox.shrink() : SideTitleWidget(meta: meta, space: 4, child: DefaultTextStyle(style: style, child: left(value))),
      ),
    ),
    bottomTitles: AxisTitles(
      sideTitles: SideTitles(
        showTitles: bottom != null,
        reservedSize: 22,
        interval: 1,
        getTitlesWidget: (value, meta) => value != value.roundToDouble() ? const SizedBox.shrink() : SideTitleWidget(meta: meta, space: 6, child: DefaultTextStyle(style: style, child: bottom!(value))),
      ),
    ),
  );
}

FlGridData _grid(BuildContext context) => FlGridData(
      show: true,
      drawVerticalLine: false,
      getDrawingHorizontalLine: (_) => FlLine(color: context.tokens.chartGrid, strokeWidth: 1),
    );

/// Income and expenses side by side per month. Tapping a month calls [onMonth]; the tooltip shows the net too.
class IncomeExpenseChart extends StatelessWidget {
  const IncomeExpenseChart({super.key, required this.months, required this.f, required this.incomeLabel, required this.expenseLabel, required this.netLabel, required this.onMonth});

  final List<({String month, double income, double expense, double net})> months;
  final Formatter f;
  final String incomeLabel;
  final String expenseLabel;
  final String netLabel;
  final void Function(int index) onMonth;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final step = labelStep(months.length);
    final top = months.fold<double>(0, (m, x) => [m, x.income, x.expense].reduce((a, b) => a > b ? a : b));
    return SizedBox(
      height: 220,
      child: BarChart(
        BarChartData(
          maxY: top == 0 ? 1 : null,
          alignment: BarChartAlignment.spaceAround,
          gridData: _grid(context),
          borderData: FlBorderData(show: false),
          titlesData: _titles(
            context,
            left: (v) => Text(f.compact(v)),
            bottom: (v) => v.toInt() % step == 0 && v.toInt() < months.length ? Text(f.monthLabel(months[v.toInt()].month, withYear: false)) : const SizedBox.shrink(),
          ),
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
                    TextSpan(text: '$incomeLabel  ${f.money(m.income)}\n', style: TextStyle(color: tokens.moneyIncome, fontWeight: FontWeight.w400)),
                    TextSpan(text: '$expenseLabel  ${f.money(-m.expense)}\n', style: TextStyle(color: tokens.moneyExpense, fontWeight: FontWeight.w400)),
                    TextSpan(text: '$netLabel  ${f.money(m.net, signed: true)}', style: TextStyle(color: tokens.moneyNet, fontWeight: FontWeight.w400)),
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
                for (final s in slices) PieChartSectionData(value: total == 0 ? 1 : s.value, color: s.color, radius: 22, showTitle: false, borderSide: BorderSide(color: tokens.chartSurface, width: 2)),
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
/// gives its own texts (days of a month…); [yFormat] writes the y axis and tooltip values (percentages), [tipTitle] adds a heading
/// to the tooltip.
class LinesChart extends StatelessWidget {
  const LinesChart({super.key, required this.months, required this.lines, required this.f, this.area = false, this.height = 200, this.labels, this.yFormat, this.tipTitle});

  final List<String> months;
  final List<BalanceLine> lines;
  final Formatter f;
  final bool area;
  final double height;
  final List<String>? labels;
  final String Function(double value)? yFormat;
  final String Function(int index)? tipTitle;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final count = labels?.length ?? months.length;
    final step = labelStep(count);
    final axis = yFormat ?? (double v) => f.compact(v);
    final tip = yFormat ?? (double v) => f.money(v);
    String xLabel(int i) => labels != null ? labels![i] : f.monthLabel(months[i], withYear: false);
    return SizedBox(
      height: height,
      child: LineChart(
        LineChartData(
          gridData: _grid(context),
          borderData: FlBorderData(show: false),
          titlesData: _titles(
            context,
            left: (v) => Text(axis(v)),
            bottom: (v) => v.toInt() % step == 0 && v.toInt() < count ? Text(xLabel(v.toInt())) : const SizedBox.shrink(),
          ),
          lineTouchData: LineTouchData(
            touchTooltipData: LineTouchTooltipData(
              getTooltipColor: (_) => tokens.chartTooltip,
              getTooltipItems: (spots) => [
                for (final (n, s) in spots.indexed)
                  LineTooltipItem(
                    n == 0 && tipTitle != null ? '${tipTitle!(s.spotIndex)}\n' : '',
                    TextStyle(color: tokens.chartInk, fontWeight: FontWeight.w600, fontSize: 12),
                    children: [TextSpan(text: '${lines[s.barIndex].name}  ${tip(s.y)}', style: TextStyle(color: lines[s.barIndex].color, fontSize: 12, fontWeight: FontWeight.w500))],
                  ),
              ],
            ),
          ),
          lineBarsData: [
            for (final (i, line) in lines.indexed)
              LineChartBarData(
                spots: [for (final (x, y) in line.values.indexed) FlSpot(x.toDouble(), f.hidden ? 0 : y)],
                isCurved: false,
                color: line.color,
                barWidth: 2,
                dotData: FlDotData(show: line.values.length <= 14, getDotPainter: (_, __, ___, ____) => FlDotCirclePainter(radius: 3, color: line.color, strokeWidth: 1.5, strokeColor: tokens.chartSurface)),
                belowBarData: BarAreaData(show: area && i == 0, color: line.color.withValues(alpha: 0.18)),
              ),
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
