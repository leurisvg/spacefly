import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/models.g.dart' hide Period, PeriodPreset, Ref;
import '../../api/resources.dart';
import '../../format/formatter.dart';
import '../../format/formatter_provider.dart';
import '../../i18n/strings.g.dart';
import '../../state/preferences.dart';
import '../../state/tx_detail.dart';
import '../../ui_logic/names.dart';
import '../dashboard/dashboard_vm.dart' show TextTable;

/// The budget the screen shows: the one picked, else the first.
BudgetDetail? selectBudget(List<BudgetDetail> budgets, String? id) => budgets.where((b) => b.id == id).firstOrNull ?? budgets.firstOrNull;

/// How many bars the category chart draws.
const budgetCategoryLimit = 12;

final budgetsReportProvider = reportProvider<BudgetsReport>('reports/budgets', BudgetsReport.fromJson);

/// The budget picked on the screen (`?budget=` on the web); `null` means the first.
final selectedBudgetProvider = StateProvider.autoDispose<String?>((ref) => null);

/// Budgets: limits and spending of the period, plus history and category breakdown of the selected budget.
/// Port of libs/client/src/features/analysis/budgets.vm.ts.
class BudgetsViewModel {
  BudgetsViewModel({required this.res, required this.selectedId, required this.f, required this.t, required this.detail, required this.write});

  final AsyncValue<BudgetsReport> res;
  final String? selectedId;
  final Formatter f;
  final Translations t;
  final TxDetailNotifier detail;
  final void Function(String id) write;

  BudgetsReport? get r => res.valueOrNull;

  bool get initialLoading => res.isLoading && r == null;

  ({double limit, double spent}) get totals {
    final b = r?.budgets ?? const <BudgetDetail>[];
    return (limit: b.fold(0, (s, x) => s + x.limit), spent: b.fold(0, (s, x) => s + x.spent));
  }

  BudgetDetail? get selected => selectBudget(r?.budgets ?? const [], selectedId);

  List<({String month, double limit, double spent})> get history => [for (final x in selected?.history ?? const <BudgetDetailHistory>[]) (month: x.month, limit: x.limit, spent: x.spent)];

  TextTable? get historyTable {
    final b = selected;
    if (b == null) return null;
    return TextTable(
      columns: [t.common.month, t.budget.limit, t.budget.spent, '%'],
      rows: [for (final x in b.history) [f.date(x.month, DateStyle.month), f.money(x.limit), f.money(x.spent), x.limit != 0 ? f.pct(x.spent / x.limit, decimals: 0) : '—']],
    );
  }

  List<({String? id, String name, double value})> get categoryRows => [for (final c in selected?.categories ?? const <BudgetDetailCategory>[]) (id: c.id, name: entityName(t, c.name, c.id), value: c.value)];

  /// The rows the category chart draws.
  List<({String? id, String name, double value})> get categoryBars => categoryRows.take(budgetCategoryLimit).toList();

  TextTable? get categoryTable => categoryRows.isEmpty ? null : TextTable(columns: [t.common.category, t.common.amount], rows: [for (final c in categoryRows) [c.name, f.money(c.value)]]);

  void select(String id) => write(id);

  /// The category at [index] of the chart (top first, as the phone draws it).
  bool openCategory(int index) {
    final b = selected;
    final bars = categoryBars;
    if (b == null || index < 0 || index >= bars.length) return false;
    final c = bars[index];
    detail.open('${b.name} · ${c.name}', {'type': 'withdrawal', 'budget': b.id, 'category': c.id ?? 'none'});
    return true;
  }

  /// The transactions charged to a budget in the period.
  void openBudget(BudgetDetail b) => detail.open(b.name, {'type': 'withdrawal', 'budget': b.id});
}

final budgetsViewModelProvider = Provider.autoDispose<BudgetsViewModel>((ref) {
  ref.watch(preferencesProvider.select((p) => p.lang));
  final picked = ref.read(selectedBudgetProvider.notifier);
  return BudgetsViewModel(
    res: ref.watch(budgetsReportProvider),
    selectedId: ref.watch(selectedBudgetProvider),
    f: ref.watch(formatterProvider),
    t: t,
    detail: ref.read(txDetailProvider.notifier),
    write: (id) => picked.state = id,
  );
});
