import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/api/models.g.dart' hide Period, PeriodPreset, Ref;
import 'package:spacefly_mobile/features/analysis/budgets_vm.dart';
import 'package:spacefly_mobile/features/analysis/ranking_vm.dart';
import 'package:spacefly_mobile/features/reports/flow_vm.dart';
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
        '/api/reports/sankey': report(sankeyJson()),
        '/api/reports/ranking': report(rankingJson()),
        '/api/reports/budgets': report(budgetsJson()),
      };

  (TestEnv, ProviderContainer) container() {
    final env = TestEnv(config: signedInConfig, adapter: fakeServer(routes()));
    return (env, env.container());
  }

  Map<String, dynamic> lastQuery(TestEnv env, String path) => env.adapter!.requests.lastWhere((r) => r.path == path).queryParameters;

  group('flow shaping', () {
    SankeyNode node({String label = 'Food', String? labelKey, SankeyNodeKind kind = SankeyNodeKind.CATEGORY}) => SankeyNode(id: 'n', label: label, labelKey: labelKey, kind: kind, value: 1, filter: null);

    test('prefers the text of the key of a synthetic node, and falls back to its label', () {
      expect(nodeLabel(node(label: '', labelKey: 'sankey.totalIncome'), t), 'Total income');
      expect(nodeLabel(node(label: '', labelKey: 'common.uncategorized'), t), 'Uncategorized');
      expect(nodeLabel(node(label: 'Hub', labelKey: 'sankey.unheardOf'), t), 'Hub');
      expect(nodeLabel(node(), t), 'Food');
    });

    test('lists the node kinds present in legend order', () {
      expect(legendKinds([SankeyNodeKind.CATEGORY, SankeyNodeKind.REVENUE, SankeyNodeKind.CATEGORY, SankeyNodeKind.SAVINGS]), [SankeyNodeKind.REVENUE, SankeyNodeKind.CATEGORY, SankeyNodeKind.SAVINGS]);
      expect(kindLabel(t, SankeyNodeKind.INCOME_CAT), 'Income category');
    });
  });

  group('flowViewModel', () {
    Future<(TestEnv, ProviderContainer, FlowViewModel)> setup() async {
      final (env, c) = container();
      c.listen(flowViewModelProvider, (_, __) {});
      await c.read(flowReportProvider.future);
      return (env, c, c.read(flowViewModelProvider));
    }

    test('asks for the budget view with everything shown by default', () async {
      final (env, _, vm) = await setup();
      final q = lastQuery(env, '/api/reports/sankey');
      expect((q['mode'], q['budgets'], q['incomeCategories']), ('budget', '1', '1'));
      expect(q.containsKey('threshold'), isFalse);
      expect((vm.mode, vm.budgets, vm.incomeCategories, vm.threshold), (FlowMode.budget, true, true, 0.0));
    });

    test('keeps its options and asks again when one changes', () async {
      final (env, c, vm) = await setup();
      vm.setMode(FlowMode.tags);
      vm.setBudgets(false);
      vm.setIncomeCategories(false);
      vm.setThreshold(0.05);
      await c.read(flowReportProvider.future);
      final q = lastQuery(env, '/api/reports/sankey');
      expect((q['mode'], q['budgets'], q['incomeCategories'], q['threshold']), ('tags', '0', '0', 0.05));
      final next = c.read(flowViewModelProvider);
      expect((next.mode, next.budgets, next.threshold), (FlowMode.tags, false, 0.05));
    });

    test('names the savings node, tables the links and legends the kinds', () async {
      final (_, _, vm) = await setup();
      expect(vm.savingsLabel, 'Savings');
      final rows = vm.table!.rows;
      expect(rows, hasLength(4));
      expect(rows.first, ['Salary', 'Total income', 'RD\$100.00', '100.0%']);
      expect(rows.last, ['Total income', 'Savings', 'RD\$40.00', '40.0%']);
      expect(vm.legend.map((l) => l.kind), [SankeyNodeKind.REVENUE, SankeyNodeKind.HUB, SankeyNodeKind.BUDGET, SankeyNodeKind.CATEGORY, SankeyNodeKind.SAVINGS]);
    });

    test('opens the transactions of a node with a filter and ignores the rest', () async {
      final (_, c, vm) = await setup();
      expect(vm.openNodeById('rev'), isFalse);
      expect(vm.openNodeById('nope'), isFalse);
      expect(c.read(txDetailProvider), isNull);
      expect(vm.openNodeById('cat1'), isTrue);
      expect(c.read(txDetailProvider)!.title, 'Food');
      expect(c.read(txDetailProvider)!.filter, {'type': 'withdrawal', 'category': '1'});
    });
  });

  group('ranking routing', () {
    test('lets the user switch the side unless the route pins it', () {
      expect(resolveKind(false, RankingKind.expense, 'income'), RankingKind.income);
      expect(resolveKind(false, RankingKind.income, 'bogus'), RankingKind.income);
      expect(resolveKind(false, RankingKind.expense, null), RankingKind.expense);
      expect(resolveKind(true, RankingKind.expense, 'income'), RankingKind.expense);
    });

    test('offers the budget sunburst only for expense categories', () {
      expect(resolveView('sunburst', GroupBy.CATEGORY, RankingKind.expense), RankingView.sunburst);
      expect(resolveView('sunburst', GroupBy.TAG, RankingKind.expense), RankingView.bars);
      expect(resolveView('sunburst', GroupBy.CATEGORY, RankingKind.income), RankingView.bars);
      expect(resolveView('treemap', GroupBy.TAG, RankingKind.expense), RankingView.treemap);
      expect(resolveView(null, GroupBy.CATEGORY, RankingKind.expense), RankingView.bars);
    });
  });

  group('rankingViewModel', () {
    Future<(TestEnv, ProviderContainer, RankingViewModel)> setup([RankingOptions o = rankingCategories]) async {
      final (env, c) = container();
      c.listen(rankingViewModelProvider(o), (_, __) {});
      await c.read(rankingReportProvider(o).future);
      return (env, c, c.read(rankingViewModelProvider(o)));
    }

    test('asks for the grouping and side of its route', () async {
      final (env, _, _) = await setup();
      final q = lastQuery(env, '/api/reports/ranking');
      expect((q['by'], q['kind']), ('category', 'expense'));
      final (env2, _, _) = await setup(rankingIncomeSources);
      final q2 = lastQuery(env2, '/api/reports/ranking');
      expect((q2['by'], q2['kind']), ('counterparty', 'income'));
    });

    test('summarises the items and names the unnamed one', () async {
      final (_, _, vm) = await setup();
      expect(vm.count, 5);
      expect(vm.avgTicket, 30);
      expect(vm.items.map(vm.itemName), ['Food', 'Uncategorized']);
      expect(vm.table!.rows.map((r) => r.first), ['Food', 'Uncategorized']);
      expect(vm.table!.rows.first, ['Food', 'RD\$100.00', '66.7%', '4', 'RD\$25.00']);
      expect(vm.trend, isNotNull);
      expect(vm.trend!.single.values, [40, 60]);
    });

    test('names what has no name by what is grouped', () async {
      final (_, _, tags) = await setup(rankingTags);
      expect(tags.itemName(tags.items.last), 'Untagged');
    });

    test('colors the top items with their own slot and shares one gray after that', () async {
      final (_, _, vm) = await setup();
      expect(vm.colorOf(vm.items[0]), isNot(vm.colorOf(vm.items[1])));
      expect(vm.slices.map((s) => s.name), ['Food', 'Uncategorized']);
      expect(vm.barItems, hasLength(2));
    });

    test('opens the transactions of a row, or "none" for the unassigned one', () async {
      final (_, c, vm) = await setup();
      vm.open(vm.items.first);
      expect(c.read(txDetailProvider)!.title, 'Food');
      expect(c.read(txDetailProvider)!.filter, {'type': 'withdrawal', 'category': '1'});
      expect(vm.openId(null), isTrue);
      expect(c.read(txDetailProvider)!.title, 'Uncategorized');
      expect(c.read(txDetailProvider)!.filter, {'type': 'withdrawal', 'category': 'none'});
      expect(vm.openAt(0), isTrue);
      expect(c.read(txDetailProvider)!.title, 'Food');
      expect(vm.openAt(9), isFalse);
    });

    test('merchants and income sources group by counterparty', () async {
      final (_, c, vm) = await setup(rankingIncomeSources);
      vm.open(vm.items.first);
      expect(c.read(txDetailProvider)!.filter, {'type': 'deposit', 'counterparty': '1'});
    });

    test('switches the side and asks again, unless the route pins it', () async {
      final (env, c, vm) = await setup();
      vm.setKind(RankingKind.income);
      await c.read(rankingReportProvider(rankingCategories).future);
      expect(lastQuery(env, '/api/reports/ranking')['kind'], 'income');
      expect(c.read(rankingViewModelProvider(rankingCategories)).kind, RankingKind.income);
      expect(c.read(rankingViewModelProvider(rankingCategories)).canSunburst, isFalse);

      final (_, _, pinned) = await setup(rankingMerchants);
      pinned.setKind(RankingKind.income);
      expect(pinned.kind, RankingKind.expense);
    });

    test('builds the budget sunburst from the budgets, with what no budget covers apart', () async {
      final (env, c, vm) = await setup();
      expect(env.adapter!.requests.where((r) => r.path == '/api/reports/budgets'), isEmpty, reason: 'only asked for while the sunburst shows');
      expect(vm.sunburstGroups, isNull);
      vm.setView(RankingView.sunburst);
      await c.read(budgetsReportProvider.future);
      final groups = c.read(rankingViewModelProvider(rankingCategories)).sunburstGroups!;
      expect(groups.map((g) => g.name), ['Hogar', 'Ocio', 'No budget']);
      expect(groups[0].children.map((x) => (x.name, x.value)), [('Food', 30.0), ('Uncategorized', 10.0)]);
      // Food (id 1) and the unassigned item are not in any budget category by id, except the unassigned one: 50 - 10 left
      expect(groups[2].children.map((x) => (x.name, x.value)), [('Food', 100.0), ('Uncategorized', 40.0)]);
    });
  });

  group('budgetsViewModel', () {
    Future<(TestEnv, ProviderContainer, BudgetsViewModel)> setup() async {
      final (env, c) = container();
      c.listen(budgetsViewModelProvider, (_, __) {});
      await c.read(budgetsReportProvider.future);
      return (env, c, c.read(budgetsViewModelProvider));
    }

    test('prefers the chosen budget and falls back to the first', () async {
      final (_, _, vm) = await setup();
      final list = vm.r!.budgets;
      expect(selectBudget(list, 'b2')?.id, 'b2');
      expect(selectBudget(list, 'zz')?.id, 'b1');
      expect(selectBudget(list, null)?.id, 'b1');
      expect(selectBudget(const [], 'b1'), isNull);
    });

    test('totals limits and spending and selects the first budget', () async {
      final (_, _, vm) = await setup();
      expect(vm.totals, (limit: 300.0, spent: 190.0));
      expect(vm.selected!.id, 'b1');
      expect(vm.history.map((h) => h.month), ['2026-08', '2026-09']);
      expect(vm.historyTable!.rows.last, ['September 2026', 'RD\$100.00', 'RD\$120.00', '120%']);
      expect(vm.categoryTable!.rows, [['Food', 'RD\$30.00'], ['Uncategorized', 'RD\$10.00']]);
    });

    test('selects through its state and opens a category or a budget', () async {
      final (_, c, vm) = await setup();
      vm.select('b2');
      final next = c.read(budgetsViewModelProvider);
      expect(next.selected!.id, 'b2');
      expect(next.openCategory(0), isTrue);
      expect(c.read(txDetailProvider)!.title, 'Ocio · Cine');
      expect(c.read(txDetailProvider)!.filter, {'type': 'withdrawal', 'budget': 'b2', 'category': '5'});
      expect(next.openCategory(4), isFalse);
      next.openBudget(next.r!.budgets.first);
      expect(c.read(txDetailProvider)!.filter, {'type': 'withdrawal', 'budget': 'b1'});
    });
  });
}
