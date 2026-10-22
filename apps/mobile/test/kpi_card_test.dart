import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/ui/kpi_card.dart';

import 'fixtures.dart';
import 'support.dart';

void main() {
  setUpAll(initFormats);

  testWidgets('the dashboard KPI cards end right under their last line, with no empty space', (tester) async {
    tester.view.physicalSize = const Size(1080, 4200);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final env = TestEnv(
      config: signedInConfig,
      adapter: fakeServer({'/api/meta': metaJson(), '/api/lookups': lookupsJson(), '/api/reports/dashboard': report(dashboardJson()), '/api/reports/accounts': report(accountsJson())}),
    );
    await env.pumpApp(tester);
    await tester.pumpAndSettle();

    final cards = find.byType(KpiCard);
    expect(cards, findsNWidgets(5));
    for (final card in cards.evaluate()) {
      final rect = tester.getRect(find.byWidget(card.widget));
      final lastLine = find.descendant(of: find.byWidget(card.widget), matching: find.byType(Text)).evaluate().map((t) => tester.getRect(find.byWidget(t.widget)).bottom).reduce((a, b) => a > b ? a : b);
      expect(rect.bottom - lastLine, 12, reason: 'only the 12 px of padding under ${(card.widget as KpiCard).label}');
    }
  });
}
