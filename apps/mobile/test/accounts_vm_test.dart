import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/features/accounts/accounts_vm.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';
import 'package:spacefly_mobile/theme/tokens.g.dart';

import 'fixtures.dart';
import 'support.dart';

void main() {
  setUpAll(initFormats);
  setUp(() => LocaleSettings.setLocaleSync(AppLocale.en));

  Future<(AccountsViewModel, FakeAdapter)> setup([Map<String, Object?>? body]) async {
    final adapter = fakeServer({'/api/reports/accounts': report(body ?? accountsJson())});
    final c = TestEnv(config: signedInConfig, adapter: adapter).container();
    c.listen(accountsViewModelProvider, (_, __) {});
    await c.read(accountsReportProvider.future);
    return (c.read(accountsViewModelProvider), adapter);
  }

  test('asks for 12 months of history by default', () async {
    final (_, adapter) = await setup();
    expect(adapter.requests.firstWhere((r) => r.path == '/api/reports/accounts').queryParameters['months'], '12');
  });

  test('totals income and expense and keeps the chart in the list’s order', () async {
    final (vm, _) = await setup();
    expect(vm.rows.map((a) => a.id), ['1', '2']);
    expect([vm.income, vm.expense], [15, 5]);
    expect(vm.table?.rows.map((r) => r[0]), ['Banco', 'Ahorros']);
    expect(vm.table?.columns, ['Account', 'Aug 26', 'Sep 26']);
    expect(vm.table?.rows.first, ['Banco', 'RD\$90', 'RD\$100']);
  });

  test('gives every account its own stable color', () async {
    final (vm, _) = await setup();
    expect(vm.lines.map((l) => l.name), ['Banco', 'Ahorros']);
    expect(vm.lines.map((l) => l.color), [themeMidnight.series[0], themeMidnight.series[1]]);
    expect(vm.lines.first.values, [90, 100]);
  });

  test('orders the history like the list even when the server sends it differently', () async {
    final body = accountsJson();
    body['history'] = (body['history'] as List).reversed.toList();
    final (vm, _) = await setup(body);
    expect(vm.history.map((h) => h.id), ['1', '2']);
  });

  test('has nothing to total before the first answer', () async {
    final c = TestEnv(config: signedInConfig, adapter: fakeServer({'/api/reports/accounts': report(accountsJson())})).container();
    c.listen(accountsViewModelProvider, (_, __) {});
    final vm = c.read(accountsViewModelProvider);
    expect(vm.income, isNull);
    expect(vm.expense, isNull);
    expect(vm.table, isNull);
    expect(vm.rows, isEmpty);
  });
}
