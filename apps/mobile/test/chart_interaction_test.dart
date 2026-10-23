import 'package:flutter/gestures.dart' show kLongPressTimeout;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/features/accounts/accounts_vm.dart' show BalanceLine;
import 'package:spacefly_mobile/format/formatter.dart';
import 'package:spacefly_mobile/format/formatter_provider.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';
import 'package:spacefly_mobile/theme/app_theme.dart';
import 'package:spacefly_mobile/theme/tokens.g.dart';
import 'package:spacefly_mobile/ui/charts.dart';
import 'package:spacefly_mobile/ui/charts/heatmap.dart';
import 'package:spacefly_mobile/ui/charts/sankey.dart';
import 'package:spacefly_mobile/ui/charts/tip.dart';
import 'package:spacefly_mobile/ui/threshold_slider.dart';

import 'fixtures.dart';
import 'support.dart';

void main() {
  setUpAll(initFormats);
  setUp(() => LocaleSettings.setLocaleSync(AppLocale.en));

  group('tipPosition', () {
    const area = Size(300, 200);
    const tip = Size(100, 40);

    test('centers the tip above the touch', () {
      expect(tipPosition(const Offset(150, 120), tip, area), const Offset(100, 66));
    });

    test('keeps it inside the sides', () {
      expect(tipPosition(const Offset(5, 120), tip, area).dx, 0);
      expect(tipPosition(const Offset(295, 120), tip, area).dx, 200);
    });

    test('goes under the touch when there is no room above', () {
      expect(tipPosition(const Offset(150, 20), tip, area), const Offset(100, 34));
    });
  });

  Future<void> pump(WidgetTester tester, Widget Function(Formatter f) chart, {double width = 360, bool hidden = false}) async {
    final env = TestEnv(config: signedInConfig, adapter: fakeServer({'/api/meta': metaJson()}));
    final c = env.container();
    addTearDown(() => tester.pumpWidget(const SizedBox()));
    await tester.pumpWidget(UncontrolledProviderScope(
      container: c,
      child: TranslationProvider(
        child: MaterialApp(
          theme: buildTheme(defaultThemeId),
          home: Scaffold(
            body: Center(
              child: SizedBox(width: width, child: Consumer(builder: (_, ref, __) => chart(ref.watch(formatterProvider)))),
            ),
          ),
        ),
      ),
    ));
    await tester.pumpAndSettle();
  }

  Future<TestGesture> hold(WidgetTester tester, Offset at) async {
    final gesture = await tester.startGesture(at);
    await tester.pump(kLongPressTimeout + const Duration(milliseconds: 100));
    return gesture;
  }

  group('heatmap', () {
    const cells = [HeatCell(row: 0, col: 0, value: 5), HeatCell(row: 0, col: 1, value: 0), HeatCell(row: 1, col: 1, value: 10)];

    testWidgets('shows the tip of the cell a finger is held on, until it is let go', (tester) async {
      await pump(tester, (f) => HeatmapGrid(key: const Key('grid'), rows: 2, cols: 2, cells: cells, max: 10, cellHeight: 40, cellTip: (i) => 'cell $i'));
      final origin = tester.getTopLeft(find.byKey(const Key('grid')));
      final gesture = await hold(tester, origin + const Offset(250, 60));
      expect(find.byKey(const Key('chart-tip')), findsOneWidget);
      expect(find.text('cell 2'), findsOneWidget);
      await gesture.moveTo(origin + const Offset(20, 20));
      await tester.pump();
      expect(find.text('cell 0'), findsOneWidget);
      await gesture.up();
      await tester.pump();
      expect(find.byKey(const Key('chart-tip')), findsNothing);
    });

    testWidgets('a tap still reports the cell, and a cell with no data shows no tip', (tester) async {
      final tapped = <int>[];
      await pump(tester, (f) => HeatmapGrid(key: const Key('grid'), rows: 2, cols: 2, cells: cells, max: 10, cellHeight: 40, onCell: tapped.add, cellTip: (i) => 'cell $i'));
      final origin = tester.getTopLeft(find.byKey(const Key('grid')));
      await tester.tapAt(origin + const Offset(250, 60));
      expect(tapped, [2]);
      final gesture = await hold(tester, origin + const Offset(20, 60)); // row 1, col 0: not a cell
      expect(find.byKey(const Key('chart-tip')), findsNothing);
      await gesture.up();
    });
  });

  group('sankey', () {
    const nodes = [
      SankeyChartNode(id: 'a', label: 'Salary', value: 100, color: Colors.green),
      SankeyChartNode(id: 'b', label: 'Rent', value: 60, color: Colors.red),
      SankeyChartNode(id: 'c', label: 'Savings', value: 40, color: Colors.blue),
    ];
    const links = [SankeyChartLink('a', 'b', 60), SankeyChartLink('a', 'c', 40)];

    testWidgets('holding a node shows its tip; holding a band shows the tip of the flow', (tester) async {
      await pump(
        tester,
        (f) => SankeyChart(nodes: nodes, links: links, onNode: (_) {}, nodeTip: (n) => '${n.label} ${n.value}', linkTip: (a, b, v) => '${a.label} → ${b.label} $v'),
        width: 300,
      );
      final box = tester.getTopLeft(find.byKey(const Key('sankey')));
      // The node of "Salary" is the one in the first layer: find where it is from the same layout the chart uses.
      final layout = sankeyLayout(nodes: [for (final n in nodes) SankeyInNode(n.id, n.value)], links: [for (final l in links) SankeyInLink(l.source, l.target, l.value)], breadth: 300 - 16, length: 420 - 120 - 8);
      final salary = layout.nodes.firstWhere((n) => n.id == 'a');
      var gesture = await hold(tester, box + Offset(8 + (salary.b0 + salary.b1) / 2, 8 + (salary.l0 + salary.l1) / 2));
      expect(find.text('Salary 100.0'), findsOneWidget);
      await gesture.up();
      await tester.pump();
      expect(find.byKey(const Key('chart-tip')), findsNothing);

      final band = SankeyLayout.bandPoint(layout.links[0], 0.5);
      gesture = await hold(tester, box + Offset(8 + band.dx, 8 + band.dy));
      expect(find.textContaining('→'), findsOneWidget);
      await gesture.up();
    });
  });

  group('income and expenses', () {
    testWidgets('names its three series under the chart', (tester) async {
      await pump(
        tester,
        (f) => IncomeExpenseChart(
          months: const [(month: '2026-08', income: 100, expense: 40, net: 60), (month: '2026-09', income: 50, expense: 80, net: -30)],
          f: f,
          incomeLabel: 'Income',
          expenseLabel: 'Expenses',
          netLabel: 'Net',
          onMonth: (_) {},
        ),
      );
      final legend = find.byKey(const Key('chart-legend'));
      for (final label in ['Income', 'Expenses', 'Net']) {
        expect(find.descendant(of: legend, matching: find.text(label)), findsOneWidget, reason: label);
      }
    });
  });

  group('lines', () {
    const one = [BalanceLine(id: 'a', name: 'Banco', values: [1, 2, 3], color: Colors.green)];
    const two = [...one, BalanceLine(id: 'b', name: 'Ahorros', values: [3, 2, 1], color: Colors.blue)];

    testWidgets('a legend names the lines when there are several', (tester) async {
      await pump(tester, (f) => LinesChart(months: const ['2026-07', '2026-08', '2026-09'], lines: two, f: f));
      expect(find.descendant(of: find.byKey(const Key('chart-legend')), matching: find.text('Ahorros')), findsOneWidget);
    });

    testWidgets('a single line has none', (tester) async {
      await pump(tester, (f) => LinesChart(months: const ['2026-07', '2026-08', '2026-09'], lines: one, f: f));
      expect(find.byKey(const Key('chart-legend')), findsNothing);
    });
  });

  group('savings rate', () {
    testWidgets('draws the months that have a rate and leaves the others empty', (tester) async {
      await pump(tester, (f) => SavingsRateChart(months: const ['2026-07', '2026-08', '2026-09'], rates: const [null, 40, -10], f: f, label: 'Savings rate'));
      expect(tester.takeException(), isNull);
      expect(find.byType(SavingsRateChart), findsOneWidget);
    });
  });

  group('threshold slider', () {
    testWidgets('follows the finger and reports the value when it is let go', (tester) async {
      final reported = <double>[];
      await pump(tester, (f) => ThresholdSlider(f: f, value: 0.025, onChanged: reported.add));
      expect(find.text('2.5%'), findsOneWidget);

      final slider = find.byKey(const Key('threshold-slider'));
      final box = tester.getRect(slider);
      await tester.drag(slider, Offset(box.width, 0)); // to the right end: 10 %
      await tester.pumpAndSettle();
      expect(reported, [0.1]);
      expect(find.byKey(const Key('threshold-value')), findsOneWidget);
      expect(tester.widget<Text>(find.byKey(const Key('threshold-value'))).data, '10.0%');
    });

    testWidgets('a value from the server outside the range is held at the end', (tester) async {
      await pump(tester, (f) => ThresholdSlider(f: f, value: 0.5, onChanged: (_) {}));
      expect(tester.widget<Text>(find.byKey(const Key('threshold-value'))).data, '10.0%');
    });
  });
}
