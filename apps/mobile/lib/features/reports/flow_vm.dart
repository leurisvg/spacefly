import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/models.g.dart' hide Period, PeriodPreset, Ref;
import '../../api/resources.dart';
import '../../format/formatter.dart';
import '../../format/formatter_provider.dart';
import '../../i18n/strings.g.dart';
import '../../state/preferences.dart';
import '../../state/tx_detail.dart';
import '../dashboard/dashboard_vm.dart' show TextTable;

enum FlowMode { budget, tags }

/// Shares of income the "group small flows" control offers on a phone (the web has a slider over the same range).
const flowThresholds = [0.0, 0.01, 0.02, 0.03, 0.05, 0.1];

const _legendOrder = [
  SankeyNodeKind.REVENUE,
  SankeyNodeKind.INCOME_CAT,
  SankeyNodeKind.HUB,
  SankeyNodeKind.BUDGET,
  SankeyNodeKind.TAG,
  SankeyNodeKind.CATEGORY,
  SankeyNodeKind.SAVINGS,
  SankeyNodeKind.DEFICIT,
  SankeyNodeKind.OTHER,
];

/// The text of an i18n key the server puts on its synthetic nodes (`labelKey`); `null` for a key it does not know.
String? _serverKey(Translations t, String key) => switch (key) {
      'sankey.totalIncome' => t.sankey.totalIncome,
      'sankey.savings' => t.sankey.savings,
      'sankey.netSavings' => t.sankey.netSavings,
      'sankey.deficit' => t.sankey.deficit,
      'sankey.othersExpense' => t.sankey.othersExpense,
      'sankey.othersIncome' => t.sankey.othersIncome,
      'sankey.othersTags' => t.sankey.othersTags,
      'common.uncategorized' => t.common.uncategorized,
      'common.untagged' => t.common.untagged,
      _ => null,
    };

/// The display name of a Sankey node (synthetic nodes have an i18n key).
String nodeLabel(SankeyNode n, Translations t) {
  final key = n.labelKey;
  return key == null ? n.label : (_serverKey(t, key) ?? n.label);
}

/// Which node kinds are in the report, in legend order.
List<SankeyNodeKind> legendKinds(Iterable<SankeyNodeKind> kinds) {
  final present = kinds.toSet();
  return [for (final k in _legendOrder) if (present.contains(k)) k];
}

String kindLabel(Translations t, SankeyNodeKind k) => switch (k) {
      SankeyNodeKind.REVENUE => t.sankey.kinds.revenue,
      SankeyNodeKind.INCOME_CAT => t.sankey.kinds.incomeCat,
      SankeyNodeKind.HUB => t.sankey.kinds.hub,
      SankeyNodeKind.BUDGET => t.sankey.kinds.budget,
      SankeyNodeKind.TAG => t.sankey.kinds.tag,
      SankeyNodeKind.CATEGORY => t.sankey.kinds.category,
      SankeyNodeKind.SAVINGS => t.sankey.kinds.savings,
      SankeyNodeKind.DEFICIT => t.sankey.kinds.deficit,
      SankeyNodeKind.OTHER => t.sankey.kinds.other,
    };

final flowModeProvider = StateProvider.autoDispose<FlowMode>((ref) => FlowMode.budget);
final flowBudgetsProvider = StateProvider.autoDispose<bool>((ref) => true);
final flowIncomeCategoriesProvider = StateProvider.autoDispose<bool>((ref) => true);

/// `null` until the user picks one: the server's own default then applies.
final flowThresholdProvider = StateProvider.autoDispose<double?>((ref) => null);

final flowReportProvider = reportProvider<SankeyReport>('reports/sankey', SankeyReport.fromJson, extra: (ref) {
  final threshold = ref.watch(flowThresholdProvider);
  return {
    'mode': ref.watch(flowModeProvider) == FlowMode.tags ? 'tags' : 'budget',
    'budgets': ref.watch(flowBudgetsProvider) ? '1' : '0',
    'incomeCategories': ref.watch(flowIncomeCategoriesProvider) ? '1' : '0',
    if (threshold != null) 'threshold': threshold,
  };
});

