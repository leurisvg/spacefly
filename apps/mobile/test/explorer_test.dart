import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/api/models.g.dart' hide Ref;
import 'package:spacefly_mobile/features/transactions/explorer_vm.dart';
import 'package:spacefly_mobile/features/transactions/tx_detail_vm.dart';
import 'package:spacefly_mobile/i18n/strings.g.dart';
import 'package:spacefly_mobile/state/filters_store.dart';
import 'package:spacefly_mobile/state/meta_store.dart';
import 'package:spacefly_mobile/state/tx_detail.dart';

import 'fixtures.dart';
import 'support.dart';

TxRow tx({
  String id = '1',
  String date = '2026-09-10',
  String type = 'withdrawal',
  String description = 'Supermercado',
  double amount = 100,
  String? category = 'Comida',
  String? categoryId,
  double splitCount = 1,
}) =>
    TxRow.fromJson(txJson(
      id: id,
      date: date,
      type: type,
      description: description,
      amount: amount,
      splitCount: splitCount.toInt(),
      category: category == null ? null : {'id': categoryId ?? 'c-$category', 'name': category},
    ));

void main() {
  setUpAll(initFormats);
  setUp(() => LocaleSettings.setLocaleSync(AppLocale.en));

  group('explorer shaping', () {
    final rows = [
      tx(id: '1', date: '2026-09-01', description: 'b', amount: 50, category: 'Zeta'),
      tx(id: '2', date: '2026-09-03', description: 'a', amount: 300, type: 'deposit', category: null),
      tx(id: '3', date: '2026-09-03', description: 'c', amount: 10, category: 'Alfa'),
    ];

    test('signs expenses negative', () {
      expect(rows.map(signedAmount), [-50, 300, -10]);
    });

    test('sorts by each column and breaks date ties by id', () {
      List<String> ids(SortKey key, int dir) => sortTransactions(rows, key, dir).map((r) => r.id).toList();
      expect(ids(SortKey.date, -1), ['3', '2', '1']);
      expect(ids(SortKey.date, 1), ['1', '2', '3']);
      expect(ids(SortKey.amount, -1), ['2', '3', '1']);
      expect(ids(SortKey.description, 1), ['2', '1', '3']);
      expect(ids(SortKey.category, 1), ['2', '3', '1']);
      expect(rows.map((r) => r.id), ['1', '2', '3'], reason: 'the input is not mutated');
    });

    test('starts dates and amounts newest/largest first, text A→Z', () {
      expect(SortKey.values.map(defaultSortDir), [-1, 1, -1, 1]);
    });

    test('edits only single-part expenses, income and transfers', () {
      expect(isEditable(tx()), isTrue);
      expect(isEditable(tx(splitCount: 2)), isFalse);
      expect(isEditable(tx(type: 'opening balance')), isFalse);
    });

    test('groups a detail list by type and category, largest total first', () {
      final groups = groupTransactions([...rows, tx(id: '4', amount: 500, category: 'Alfa')]);
      expect(groups.map((g) => (g.type, g.category, g.total)), [
        ('withdrawal', 'Alfa', -510.0),
        ('deposit', null, 300.0),
        ('withdrawal', 'Zeta', -50.0),
      ]);
    });
  });

  group('explorer view model', () {
    final listRows = [txJson(id: '2', date: '2026-09-02'), txJson(id: '1', date: '2026-09-01')];
    late FakeAdapter adapter;

    (ProviderContainer, Future<void> Function()) setup({List<Map<String, Object?>>? rows, Object? searchBody, Map<String, Object?>? meta}) {
      adapter = fakeServer({
        '/api/transactions': report({'rows': rows ?? listRows, 'totals': {'income': 0, 'expense': 0, 'transfer': 0}}),
        '/api/search': report(searchBody ?? {'rows': [], 'page': 1, 'totalPages': 1, 'total': 0}),
        '/api/lookups': lookupsJson(),
        '/api/meta': meta ?? metaJson(),
      });
      final c = TestEnv(config: signedInConfig, adapter: adapter).container();
      c.listen(explorerViewProvider, (_, __) {});
      Future<void> settle() async {
        await c.read(explorerListProvider.future);
        await c.read(explorerSearchProvider.future);
        await c.read(lookupsProvider.future);
        await c.read(metaProvider.future);
      }

      return (c, settle);
    }

    test('lists the period sorted, newest first, toggling the direction of the current column', () async {
      final (c, settle) = setup();
      await settle();
      expect(c.read(explorerViewProvider).shownRows.map((r) => r.id), ['2', '1']);
      c.read(explorerProvider.notifier).sortBy(SortKey.date);
      expect(c.read(explorerViewProvider).shownRows.map((r) => r.id), ['1', '2']);
      c.read(explorerProvider.notifier).sortBy(SortKey.amount);
      expect(c.read(explorerProvider).sortDir, -1);
    });

    test('asks the server for the period with the filters that are on', () async {
      final (c, settle) = setup();
      await settle();
      final first = adapter.requests.firstWhere((r) => r.path == '/api/transactions');
      expect(first.queryParameters, {'start': '2026-09-01', 'end': '2026-09-30', 'currency': 'DOP', '_r': 0});

      c.read(explorerProvider.notifier).setFilters(type: 'deposit', tag: 'viaje');
      await c.read(explorerListProvider.future);
      final filtered = adapter.requests.where((r) => r.path == '/api/transactions').last;
      expect(filtered.queryParameters['type'], 'deposit');
      expect(filtered.queryParameters['tag'], 'viaje');
      expect(filtered.queryParameters.containsKey('category'), isFalse);
      expect(c.read(explorerProvider).activeFilters, 2);
    });

    test('goes back to page 1 when the inputs change', () async {
      final (c, settle) = setup();
      await settle();
      final n = c.read(explorerProvider.notifier);
      n.setPage(3);
      expect(c.read(explorerProvider).page, 3);
      n.setFilters(type: 'deposit');
      expect(c.read(explorerProvider).page, 1);
      n.setPage(2);
      c.read(filtersProvider.notifier).shift(-1);
      expect(c.read(explorerProvider).page, 1, reason: 'a new period');
    });

    test('shows 50 rows at a time and offers more', () async {
      final many = [for (var i = 0; i < 120; i++) txJson(id: '$i', date: '2026-09-01')];
      final (c, settle) = setup(rows: many);
      await settle();
      var view = c.read(explorerViewProvider);
      expect((view.shownRows.length, view.hasMore, view.sorted.length), (50, true, 120));
      c.read(explorerProvider.notifier).loadMore();
      c.read(explorerProvider.notifier).loadMore();
      view = c.read(explorerViewProvider);
      expect((view.shownRows.length, view.hasMore), (120, false));
    });

    test('uses Firefly search once the box is submitted with the syntax toggle on', () async {
      final (c, settle) = setup(searchBody: {'rows': [txJson(id: '8')], 'page': 1, 'totalPages': 3, 'total': 140});
      await settle();
      final n = c.read(explorerProvider.notifier);
      n.setUseFirefly(true);
      expect(c.read(explorerProvider).searching, isFalse, reason: 'nothing submitted yet');
      n.submitSearch('  groceries ');
      expect(c.read(explorerProvider).query, 'groceries');
      await c.read(explorerSearchProvider.future);

      final search = adapter.requests.firstWhere((r) => r.path == '/api/search');
      expect(search.queryParameters, {'query': 'groceries', 'page': 1, 'limit': 50, 'currency': 'DOP', '_r': 0});
      final view = c.read(explorerViewProvider);
      expect(view.searching, isTrue);
      expect(view.shownRows.map((r) => r.id), ['8']);
      expect((view.totalPages, view.hasMore), (3, true));

      n.clearSearch();
      expect(c.read(explorerProvider).searching, isFalse);
    });

    test('offers the lookups as filter options, with the "none" choices first', () async {
      final (c, settle) = setup();
      await settle();
      final view = c.read(explorerViewProvider);
      expect(view.categoryOptions.map((o) => (o.value, o.label)), [('none', 'Uncategorized'), ('c1', 'Comida')]);
      expect(view.budgetOptions.map((o) => o.value), ['none', 'b1']);
      expect(view.accountOptions.map((o) => o.label), ['Banco']);
      expect(view.tagOptions.map((o) => o.value), ['viaje']);
    });

    test('links a row to its pages in Firefly, when its public URL is known', () async {
      final (c, settle) = setup(rows: [txJson(id: '1', groupId: '77')]);
      await settle();
      final view = c.read(explorerViewProvider);
      final row = view.shownRows.single;
      expect(view.fireflyLink(row), 'https://ff.test/transactions/show/77');
      expect(view.fireflyEditLink(row), 'https://ff.test/transactions/edit/77');
    });

    test('has no Firefly links without a public URL', () async {
      final (c, settle) = setup(rows: [txJson(id: '1', groupId: '77')], meta: {...metaJson(), 'fireflyPublicUrl': ''});
      await settle();
      final view = c.read(explorerViewProvider);
      expect(view.fireflyLink(view.shownRows.single), isNull);
      expect(view.fireflyEditLink(view.shownRows.single), isNull);
    });

    test('clearFilters keeps the search and the sort', () async {
      final (c, settle) = setup();
      await settle();
      final n = c.read(explorerProvider.notifier);
      n.sortBy(SortKey.description);
      n.submitSearch('pan');
      n.setFilters(type: 'deposit', category: 'c1');
      n.clearFilters();
      final s = c.read(explorerProvider);
      expect((s.activeFilters, s.query, s.sortKey), (0, 'pan', SortKey.description));
    });
  });

  group('transaction drill-down', () {
    test('queries the open request over the global period unless it has its own', () async {
      final adapter = fakeServer({'/api/transactions': report({'rows': [txJson(id: '1'), txJson(id: '2', type: 'deposit', amount: 300, category: null)], 'totals': {'income': 0, 'expense': 0, 'transfer': 0}})});
      final c = TestEnv(config: signedInConfig, adapter: adapter).container();
      c.listen(txDetailViewModelProvider, (_, __) {});
      expect(c.read(txDetailViewModelProvider).isOpen, isFalse);

      c.read(txDetailProvider.notifier).open('Food', {'type': 'withdrawal', 'category': 'c1'});
      await c.read(txDetailListProvider.future);
      final q = adapter.requests.last.queryParameters;
      expect((q['start'], q['end'], q['type'], q['category']), ('2026-09-01', '2026-09-30', 'withdrawal', 'c1'));

      final vm = c.read(txDetailViewModelProvider);
      expect(vm.isOpen, isTrue);
      expect(vm.groups.map((g) => g.type), ['deposit', 'withdrawal']);

      c.read(txDetailProvider.notifier).open('Day', {'start': '2026-09-03', 'end': '2026-09-03'});
      await c.read(txDetailListProvider.future);
      expect(adapter.requests.last.queryParameters['start'], '2026-09-03');
      expect(c.read(txDetailViewModelProvider).range, (start: '2026-09-03', end: '2026-09-03'));
    });

    test('switches between ranges and drills into a member of a group', () async {
      final adapter = fakeServer({'/api/transactions': report({'rows': [], 'totals': {'income': 0, 'expense': 0, 'transfer': 0}})});
      final c = TestEnv(config: signedInConfig, adapter: adapter).container();
      c.listen(txDetailViewModelProvider, (_, __) {});
      final notifier = c.read(txDetailProvider.notifier);

      const year = TxRange(label: 'Year', start: '2026-01-01', end: '2026-12-31');
      notifier.open('Food', {'type': 'withdrawal', 'start': '2026-09-01', 'end': '2026-09-30'}, ranges: [year]);
      expect(c.read(txDetailViewModelProvider).isActiveRange(year), isFalse);
      notifier.setRange(year);
      expect(c.read(txDetailViewModelProvider).isActiveRange(year), isTrue);

      notifier.openCategories('Others', const [BreakdownRow(id: '7', name: 'Pets', value: 4), BreakdownRow(id: null, name: 'Misc', value: 1)], filter: {'type': 'withdrawal'});
      expect(c.read(txDetailProvider)!.filter['categories'], '7,none');
      c.read(txDetailViewModelProvider).drill(const BreakdownRow(id: '7', name: 'Pets', value: 4));
      expect(c.read(txDetailProvider)!.title, 'Pets');
      expect(c.read(txDetailProvider)!.filter, {'category': '7', 'type': 'withdrawal'});

      notifier.close();
      expect(c.read(txDetailViewModelProvider).isOpen, isFalse);
    });
  });
}
