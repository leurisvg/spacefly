import 'dart:ui' show Color;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/api_client.dart';
import '../../api/models.g.dart' hide Period, PeriodPreset, Ref;
import '../../api/resources.dart';
import '../../format/formatter.dart';
import '../../format/formatter_provider.dart';
import '../../i18n/strings.g.dart';
import '../../state/filters_store.dart';
import '../../state/meta_store.dart';
import '../../state/preferences.dart';
import '../../state/tx_detail.dart';
import '../../theme/tokens.g.dart';
import '../../ui/charts/sunburst.dart';
import '../../ui_logic/names.dart';
import '../../ui_logic/series_colors.dart';
import '../accounts/accounts_vm.dart' show BalanceLine;
import '../editor/entity_form_vm.dart' show EntityKind;
import '../dashboard/dashboard_vm.dart' show Slice;
import '../../ui_logic/text_table.dart';
import 'budgets_vm.dart';

enum RankingView { bars, treemap, sunburst }

enum RankingKind { expense, income }

/// What a ranking route says: what to group by, which side, and whether the side can be switched.
typedef RankingOptions = ({GroupBy by, RankingKind kind, bool fixedKind});

/// The routes of the ranking screen, as the web's route data has them.
const rankingCategories = (by: GroupBy.CATEGORY, kind: RankingKind.expense, fixedKind: false);
const rankingTags = (by: GroupBy.TAG, kind: RankingKind.expense, fixedKind: false);
const rankingMerchants = (by: GroupBy.COUNTERPARTY, kind: RankingKind.expense, fixedKind: true);
const rankingIncomeSources = (by: GroupBy.COUNTERPARTY, kind: RankingKind.income, fixedKind: true);

/// The four routes that show a ranking.
enum RankingRoute {
  categories(rankingCategories),
  tags(rankingTags),
  merchants(rankingMerchants),
  incomeSources(rankingIncomeSources);

  const RankingRoute(this.options);
  final RankingOptions options;
}

/// How many items keep a color of their own; the rest share the "other" gray.
const rankingColored = 7;

/// How many bars and treemap cells are drawn.
const rankingBarLimit = 12;
const rankingTreemapLimit = 30;

/// How many series the trend chart draws.
const rankingTrendLimit = 6;

/// The kind the user chose unless the route pins it.
RankingKind resolveKind(bool fixed, RankingKind route, String? param) {
  if (fixed) return route;
  return param == 'income' ? RankingKind.income : (param == 'expense' ? RankingKind.expense : route);
}

/// The view asked for; the budget sunburst only exists for expense categories.
RankingView resolveView(String? param, GroupBy by, RankingKind kind) {
  if (param == 'sunburst' && by == GroupBy.CATEGORY && kind == RankingKind.expense) return RankingView.sunburst;
  return param == 'treemap' ? RankingView.treemap : RankingView.bars;
}

/// The drill filter key of each grouping.
String _filterKey(GroupBy by) => groupByValues.reverse[by]!;

final rankingKindParamProvider = StateProvider.family<String?, RankingOptions>((ref, o) => null);
final rankingViewParamProvider = StateProvider.family<String?, RankingOptions>((ref, o) => null);

final rankingKindProvider = Provider.autoDispose.family<RankingKind, RankingOptions>((ref, o) => resolveKind(o.fixedKind, o.kind, ref.watch(rankingKindParamProvider(o))));

final rankingViewProvider = Provider.autoDispose.family<RankingView, RankingOptions>((ref, o) => resolveView(ref.watch(rankingViewParamProvider(o)), o.by, ref.watch(rankingKindProvider(o))));

final rankingReportProvider = FutureProvider.autoDispose.family<RankingReport, RankingOptions>((ref, o) async {
  final params = {...ref.watch(filterQueryProvider), 'by': _filterKey(o.by), 'kind': ref.watch(rankingKindProvider(o)).name};
  final response = await ref.watch(dioProvider).get<Object?>('/api/reports/ranking', queryParameters: params);
  return unwrapReport(response.data, RankingReport.fromJson);
});

