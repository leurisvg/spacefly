import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';
import 'package:spacefly_mobile/state/privacy_store.dart';
import 'package:spacefly_mobile/theme/app_theme.dart';
import 'package:spacefly_mobile/theme/tokens.g.dart';
import 'package:spacefly_mobile/ui/chart_card.dart';
import 'package:spacefly_mobile/ui_logic/text_table.dart';

import 'fixtures.dart';
import 'support.dart';

void main() {
  setUpAll(initFormats);
  setUp(() => LocaleSettings.setLocaleSync(AppLocale.en));

  const table = TextTable(columns: ['Category', 'Amount'], rows: [
    ['Food', 'RD\$40.00'],
    ['Eating "out", mostly', 'RD\$5.00'],
  ]);

  group('TextTable', () {
    test('writes a CSV with a BOM, quoting what holds a separator or a quote', () {
      expect(table.toCsv(), '﻿Category,Amount\nFood,RD\$40.00\n"Eating ""out"", mostly",RD\$5.00');
    });

    test('right-aligns every column but the first unless it says which are numbers', () {
      expect([0, 1, 2].map(table.isNumeric), [false, true, true]);
      const flow = TextTable(columns: ['From', 'To', 'Amount', 'Share'], rows: [], numeric: [2, 3]);
      expect([0, 1, 2, 3].map(flow.isNumeric), [false, false, true, true]);
    });
  });

  group('ChartCard', () {
    late TestEnv env;
    late ProviderContainer container;

    Future<void> pump(WidgetTester tester, {TextTable? tbl = table}) async {
      env = TestEnv(config: signedInConfig, adapter: fakeServer({'/api/meta': metaJson()}));
      container = env.container();
      addTearDown(() => tester.pumpWidget(const SizedBox()));
      await tester.pumpWidget(UncontrolledProviderScope(
        container: container,
        child: TranslationProvider(
          child: MaterialApp(
            theme: buildTheme(defaultThemeId),
            home: Scaffold(body: ChartCard(title: 'Top', fileName: 'top', table: tbl, child: const Text('the chart'))),
          ),
        ),
      ));
      await tester.pumpAndSettle();
    }

    testWidgets('swaps the chart for its table and back', (tester) async {
      await pump(tester);
      expect(find.text('the chart'), findsOneWidget);
      expect(find.byKey(const Key('chart-table-top')), findsNothing);

      await tester.tap(find.byKey(const Key('chart-toggle-top')));
      await tester.pumpAndSettle();
      expect(find.text('the chart'), findsNothing);
      expect(find.byKey(const Key('chart-table-top')), findsOneWidget);
      expect(find.text('Category'), findsOneWidget);
      expect(find.text('RD\$40.00'), findsOneWidget);
      expect(find.byTooltip('Show chart'), findsOneWidget);

      await tester.tap(find.byKey(const Key('chart-toggle-top')));
      await tester.pumpAndSettle();
      expect(find.text('the chart'), findsOneWidget);
    });

    testWidgets('shares the table as a CSV file', (tester) async {
      await pump(tester);
      await tester.tap(find.byKey(const Key('chart-share-top')));
      await tester.pumpAndSettle();
      final shared = env.share.shared.single;
      expect(shared.fileName, 'spacefly-top.csv');
      expect(shared.text, table.toCsv());
    });

    testWidgets('does not share while amounts are hidden', (tester) async {
      await pump(tester);
      container.read(privacyProvider.notifier).toggle();
      await tester.pumpAndSettle();
      expect(tester.widget<IconButton>(find.byKey(const Key('chart-share-top'))).onPressed, isNull);
      expect(find.byTooltip('Export is disabled while amounts are hidden'), findsOneWidget);
      expect(env.share.shared, isEmpty);
    });

    testWidgets('says so when the share sheet fails', (tester) async {
      await pump(tester);
      env.share.fail = true;
      await tester.tap(find.byKey(const Key('chart-share-top')));
      await tester.pumpAndSettle();
      expect(env.toast.messages.single.kind, 'error');
    });

    testWidgets('without a table it is just the chart', (tester) async {
      await pump(tester, tbl: null);
      expect(find.text('the chart'), findsOneWidget);
      expect(find.byKey(const Key('chart-toggle-top')), findsNothing);
      expect(find.byKey(const Key('chart-share-top')), findsNothing);
    });
  });
}