/// Money flow: income → budgets / categories / tags → savings, as a Sankey with its options kept in memory.
/// Port of libs/client/src/features/reports/flow.vm.ts.
class FlowViewModel {
  FlowViewModel({
    required this.mode,
    required this.budgets,
    required this.incomeCategories,
    required this.threshold,
    required this.res,
    required this.f,
    required this.t,
    required this.detail,
    required this.write,
  });

  final FlowMode mode;
  final bool budgets;
  final bool incomeCategories;
  final double threshold;
  final AsyncValue<SankeyReport> res;
  final Formatter f;
  final Translations t;
  final TxDetailNotifier detail;

  /// Writes the screen's own state: any of the mode, the two switches and the threshold.
  final void Function({FlowMode? mode, bool? budgets, bool? incomeCategories, double? threshold}) write;

  SankeyReport? get r => res.valueOrNull;

  bool get initialLoading => res.isLoading && r == null;

  String label(SankeyNode n) => nodeLabel(n, t);

  List<({SankeyNodeKind kind, String label})> get legend => [for (final k in legendKinds((r?.nodes ?? const <SankeyNode>[]).map((n) => n.kind))) (kind: k, label: kindLabel(t, k))];

  String get savingsLabel => r?.savingsLabel == SavingsLabel.NET_SAVINGS ? t.sankey.netSavings : t.sankey.savings;

  /// Every link as "from → to": amount, share of income.
  TextTable? get table {
    final report = r;
    if (report == null) return null;
    final byId = {for (final n in report.nodes) n.id: n};
    return TextTable(
      columns: [t.flow.from, t.flow.to, t.common.amount, t.flow.shareOfIncome],
      rows: [
        for (final l in report.links)
          [label(byId[l.source]!), label(byId[l.target]!), f.money(l.value), f.pct(report.totalIncome != 0 ? l.value / report.totalIncome : null)],
      ],
    );
  }

  void setMode(FlowMode next) => write(mode: next);

  void setBudgets(bool next) => write(budgets: next);

  void setIncomeCategories(bool next) => write(incomeCategories: next);

  void setThreshold(double next) => write(threshold: next);

  /// A Sankey tap reports the node's id; nodes without a filter and unknown ids are ignored.
  bool openNodeById(String id) {
    final node = r?.nodes.where((n) => n.id == id).firstOrNull;
    if (node?.filter == null) return false;
    open(node!);
    return true;
  }

  void open(SankeyNode node) => detail.open(label(node), node.filter ?? const {});
}

final flowViewModelProvider = Provider.autoDispose<FlowViewModel>((ref) {
  ref.watch(preferencesProvider.select((p) => p.lang));
  // The notifiers are taken now: a closure must not use `ref` once a dependency changed and the provider has not rebuilt yet.
  final modes = ref.read(flowModeProvider.notifier);
  final budgetSwitch = ref.read(flowBudgetsProvider.notifier);
  final incomeSwitch = ref.read(flowIncomeCategoriesProvider.notifier);
  final thresholds = ref.read(flowThresholdProvider.notifier);
  return FlowViewModel(
    mode: ref.watch(flowModeProvider),
    budgets: ref.watch(flowBudgetsProvider),
    incomeCategories: ref.watch(flowIncomeCategoriesProvider),
    threshold: ref.watch(flowThresholdProvider) ?? 0,
    res: ref.watch(flowReportProvider),
    f: ref.watch(formatterProvider),
    t: t,
    detail: ref.read(txDetailProvider.notifier),
    write: ({mode, budgets, incomeCategories, threshold}) {
      if (mode != null) modes.state = mode;
      if (budgets != null) budgetSwitch.state = budgets;
      if (incomeCategories != null) incomeSwitch.state = incomeCategories;
      if (threshold != null) thresholds.state = threshold;
    },
  );
});
