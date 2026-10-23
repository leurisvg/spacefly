import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/api/models.g.dart' hide Period, PeriodPreset, Ref;
import 'package:spacefly_mobile/features/accounts/account_detail_vm.dart';
import 'package:spacefly_mobile/features/accounts/counterparties_vm.dart';
import 'package:spacefly_mobile/features/accounts/counterparty_detail_vm.dart';
import 'package:spacefly_mobile/features/accounts/net_worth_vm.dart';
import 'package:spacefly_mobile/features/accounts/savings_vm.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';
import 'package:spacefly_mobile/shared/dates.dart';
import 'package:spacefly_mobile/state/filters_store.dart';
import 'package:spacefly_mobile/state/tx_detail.dart';
import 'package:spacefly_mobile/ui/charts.dart';
import 'package:spacefly_mobile/ui_logic/pagination.dart';

import 'fixtures.dart';
import 'support.dart';

void main() {
  setUpAll(initFormats);
  setUp(() => LocaleSettings.setLocaleSync(AppLocale.en));

  Map<String, Object> routes() => {
        '/api/meta': metaJson(),
        '/api/lookups': lookupsJson(),
        '/api/reports/net-worth': report(netWorthJson()),
        '/api/reports/savings': report(savingsJson()),
        '/api/reports/counterparties': report(counterpartiesJson()),
        '/api/reports/counterparties/20': report(counterpartyDetailJson()),
        '/api/reports/accounts/1': report(accountDetailJson()),
      };

  (TestEnv, ProviderContainer) container([Map<String, Object>? extra]) {
    final env = TestEnv(config: signedInConfig, adapter: fakeServer({...routes(), ...?extra}));
    return (env, env.container());
  }

  Map<String, dynamic> lastQuery(TestEnv env, String path) => env.adapter!.requests.lastWhere((r) => r.path == path).queryParameters;

  group('pagination', () {
    test('counts pages and cuts them', () {
      expect(pageSize, 50);
      expect([totalPages(0), totalPages(50), totalPages(51)], [1, 1, 2]);
      final rows = List.generate(120, (i) => i);
      expect(pageSlice(rows, 1), hasLength(50));
      expect(pageSlice(rows, 3), rows.sublist(100));
      expect(pageSlice(rows, 9), isEmpty);
      expect(pageSlice(rows, 0), isEmpty);
    });
  });

  group('cumulativeSeries', () {
    test('adds each series to the ones below it', () {
      expect(cumulativeSeries([[1, 2, 3], [10, 20, 30], [100, 200, 300]]), [[1, 2, 3], [11, 22, 33], [111, 222, 333]]);
      expect(cumulativeSeries([[1, 2], [5]]), [[1, 2], [6, 2]], reason: 'a short series counts as zero');
      expect(cumulativeSeries([]), isEmpty);
    });
  });

  group('net worth', () {
    test('stacks only the accounts that were ever positive, never below zero', () {
      final accounts = NetWorthReport.fromJson(netWorthJson()).byAccount;
      final stacked = stackedAccounts(accounts);
      expect(stacked.map((a) => a.id), ['a1', 'a2'], reason: 'the loan was never positive');
      expect(stacked.last.balances, [0, 20]);
    });

    test('asks for 24 months, follows the picker, tables every account plus the total', () async {
      final (env, c) = container();
      c.listen(netWorthViewModelProvider, (_, __) {});
      await c.read(netWorthReportProvider.future);
      expect(lastQuery(env, '/api/reports/net-worth')['months'], '24');
      var vm = c.read(netWorthViewModelProvider);
      expect(vm.first, 900);
      expect(vm.table!.rows.map((r) => r.first), ['Banco', 'Préstamo', 'Ahorros', 'Total']);
      expect(vm.stackLines.map((l) => l.name), ['Banco', 'Ahorros']);
      vm.setMonths('36');
      await c.read(netWorthReportProvider.future);
      expect(lastQuery(env, '/api/reports/net-worth')['months'], '36');
      vm = c.read(netWorthViewModelProvider);
      expect(vm.months, '36');
    });
  });

  group('savings', () {
    test('sums every account month by month', () {
      expect(savingsTotals(SavingsSeries.fromJson(savingsJson())), [110, 180]);
    });

    test('asks for 12 months and reads the first and last total', () async {
      final (env, c) = container();
      c.listen(savingsViewModelProvider, (_, __) {});
      await c.read(savingsReportProvider.future);
      expect(lastQuery(env, '/api/reports/savings')['months'], '12');
      final vm = c.read(savingsViewModelProvider);
      expect((vm.first, vm.total), (110, 180));
      expect(vm.colorOf('a1'), isNot(vm.colorOf('a2')));
      vm.setMonths('6');
      expect(c.read(savingsViewModelProvider).months, '6');
    });
  });

  group('counterparties', () {
    CounterpartyItem item(String id, double value, {double previous = 0, double count = 1}) => CounterpartyItem(active: true, avg: value, count: count, id: id, lastDate: null, name: 'N$id', previous: previous, share: 0.1, value: value);

    test('shows what moved money in this or the previous period unless asked for everything', () {
      final items = [item('1', 10), item('2', 0, previous: 5), item('3', 0)];
      expect(shownCounterparties(items, showEmpty: false).map((i) => i.id), ['1', '2']);
      expect(shownCounterparties(items, showEmpty: true).map((i) => i.id), ['1', '2', '3']);
    });

    test('ranks the accounts of the period, at most twelve', () {
      expect(topCounterparties([for (var i = 0; i < 20; i++) item('$i', 100.0 - i)]), hasLength(12));
      expect(topCounterparties([item('1', 0), item('2', 5)]).map((i) => i.id), ['2']);
    });

    test('puts the detail of an account under its own kind', () {
      expect(counterpartyPath(CounterpartyKind.EXPENSE, '7'), '/accounts/expense/7');
      expect(counterpartyPath(CounterpartyKind.INCOME, '7'), '/accounts/revenue/7');
    });

    test('asks for its kind and summarises the report', () async {
      final (env, c) = container();
      const kind = CounterpartyKind.EXPENSE;
      c.listen(counterpartiesViewModelProvider(kind), (_, __) {});
      await c.read(counterpartiesReportProvider(kind).future);
      expect(lastQuery(env, '/api/reports/counterparties')['kind'], 'expense');
      final vm = c.read(counterpartiesViewModelProvider(kind));
      expect(vm.active, 1);
      expect(vm.avgTicket, 25);
      expect(vm.shown.map((i) => i.id), ['20', '21'], reason: 'the one without any money in either period is hidden');
      expect(vm.top.map((i) => i.id), ['20']);
      expect(vm.rankTable!.rows.single, ['Supermercado Nacional', 'RD\$100.00', '50.0%', '4']);
      expect(vm.createRoute, '/edit/account?type=expense');
      expect(vm.editRoute('20'), '/edit/account/20');
      vm.setShowEmpty(true);
      expect(c.read(counterpartiesViewModelProvider(kind)).shown, hasLength(3));
    });

    test('creates revenue accounts for the income kind', () async {
      final (env, c) = container({'/api/reports/counterparties': report(counterpartiesJson(kind: 'income'))});
      const kind = CounterpartyKind.INCOME;
      c.listen(counterpartiesViewModelProvider(kind), (_, __) {});
      await c.read(counterpartiesReportProvider(kind).future);
      expect(lastQuery(env, '/api/reports/counterparties')['kind'], 'income');
      expect(c.read(counterpartiesViewModelProvider(kind)).createRoute, '/edit/account?type=revenue');
    });
  });

  group('counterparty detail', () {
    CounterpartyDetailArgs args() => (kind: CounterpartyKind.EXPENSE, id: '20');

    test('totals a year, averages the months and finds the biggest record', () {
      final d = CounterpartyDetailReport.fromJson(counterpartyDetailJson());
      final s = counterpartyStats(d.months, d.rows);
      expect(s.total12, 160);
      expect(s.monthlyAverage, 80);
      expect(s.biggest?.description, 'Compra grande');
      expect(counterpartyStats(const [], const []).monthlyAverage, 0);
    });

    test('draws what was paid as the expense of the day and what was received as income', () {
      final days = [
        CounterpartyDetailReportDay(count: 1, date: '2026-08-31', value: 5),
        CounterpartyDetailReportDay(count: 2, date: '2026-09-01', value: 7),
      ];
      final paid = counterpartyCalendarMonths(days, CounterpartyKind.EXPENSE);
      expect(paid.map((m) => m.month), ['2026-08', '2026-09']);
      expect((paid[1].days.first.expense, paid[1].days.first.income, paid[1].days.first.balance), (7, 0, null));
      expect(counterpartyCalendarMonths(days, CounterpartyKind.INCOME).first.days.first.income, 5);
    });

    test('names the asset account on the other side and edits only single-part expenses and income', () {
      final tx = TxRow.fromJson(txJson());
      expect(assetOf(tx, CounterpartyKind.EXPENSE), 'Banco');
      expect(assetOf(tx, CounterpartyKind.INCOME), 'Colmado');
      expect(isEditableTx(tx), isTrue);
      expect(isEditableTx(TxRow.fromJson(txJson(type: 'transfer'))), isFalse);
      expect(isEditableTx(TxRow.fromJson(txJson(splitCount: 2))), isFalse);
    });

    test('loads the account of its kind, pages its records and opens a day', () async {
      final many = counterpartyDetailJson()..['rows'] = [for (var i = 0; i < 120; i++) txJson(id: '$i', groupId: '$i', amount: i + 1)];
      final (env, c) = container({'/api/reports/counterparties/20': report(many)});
      final a = args();
      c.listen(counterpartyDetailViewModelProvider(a), (_, __) {});
      await c.read(counterpartyDetailReportProvider(a).future);
      expect(lastQuery(env, '/api/reports/counterparties/20')['kind'], 'expense');
      var vm = c.read(counterpartyDetailViewModelProvider(a));
      expect(vm.share, 50);
      expect(vm.sign, -1);
      expect(vm.subtitle, 'DO00');
      expect((vm.pages, vm.pageRows.length), (3, 50));
      vm.setPage(3);
      vm = c.read(counterpartyDetailViewModelProvider(a));
      expect(vm.pageRows, hasLength(20));
      vm.setPage(99);
      expect(c.read(counterpartyDetailViewModelProvider(a)).page, 3, reason: 'kept inside the pages there are');
      vm.openDay('2026-09-02');
      expect(c.read(txDetailProvider)!.filter, {'start': '2026-09-02', 'end': '2026-09-02', 'counterparty': '20'});
      expect(vm.backRoute, '/accounts/expense');
      expect(vm.calendarScale, 60);
      expect(vm.dayTable!.rows.first, ['Wed, Sep 2', '1', 'RD\$40.00']);
    });

    test('goes back to the first page when the period changes', () async {
      final (env, c) = container();
      final a = args();
      c.listen(counterpartyDetailViewModelProvider(a), (_, __) {});
      await c.read(counterpartyDetailReportProvider(a).future);
      c.read(counterpartyPageProvider(a).notifier).state = 2;
      c.read(filtersProvider.notifier).shift(-1);
      await c.read(counterpartyDetailReportProvider(a).future);
      expect(c.read(counterpartyPageProvider(a)), 1);
      expect(lastQuery(env, '/api/reports/counterparties/20')['start'], isNot('2026-09-01'));
    });
  });

  group('account detail', () {
    AccountTxRow row({String type = 'withdrawal', double flow = -50, String id = '1'}) => AccountTxRow.fromJson(accountTxJson(id: id, type: type, flow: flow));

    test('reads the tab, counts the records of each and filters them', () {
      expect([resolveAccountTab('deposit'), resolveAccountTab('bogus'), resolveAccountTab(null)], ['deposit', 'all', 'all']);
      final rows = [row(), row(type: 'deposit', flow: 5), row(type: 'transfer'), row()];
      expect(tabCounts(rows), {'all': 4, 'withdrawal': 2, 'deposit': 1, 'transfer': 1});
      expect(rowsForTab(rows, 'withdrawal'), hasLength(2));
      expect(rowsForTab(rows, 'all'), hasLength(4));
    });

    test('finds the lowest and highest balance, the daily average and the biggest records', () {
      final s = accountStats(AccountDetailReport.fromJson(accountDetailJson(foreign: true)));
      expect((s.lowest!.date, s.lowest!.balance), ('2026-09-10', 1000));
      expect((s.highest!.date, s.highest!.balance), ('2026-09-01', 1100));
      expect(s.avgDailyExpense, 50, reason: 'two days with a known balance');
      expect(s.avgDailyExpenseOriginal, closeTo(100 / 60 / 2, 1e-9));
      expect(s.biggestExpense!.tx.description, 'Compra grande');
      expect(s.biggestExpense!.amountOriginal, closeTo(1, 1e-9));
      expect(s.biggestIncome!.tx.description, 'Sueldo');
    });

    test('draws a foreign account in its own currency, month by month on one scale', () {
      final days = AccountDetailReport.fromJson(accountDetailJson(foreign: true)).days;
      expect(accountCalendarMonths(days, foreign: false).single.days.first.income, 300);
      expect(accountCalendarMonths(days, foreign: true).single.days.first.income, 5);
      expect(accountCalendarScale(days, foreign: false), 300);
      expect(accountCalendarScale(days, foreign: true), 5);
      expect(accountCalendarScale(const [], foreign: false), 1);
    });

    test('names the other side of a record, its tone and whether it can be edited', () {
      expect(counterpartyOf(row(flow: -50)), 'Colmado');
      expect(counterpartyOf(row(flow: 50)), 'Banco');
      expect([txTone(row()), txTone(row(type: 'deposit')), txTone(row(type: 'transfer'))], [TxTone.expense, TxTone.income, TxTone.none]);
      expect(isEditableAccountTx(row(type: 'transfer')), isTrue);
      expect(isEditableAccountTx(row(type: 'reconciliation')), isFalse);
    });

    test('waits for the screen to put the last 30 days in place before asking', () async {
      final (env, c) = container();
      c.listen(accountDetailViewModelProvider('1'), (_, __) {});
      await pumpEventQueue();
      expect(env.adapter!.requests.where((r) => r.path == '/api/reports/accounts/1'), isEmpty, reason: 'paused until the period is the screen’s own');
      c.read(filtersProvider.notifier).scopePreset(PeriodPreset.last30);
      await c.read(accountDetailReportProvider('1').future);
      final q = lastQuery(env, '/api/reports/accounts/1');
      expect((q['start'], q['end']), ('2026-08-17', '2026-09-15'));
    });

    test('keeps the user’s period aside and gives it back', () {
      final (_, c) = container();
      final filters = c.read(filtersProvider.notifier);
      final before = c.read(filtersProvider);
      filters.scopePreset(PeriodPreset.last30);
      expect(c.read(filtersProvider).preset, PeriodPreset.last30);
      expect(filters.scoped, isTrue);
      filters.shift(-1);
      filters.scopePreset(PeriodPreset.last6m);
      filters.release();
      expect(filters.scoped, isFalse);
      expect((c.read(filtersProvider).preset, c.read(filtersProvider).period), (before.preset, before.period), reason: 'what the user had, whatever happened in between');
      filters.release();
      expect(c.read(filtersProvider).preset, before.preset, reason: 'releasing twice does nothing');
    });

    Future<(TestEnv, ProviderContainer, AccountDetailViewModel)> open({bool foreign = false}) async {
      final (env, c) = container({'/api/reports/accounts/1': report(accountDetailJson(foreign: foreign))});
      c.listen(accountDetailViewModelProvider('1'), (_, __) {});
      c.read(filtersProvider.notifier).scopePreset(PeriodPreset.last30);
      await c.read(accountDetailReportProvider('1').future);
      return (env, c, c.read(accountDetailViewModelProvider('1')));
    }

    test('shows a foreign account in its own currency, with what it is worth next to it', () async {
      final (_, _, vm) = await open(foreign: true);
      expect((vm.foreign, vm.own), (true, 'USD'));
      expect(vm.subtitle, 'Savings · USD · DO11');
      expect(vm.approx(1000), '≈ RD\$1,000.00');
      expect(vm.moneyPair(10, 600), 'US\$10.00 (≈ RD\$600.00)');
      expect(vm.balanceDays.first.balance, closeTo(1100 / 60, 1e-9));
      expect(vm.balanceTable!.rows.first, ['Tue, Sep 1', 'US\$18.33 (≈ RD\$1,100.00)']);
      expect(vm.rankTable(vm.r!.topCategories).rows.single.first, 'Comida');
    });

    test('shows an account in the display currency as it is', () async {
      final (_, _, vm) = await open();
      expect((vm.foreign, vm.own, vm.approx(1000)), (false, null, null));
      expect(vm.moneyPair(10, 600), 'RD\$600.00');
      expect(vm.weekdayValues, vm.r!.byWeekday);
      expect(vm.zoomHint, isFalse);
    });

    test('switches the tab, pages the records and opens a day with the account as filter', () async {
      final (_, c, vm) = await open();
      expect((vm.tab, vm.rows.length, vm.counts['transfer']), ('all', 4, 1));
      vm.setTab('deposit');
      final next = c.read(accountDetailViewModelProvider('1'));
      expect((next.tab, next.rows.length, next.rowsTotal), ('deposit', 1, 300));
      next.openDay('2026-09-10');
      expect(c.read(txDetailProvider)!.filter, {'start': '2026-09-10', 'end': '2026-09-10', 'account': '1'});
    });
  });
}
