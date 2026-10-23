import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';
import 'package:spacefly_mobile/ui/common.dart';

import 'fixtures.dart';
import 'support.dart';

void main() {
  setUpAll(initFormats);
  setUp(() => LocaleSettings.setLocaleSync(AppLocale.en));

  void tallScreen(WidgetTester tester) {
    tester.view.physicalSize = const Size(1080, 4200);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);
  }

  ({FakeAdapter adapter, List<RequestOptions> writes}) server({List<Map<String, Object?>>? rows}) {
    final writes = <RequestOptions>[];
    final list = rows ??
        [
          txJson(id: '1', groupId: '11', description: 'Supermercado'),
          txJson(id: '2', groupId: '12', description: 'Compra dividida', splitCount: 2),
        ];
    final adapter = FakeAdapter((o) {
      if (o.method != 'GET') writes.add(o);
      return switch ('${o.method} ${o.path}') {
        'GET /api/meta' => jsonBody(metaJson()),
        'GET /api/lookups' => jsonBody(lookupsJson()),
        'GET /api/reports/dashboard' => jsonBody(report(dashboardJson())),
        'GET /api/transactions' => jsonBody(report({'rows': list, 'totals': {'income': 0, 'expense': 100, 'transfer': 0}})),
        'DELETE /api/transactions/11' => ResponseBody.fromString('', 204),
        'DELETE /api/transactions/12' => ResponseBody.fromString('', 204),
        'POST /api/refresh' => ResponseBody.fromString('', 204),
        _ => jsonBody({'error': 'not_found'}, 404),
      };
    });
    return (adapter: adapter, writes: writes);
  }

  Future<(TestEnv, List<RequestOptions>)> open(WidgetTester tester, {List<Map<String, Object?>>? rows}) async {
    tallScreen(tester);
    final s = server(rows: rows);
    final env = TestEnv(config: signedInConfig, adapter: s.adapter);
    await env.pumpApp(tester);
    await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text('Transactions')));
    await tester.pumpAndSettle();
    return (env, s.writes);
  }

  group('CSV export', () {
    testWidgets('hands the list to the share sheet as a file named after the period', (tester) async {
      final (env, _) = await open(tester);
      await tester.tap(find.byKey(const Key('export-csv')));
      await tester.pumpAndSettle();
      final shared = env.share.shared.single;
      expect(shared.fileName, 'spacefly-2026-09-01_2026-09-30.csv');
      expect(shared.text.startsWith('﻿'), isTrue);
      expect(shared.text, contains('Supermercado'));
      expect(shared.text, contains('Compra dividida'));
    });

    testWidgets('is off while amounts are hidden', (tester) async {
      final (env, _) = await open(tester);
      await tester.tap(find.byType(PrivacyButton));
      await tester.pumpAndSettle();
      expect(tester.widget<IconButton>(find.byKey(const Key('export-csv'))).onPressed, isNull);
      expect(find.byTooltip('Export is disabled while amounts are hidden'), findsOneWidget);
      expect(env.share.shared, isEmpty);
    });

    testWidgets('is off when there is nothing to export', (tester) async {
      await open(tester, rows: []);
      expect(tester.widget<IconButton>(find.byKey(const Key('export-csv'))).onPressed, isNull);
    });

    testWidgets('says so when the share sheet fails', (tester) async {
      final (env, _) = await open(tester);
      env.share.fail = true;
      await tester.tap(find.byKey(const Key('export-csv')));
      await tester.pumpAndSettle();
      expect(env.toast.messages.single.kind, 'error');
    });
  });

  group('delete from the list', () {
    testWidgets('swiping a record asks first, and does nothing when declined', (tester) async {
      final (env, writes) = await open(tester);
      env.confirm.answer = false;
      await tester.drag(find.text('Supermercado'), const Offset(-500, 0));
      await tester.pumpAndSettle();
      expect(env.confirm.asked.single.destructive, isTrue);
      expect(env.confirm.asked.single.message, contains('Supermercado'));
      expect(writes, isEmpty);
      expect(find.text('Supermercado'), findsOneWidget);
    });

    testWidgets('confirming deletes it and fetches the list again, staying on the list', (tester) async {
      final (env, writes) = await open(tester);
      final before = env.adapter!.requests.where((r) => r.path == '/api/transactions').length;
      await tester.drag(find.text('Supermercado'), const Offset(-500, 0));
      await tester.pumpAndSettle();
      // the delete and the refetch that follows are real async work: give them a second
      await tester.pump(const Duration(seconds: 1));
      await tester.pumpAndSettle();
      expect(writes.where((w) => w.method == 'DELETE').single.path, '/api/transactions/11');
      expect(env.toast.messages.single.message, 'Transaction deleted');
      expect(env.back.fallbacks, isEmpty, reason: 'it was deleted from the list: nowhere to go back to');
      expect(env.adapter!.requests.where((r) => r.path == '/api/transactions').length, greaterThan(before));
      expect(find.byKey(const Key('transactions')), findsOneWidget);
    });

    testWidgets('a record of several parts is swiped away too, with the question about its parts', (tester) async {
      final (env, writes) = await open(tester);
      await tester.drag(find.text('Compra dividida'), const Offset(-500, 0));
      await tester.pumpAndSettle();
      await tester.pump(const Duration(seconds: 1));
      await tester.pumpAndSettle();
      expect(env.confirm.asked.single.message, contains('several parts'));
      expect(writes.where((w) => w.method == 'DELETE').single.path, '/api/transactions/12');
    });
  });

  group('row menu', () {
    testWidgets('a record SpaceFly edits offers edit, open in Firefly and delete', (tester) async {
      final (env, _) = await open(tester);
      await tester.longPress(find.text('Supermercado'));
      await tester.pumpAndSettle();
      expect(find.text('Actions'), findsOneWidget);
      expect(find.byKey(const Key('row-menu-edit')), findsOneWidget);
      expect(find.byKey(const Key('row-menu-edit-firefly')), findsNothing);
      expect(find.byKey(const Key('row-menu-open-firefly')), findsOneWidget);
      expect(find.byKey(const Key('row-menu-delete')), findsOneWidget);

      await tester.tap(find.byKey(const Key('row-menu-edit')));
      await tester.pumpAndSettle();
      expect(find.text('Edit transaction'), findsWidgets);
      expect(env.confirm.asked, isEmpty);
    });

    testWidgets('a record of several parts is edited in Firefly instead', (tester) async {
      await open(tester);
      await tester.longPress(find.text('Compra dividida'));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('row-menu-edit')), findsNothing);
      expect(find.byKey(const Key('row-menu-edit-firefly')), findsOneWidget);
      expect(find.byKey(const Key('row-menu-open-firefly')), findsOneWidget);
      expect(find.byKey(const Key('row-menu-delete')), findsOneWidget);
    });

    testWidgets('deleting from the menu asks first, and stays on the list', (tester) async {
      final (env, writes) = await open(tester);
      env.confirm.answer = false;
      await tester.longPress(find.text('Supermercado'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('row-menu-delete')));
      await tester.pumpAndSettle();
      expect(env.confirm.asked.single.message, contains('Supermercado'));
      expect(writes, isEmpty);

      env.confirm.answer = true;
      await tester.longPress(find.text('Supermercado'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('row-menu-delete')));
      await tester.pumpAndSettle();
      await tester.pump(const Duration(seconds: 1));
      await tester.pumpAndSettle();
      expect(writes.where((w) => w.method == 'DELETE').single.path, '/api/transactions/11');
      expect(env.back.fallbacks, isEmpty);
      expect(find.byKey(const Key('transactions')), findsOneWidget);
    });
  });
}