/// Categories · Tags · Merchants (expense accounts) · Income sources (revenue accounts): ranking, distribution and trend.
/// Port of libs/client/src/features/analysis/ranking.vm.ts.
class RankingViewModel {
  RankingViewModel({
    required this.options,
    required this.kind,
    required this.view,
    required this.res,
    required this.budgets,
    required this.lookups,
    required this.f,
    required this.t,
    required this.colors,
    required this.tokens,
    required this.detail,
    required this.write,
  });

  final RankingOptions options;
  final RankingKind kind;
  final RankingView view;
  final AsyncValue<RankingReport> res;

  /// Only asked for while the sunburst shows.
  final AsyncValue<BudgetsReport>? budgets;

  /// Categories, tags and accounts, to find the id of a tag by its name.
  final Lookups? lookups;
  final Formatter f;
  final Translations t;
  final SeriesColors colors;
  final ThemeTokens tokens;
  final TxDetailNotifier detail;

  /// Writes the screen's own state: the side and the view.
  final void Function({RankingKind? kind, RankingView? view}) write;

  GroupBy get by => options.by;

  RankingReport? get r => res.valueOrNull;

  bool get initialLoading => res.isLoading && r == null;

  List<RankingItem> get items => r?.items ?? const [];

  bool get canSunburst => by == GroupBy.CATEGORY && kind == RankingKind.expense;

  double? get count {
    final total = items.fold<double>(0, (s, i) => s + i.count);
    return total == 0 ? null : total;
  }

  double? get avgTicket => count == null ? null : (r?.total ?? 0) / count!;

  Color get accent => kind == RankingKind.income ? tokens.moneyIncome : tokens.moneyExpense;

  String get _colorKind => '${_filterKey(by)}:${kind.name}';

  String _fallback(Translations t) => by == GroupBy.TAG ? t.common.untagged : (by == GroupBy.BUDGET ? t.common.noBudget : t.common.uncategorized);

  String nameOf(({String? id, String name}) it) => entityName(t, it.name, it.id, fallback: _fallback);

  String itemName(RankingItem it) => nameOf((id: it.id, name: it.name));

  /// Top items keep their own slot (stable per entity); the rest share the "other" gray.
  Color colorOf(RankingItem it) {
    final rank = items.indexOf(it);
    return rank >= 0 && rank < rankingColored ? colors.color(_colorKind, it.id) : colors.other();
  }

  List<Slice> get slices => [for (final it in items) Slice(id: it.id, name: itemName(it), value: it.value, color: colorOf(it))];

  /// The items the bar view draws, biggest first.
  List<RankingItem> get barItems => items.take(rankingBarLimit).toList();

  List<Slice> get treemapSlices => slices.take(rankingTreemapLimit).toList();

  /// Inner ring = budgets, outer ring = what was spent in each by category; what no budget covers is the last group. `null` until the
  /// budgets arrive.
  List<SunburstGroup>? get sunburstGroups {
    final b = budgets?.valueOrNull;
    if (b == null) return null;
    final budgeted = <String?, double>{};
    final groups = <SunburstGroup>[];
    for (final x in b.budgets.where((x) => x.spent > 0)) {
      for (final c in x.categories) {
        budgeted[c.id] = (budgeted[c.id] ?? 0) + c.value;
      }
      groups.add(SunburstGroup(name: x.name, color: colors.color('budget', x.id), children: [for (final c in x.categories) SunburstChild(name: entityName(t, c.name, c.id), value: c.value)]));
    }
    final rest = [
      for (final it in items)
        if (it.value - (budgeted[it.id] ?? 0) > 0.005) SunburstChild(name: itemName(it), value: it.value - (budgeted[it.id] ?? 0)),
    ];
    if (rest.isNotEmpty) groups.add(SunburstGroup(name: t.common.noBudget, color: colors.other(), children: rest));
    return groups;
  }

