import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/models.g.dart' hide Period, PeriodPreset, Ref;
import '../../api/resources.dart';
import '../../format/formatter.dart';
import '../../format/formatter_provider.dart';
import '../../i18n/strings.g.dart';
import '../../shared/dates.dart';
import '../../state/filters_store.dart';
import '../../state/preferences.dart';
import '../../state/tx_detail.dart';
import '../../ui_logic/names.dart';
import '../../ui_logic/text_table.dart';

enum CompareMode { previous, yoy, custom }

const compareGroups = ['category', 'tag', 'budget', 'account', 'counterparty'];

/// How many bars the delta chart draws.
const compareBarLimit = 15;

/// Period B for a comparison mode: the one before A, the same period a year earlier, or the custom dates (falling back to "before A").
Period resolvePeriodB(CompareMode mode, Period a, String? bStart, String? bEnd) {
  if (mode == CompareMode.yoy) return samePeriodLastYear(a);
  if (mode == CompareMode.custom && isIsoDate(bStart) && isIsoDate(bEnd)) return Period(bStart!, bEnd!);
  return previousPeriod(a);
}

/// Which way a change is good: spending less or earning more.
bool isImprovement(double delta, String kind) => delta != 0 && (delta > 0) != (kind == 'expense');

final compareModeProvider = StateProvider<CompareMode>((ref) => CompareMode.previous);
final compareGroupProvider = StateProvider<String>((ref) => 'category');
final compareKindProvider = StateProvider<String>((ref) => 'expense');
final compareBStartProvider = StateProvider<String?>((ref) => null);
final compareBEndProvider = StateProvider<String?>((ref) => null);

final _comparePeriodAProvider = Provider<Period>((ref) => ref.watch(filtersProvider.select((f) => f.period)));

final comparePeriodBProvider = Provider.autoDispose<Period>((ref) =>
    resolvePeriodB(ref.watch(compareModeProvider), ref.watch(_comparePeriodAProvider), ref.watch(compareBStartProvider), ref.watch(compareBEndProvider)));

final compareReportProvider = reportProvider<CompareReport>('reports/compare', CompareReport.fromJson, extra: (ref) {
  final a = ref.watch(_comparePeriodAProvider), b = ref.watch(comparePeriodBProvider);
  return {'aStart': a.start, 'aEnd': a.end, 'bStart': b.start, 'bEnd': b.end, 'groupBy': ref.watch(compareGroupProvider), 'kind': ref.watch(compareKindProvider)};
});

/// Compares period A (the global period) with a period B by category, tag, budget, account or merchant.
/// Port of libs/client/src/features/reports/compare.vm.ts.
class CompareViewModel {
  CompareViewModel({
    required this.mode,
    required this.groupBy,
    required this.kind,
    required this.a,
    required this.b,
    required this.bStart,
    required this.bEnd,
    required this.res,
    required this.f,
    required this.t,
    required this.detail,
    required this.write,
  });

  final CompareMode mode;
  final String groupBy;
  final String kind;
  final Period a;
  final Period b;
  final String? bStart;
  final String? bEnd;
  final AsyncValue<CompareReport> res;
  final Formatter f;
  final Translations t;
  final TxDetailNotifier detail;

  /// Writes the screen's own state: any of the mode, the grouping, the kind and the two ends of a custom B.
  final void Function({CompareMode? mode, String? groupBy, String? kind, String? bStart, String? bEnd}) write;

  CompareReport? get r => res.valueOrNull;

  bool get initialLoading => res.isLoading && r == null;

  /// The rows with any activity.
  List<CompareRow> get rows => [for (final x in r?.rows ?? const <CompareRow>[]) if (x.a != 0 || x.b != 0) x];

  /// The rows the delta chart draws.
  List<CompareRow> get barRows => rows.take(compareBarLimit).toList();

  String groupLabel(String group) => switch (group) {
        'category' => t.compare.groups.category,
        'tag' => t.compare.groups.tag,
        'budget' => t.compare.groups.budget,
        'account' => t.compare.groups.account,
        _ => t.compare.groups.counterparty,
      };

  List<({String value, String label})> get groupOptions => [for (final g in compareGroups) (value: g, label: groupLabel(g))];

  String name(CompareRow row) => entityName(t, row.name, row.id, fallback: (t) => groupBy == 'tag' ? t.common.untagged : (groupBy == 'budget' ? t.common.noBudget : t.common.uncategorized));

  TextTable? get table => rows.isEmpty
      ? null
      : TextTable(
          columns: [groupLabel(groupBy), 'A', 'B', 'Δ', 'Δ%'],
          rows: [for (final row in rows) [name(row), f.money(row.a), f.money(row.b), f.money(row.delta, signed: true), f.pct(row.pct, decimals: 1, signed: true)]],
        );

  void setMode(CompareMode next) => write(mode: next);

  void setGroupBy(String next) => write(groupBy: next);

  void setKind(String next) => write(kind: next);

  /// Sets one end of a custom period B; the other end defaults to what B currently is.
  void setB({String? start, String? end}) {
    if (start != null && !isIsoDate(start)) return;
    if (end != null && !isIsoDate(end)) return;
    write(
      bStart: start ?? (end != null && bStart == null ? b.start : null),
      bEnd: end ?? (start != null && bEnd == null ? b.end : null),
    );
  }

  /// Sets both ends of a custom period B at once (a range picker answers with both).
  void setBRange(String start, String end) {
    if (!isIsoDate(start) || !isIsoDate(end)) return;
    write(bStart: start, bEnd: end);
  }

  /// The row at [index] of the table (direct) or of the chart ([fromChart]: the first [compareBarLimit] rows, as the chart draws them).
  /// The ECharts chart draws its top item last, so its index is reversed; the phone's bars run top to bottom and pass the index as is.
  bool openRow(int index, {bool fromChart = false}) {
    final list = fromChart ? barRows.reversed.toList() : rows;
    if (index < 0 || index >= list.length) return false;
    final row = list[index];
    detail.open(name(row), {'type': kind == 'expense' ? 'withdrawal' : 'deposit', groupBy: row.id ?? 'none'});
    return true;
  }
}

final compareViewModelProvider = Provider.autoDispose<CompareViewModel>((ref) {
  ref.watch(preferencesProvider.select((p) => p.lang));
  // The notifiers are taken now: a closure must not use `ref` once a dependency changed and the provider has not rebuilt yet.
  final modes = ref.read(compareModeProvider.notifier);
  final groups = ref.read(compareGroupProvider.notifier);
  final kinds = ref.read(compareKindProvider.notifier);
  final starts = ref.read(compareBStartProvider.notifier);
  final ends = ref.read(compareBEndProvider.notifier);
  return CompareViewModel(
    mode: ref.watch(compareModeProvider),
    groupBy: ref.watch(compareGroupProvider),
    kind: ref.watch(compareKindProvider),
    a: ref.watch(_comparePeriodAProvider),
    b: ref.watch(comparePeriodBProvider),
    bStart: ref.watch(compareBStartProvider),
    bEnd: ref.watch(compareBEndProvider),
    res: ref.watch(compareReportProvider),
    f: ref.watch(formatterProvider),
    t: t,
    detail: ref.read(txDetailProvider.notifier),
    write: ({mode, groupBy, kind, bStart, bEnd}) {
      if (mode != null) modes.state = mode;
      if (groupBy != null) groups.state = groupBy;
      if (kind != null) kinds.state = kind;
      if (bStart != null) starts.state = bStart;
      if (bEnd != null) ends.state = bEnd;
    },
  );
});
