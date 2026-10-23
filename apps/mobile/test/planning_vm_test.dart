import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/api/models.g.dart' hide Period, PeriodPreset, Ref;
import 'package:spacefly_mobile/features/planning/bills_vm.dart';
import 'package:spacefly_mobile/features/planning/goals_vm.dart';
import 'package:spacefly_mobile/features/planning/projection_vm.dart';
import 'package:spacefly_mobile/features/planning/recurring_vm.dart';
import 'package:spacefly_mobile/features/transactions/explorer_vm.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';
import 'package:spacefly_mobile/state/tx_detail.dart';

import 'fixtures.dart';
import 'support.dart';

void main() {
  setUpAll(initFormats);
  setUp(() => LocaleSettings.setLocaleSync(AppLocale.en));

  Map<String, Object> routes() => {
        '/api/meta': metaJson(),
        '/api/lookups': lookupsJson(),
        '/api/reports/bills': report(billsJson()),
        '/api/reports/recurrences': report(recurrencesJson()),
        '/api/reports/piggy-banks': report(piggyBanksJson()),
        '/api/reports/projection': report(projectionJson()),
      };

  (TestEnv, ProviderContainer) container() {
    final env = TestEnv(config: signedInConfig, adapter: fakeServer(routes()));
    return (env, env.container());
  }

  Map<String, dynamic> lastQuery(TestEnv env, String path) => env.adapter!.requests.lastWhere((r) => r.path == path).queryParameters;

  group('bills', () {
    BillRow bill(String id, {bool active = true, double yearly = 120, String status = 'pending'}) => BillRow.fromJson(billJson(id, active: active, yearly: yearly, status: status));

    test('tones the status of a subscription', () {
      expect([billStatusTone(Status.PAID), billStatusTone(Status.PENDING), billStatusTone(Status.NOT_EXPECTED)], [BillTone.good, BillTone.warning, BillTone.muted]);
    });

    test('ranks the active subscriptions that cost something by what they cost a year', () {
      final ranked = rankedBills([bill('a', yearly: 50), bill('b', yearly: 500), bill('c', active: false, yearly: 900), bill('d', yearly: 0)]);
      expect(ranked.map((b) => b.id), ['b', 'a']);
    });

    test('looks at the last twelve months up to a date', () {
      final p = lastTwelveMonths('2026-09-15');
      expect((p.start, p.end), ('2025-09-16', '2026-09-15'));
    });

    test('is not tied to the period: the report asks for it as the user has it', () async {
      final (env, c) = container();
      c.listen(billsViewModelProvider, (_, __) {});
      await c.read(billsReportProvider.future);
      expect(lastQuery(env, '/api/reports/bills')['start'], '2026-09-01');
    });

    test('ranks, tables, and opens a subscription or a bar over the last 12 months with the period to switch to', () async {
      final (_, c) = container();
      c.listen(billsViewModelProvider, (_, __) {});
      await c.read(billsReportProvider.future);
      final vm = c.read(billsViewModelProvider);
      expect(vm.active.map((b) => b.name), ['Seguro', 'Netflix']);
      expect(vm.table.rows.first, ['Seguro', 'RD\$50.00', 'RD\$600.00']);
      expect(vm.frequency(vm.r!.bills[1]), 'Quarterly');
      expect(vm.statusLabel(vm.r!.bills[2]), 'Not due');
      vm.open(vm.r!.bills.first);
      expect(c.read(txDetailProvider)!.filter, {'bill': '1'});
      expect(vm.openBar(1), isTrue);
      final req = c.read(txDetailProvider)!;
      expect(req.title, 'Netflix');
      expect(req.filter, {'bill': '1', 'start': '2025-09-16', 'end': '2026-09-15'});
      expect(req.ranges!.map((r) => r.label), ['Last 12 months', 'Selected period']);
      expect((req.ranges![1].start, req.ranges![1].end), ('2026-09-01', '2026-09-30'));
      expect(vm.openBar(7), isFalse);
      expect((vm.createRoute, vm.editRoute(vm.r!.bills.first)), ('/edit/bill', '/edit/bill/1'));
    });
  });

  group('recurring', () {
    test('signs what a recurrence moves', () {
      RecurrenceRow row(String type) => RecurrenceRow.fromJson({...(recurrencesJson()['recurrences'] as List).first as Map<String, Object?>, 'type': type, 'amount': 10});
      expect([recurrenceAmount(row('deposit')), recurrenceAmount(row('withdrawal')), recurrenceAmount(row('transfer'))], [10, -10, 10]);
      expect([recurrenceTone('deposit'), recurrenceTone('withdrawal'), recurrenceTone('transfer')], [RecurrenceTone.income, RecurrenceTone.expense, RecurrenceTone.none]);
    });

    test('asks for the recurrences without the period', () async {
      final (env, c) = container();
      c.listen(recurrencesViewModelProvider, (_, __) {});
      await c.read(recurrencesReportProvider.future);
      final q = lastQuery(env, '/api/reports/recurrences');
      expect(q.containsKey('start'), isFalse);
      expect(q['currency'], 'DOP');
      final vm = c.read(recurrencesViewModelProvider);
      expect(vm.items, hasLength(3));
      expect([for (final x in vm.items) vm.typeLabel(x)], ['Income', 'Expense', 'Transfer']);
    });
  });

  group('goals', () {
    test('measures the progress of a goal, nothing in privacy mode', () {
      expect(goalProgress(0.4, hidden: false), 40);
      expect(goalProgress(null, hidden: false), 0);
      expect(goalProgress(1.5, hidden: false), 100);
      expect(goalProgress(0.4, hidden: true), 0);
    });

    test('says whether a goal is on track, when it has a date to be on track for', () {
      final goals = PiggyBanksReport.fromJson(piggyBanksJson()).piggyBanks;
      expect(goalTone(goals[0]), GoalTone.warning);
      expect(goalTone(goals[1]), isNull);
    });

    test('asks for the goals without the period and edits them through the editor routes', () async {
      final (env, c) = container();
      c.listen(goalsViewModelProvider, (_, __) {});
      await c.read(goalsReportProvider.future);
      expect(lastQuery(env, '/api/reports/piggy-banks').containsKey('start'), isFalse);
      final vm = c.read(goalsViewModelProvider);
      expect(vm.items, hasLength(2));
      expect(vm.progress(vm.items.first), 40);
      expect((vm.createRoute, vm.editRoute(vm.items.first)), ('/edit/piggy', '/edit/piggy/p1'));
    });
  });

  group('projection', () {
    test('offers four horizons and falls back to 90 days', () {
      expect([resolveProjectionDays('30'), resolveProjectionDays('180'), resolveProjectionDays('7'), resolveProjectionDays(null)], ['30', '180', '90', '90']);
    });

    test('lists what happens on a day', () {
      final events = ProjectionReport.fromJson(projectionJson()).events;
      expect(eventsOn(events, '2026-09-16').map((e) => e.name), ['Luz']);
      expect(eventsOn(events, '2026-09-30'), isEmpty);
    });

    test('asks for 90 days by default, follows the horizon and words the lowest point', () async {
      final (env, c) = container();
      c.listen(projectionViewModelProvider, (_, __) {});
      await c.read(projectionReportProvider.future);
      var q = lastQuery(env, '/api/reports/projection');
      expect((q['days'], q.containsKey('start')), ('90', false));
      var vm = c.read(projectionViewModelProvider);
      expect(vm.lowestLabel, 'Lowest point: RD\$950.00 on September 16, 2026');
      expect(vm.table!.rows, [['Wed, Sep 16', 'RD\$0.00', 'RD\$50.00', 'RD\$950.00'], ['Thu, Sep 17', 'RD\$900.00', 'RD\$0.00', 'RD\$1,850.00']]);
      expect(vm.eventsTip(0), isNull, reason: 'nothing happens on the first day');
      expect(vm.eventsTip(1), 'Luz  −RD\$50.00');
      expect(vm.eventsTip(2), 'Sueldo  +RD\$900.00');
      expect(vm.eventsTip(9), isNull);
      vm.setDays('180');
      await c.read(projectionReportProvider.future);
      q = lastQuery(env, '/api/reports/projection');
      expect(q['days'], '180');
      vm = c.read(projectionViewModelProvider);
      expect(vm.days, '180');
    });
  });

  group('csv', () {
    TxRow tx({String description = 'Supermercado', String type = 'withdrawal', double amount = 100}) => TxRow.fromJson(txJson(description: description, type: type, amount: amount));

    test('exports a CSV with BOM, signed display amounts and the original currency, quoting what needs it', () {
      final row = TxRow.fromJson({...txJson(description: 'Pan, "fresco"', amount: 117, tags: ['a', 'b']), 'originalAmount': 2, 'originalCurrency': 'USD', 'rate': 58.5});
      final csv = buildTransactionsCsv([row], 'DOP');
      final parts = csv.substring(1).split('\n');
      expect(csv.startsWith('﻿'), isTrue);
      expect(parts[0], 'date,type,description,category,budget,tags,source,destination,amount_DOP,original_amount,original_currency,rate');
      expect(parts[1], '2026-09-10,withdrawal,"Pan, ""fresco""",Comida,,a|b,Banco,Colmado,-117.00,2.00,USD,58.500000');
    });

    test('writes income positive and an empty list as the header alone', () {
      expect(buildTransactionsCsv([tx(type: 'deposit', amount: 5)], 'DOP').split('\n')[1], contains(',5.00,'));
      expect(buildTransactionsCsv(const [], 'USD').substring(1), startsWith('date,type'));
      expect(buildTransactionsCsv(const [], 'USD').split('\n'), hasLength(1));
    });
  });
}