  /// The monthly series of the top items; `null` when there are none.
  List<BalanceLine>? get trend {
    final report = r;
    if (report == null || report.trend.isEmpty) return null;
    return [for (final x in report.trend.take(rankingTrendLimit)) BalanceLine(id: x.id ?? '__none__', name: nameOf((id: x.id, name: x.name)), values: [for (final p in x.points) p.value], color: colors.color(_colorKind, x.id))];
  }

  TextTable? get table => items.isEmpty
      ? null
      : TextTable(
          columns: [t.ranking.name, t.common.total, t.ranking.share, t.ranking.count, t.ranking.avgTicket],
          rows: [for (final it in items) [itemName(it), f.money(it.value), f.pct(it.share), it.count.toInt().toString(), f.money(it.avg)]],
        );

  /// Categories, tags and merchants / income sources (expense and revenue accounts) can be created and edited from here.
  EntityKind? get entityKind => switch (by) {
        GroupBy.CATEGORY => EntityKind.category,
        GroupBy.TAG => EntityKind.tag,
        GroupBy.COUNTERPARTY => EntityKind.account,
        _ => null,
      };

  /// The kind of account a new merchant or income source is.
  String get newAccountType => kind == RankingKind.income ? 'revenue' : 'expense';

  /// The route that creates one.
  String? get createRoute => switch (entityKind) {
        null => null,
        EntityKind.account => '/edit/account?type=$newAccountType',
        final k => '/edit/${k.name}',
      };

  /// The id the editor needs for a row. Tag rows are identified by their name, so the id comes from the lookups.
  String? entityId(RankingItem it) {
    if (it.id == null) return null;
    if (by == GroupBy.TAG) return lookups?.tags.where((x) => x.name == it.id).firstOrNull?.id;
    return entityKind == null ? null : it.id;
  }

  /// The route that edits a row, if it can be.
  String? editRoute(RankingItem it) {
    final id = entityId(it), k = entityKind;
    return id == null || k == null ? null : '/edit/${k.name}/${Uri.encodeComponent(id)}';
  }

  void setKind(RankingKind next) => write(kind: next);

  void setView(RankingView next) => write(view: next);

  void open(RankingItem it) {
    detail.open(itemName(it), {'type': kind == RankingKind.income ? 'deposit' : 'withdrawal', _filterKey(by): it.id ?? 'none'});
  }

  /// The item at [index] of the bars or of the list (the phone draws them top first).
  bool openAt(int index) {
    if (index < 0 || index >= items.length) return false;
    open(items[index]);
    return true;
  }

  bool openId(String? id) {
    final it = items.where((i) => i.id == id).firstOrNull;
    if (it == null) return false;
    open(it);
    return true;
  }
}

final rankingViewModelProvider = Provider.autoDispose.family<RankingViewModel, RankingOptions>((ref, o) {
  ref.watch(preferencesProvider.select((p) => p.lang));
  // The notifiers are taken now: a closure must not use `ref` once a dependency changed and the provider has not rebuilt yet.
  final kinds = ref.read(rankingKindParamProvider(o).notifier);
  final views = ref.read(rankingViewParamProvider(o).notifier);
  final view = ref.watch(rankingViewProvider(o));
  return RankingViewModel(
    options: o,
    kind: ref.watch(rankingKindProvider(o)),
    view: view,
    res: ref.watch(rankingReportProvider(o)),
    budgets: view == RankingView.sunburst ? ref.watch(budgetsReportProvider) : null,
    lookups: ref.watch(lookupsProvider).valueOrNull,
    f: ref.watch(formatterProvider),
    t: t,
    colors: ref.watch(seriesColorsProvider),
    tokens: themeTokens[ref.watch(preferencesProvider.select((p) => p.theme))]!,
    detail: ref.read(txDetailProvider.notifier),
    write: ({kind, view}) {
      if (kind != null) kinds.state = kind.name;
      if (view != null) views.state = view.name;
    },
  );
});
