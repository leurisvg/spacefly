import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../state/filters_store.dart';
import '../ui/months_picker.dart' show historyMonths;
import 'accounts/account_detail_vm.dart';
import 'accounts/accounts_vm.dart';
import 'accounts/net_worth_vm.dart';
import 'accounts/savings_vm.dart';
import 'analysis/budgets_vm.dart';
import 'analysis/ranking_vm.dart';
import 'planning/projection_vm.dart';
import 'reports/calendar_vm.dart';
import 'reports/compare_vm.dart';
import 'reports/flow_vm.dart';

/// The ranking screen a path shows, or `null` for any other path.
RankingRoute? rankingRouteOf(String path) => switch (path) {
      '/analysis/categories' => RankingRoute.categories,
      '/analysis/tags' => RankingRoute.tags,
      '/analysis/merchants' => RankingRoute.merchants,
      '/analysis/income-sources' => RankingRoute.incomeSources,
      _ => null,
    };

/// The account of an `/accounts/:id` path (not net worth, savings or the expense / revenue accounts), or `null`.
String? accountIdOf(String path) {
  final match = RegExp(r'^/accounts/([^/]+)$').firstMatch(path);
  const fixed = {'net-worth', 'savings', 'expense', 'revenue'};
  return match == null || fixed.contains(match.group(1)) ? null : Uri.decodeComponent(match.group(1)!);
}

String? _valid(String? value, List<String> allowed) => allowed.contains(value) ? value : null;

/// Puts the query of a location into the state the screen keeps, as the web's screens read it from the URL
/// (`/reports/flow?mode=tags&threshold=2.5`, `/accounts/12?tab=deposit`, `?p=last30&cur=USD` anywhere). What is absent stays as it was
/// and what is not valid is ignored. Port of the `filters.param(…)` reads of the view-models in libs/client/src/features.
void applyRouteParams(T Function<T>(ProviderListenable<T> provider) read, Uri uri) {
  final q = uri.queryParameters;
  if (q.isEmpty) return;
  final path = uri.path;
  final accountId = accountIdOf(path);

  // An account opens on a period of its own (see `scopePreset`): the link's period is not for it.
  if (accountId == null) read(filtersProvider.notifier).applyParams(q);

  switch (path) {
    case '/reports/flow':
      if (q.containsKey('mode')) read(flowModeProvider.notifier).state = q['mode'] == 'tags' ? FlowMode.tags : FlowMode.budget;
      if (q.containsKey('budgets')) read(flowBudgetsProvider.notifier).state = q['budgets'] != '0';
      if (q.containsKey('incomeCategories')) read(flowIncomeCategoriesProvider.notifier).state = q['incomeCategories'] != '0';
      final threshold = double.tryParse(q['threshold'] ?? '');
      if (q.containsKey('threshold')) read(flowThresholdProvider.notifier).state = threshold ?? 0;
    case '/reports/calendar':
      if (q.containsKey('view')) read(calendarViewProvider.notifier).state = q['view'] == 'year' ? CalendarView.year : CalendarView.month;
      if (q.containsKey('account')) read(calendarAccountProvider.notifier).state = q['account']!;
      if (q.containsKey('category')) read(calendarCategoryProvider.notifier).state = q['category']!;
      if (q.containsKey('tag')) read(calendarTagProvider.notifier).state = q['tag']!;
    case '/reports/compare':
      final mode = CompareMode.values.where((m) => m.name == q['cmp']).firstOrNull;
      if (mode != null) read(compareModeProvider.notifier).state = mode;
      final group = _valid(q['groupBy'], compareGroups);
      if (group != null) read(compareGroupProvider.notifier).state = group;
      final kind = _valid(q['kind'], const ['expense', 'income']);
      if (kind != null) read(compareKindProvider.notifier).state = kind;
      if (q.containsKey('bStart')) read(compareBStartProvider.notifier).state = q['bStart'];
      if (q.containsKey('bEnd')) read(compareBEndProvider.notifier).state = q['bEnd'];
    case '/analysis/budgets':
      final budget = q['budget'];
      if (budget != null && budget.isNotEmpty) read(selectedBudgetProvider.notifier).state = budget;
    case '/planning/projection':
      final days = _valid(q['days'], projectionDays);
      if (days != null) read(projectionDaysProvider.notifier).state = days;
    case '/accounts':
      final months = _valid(q['months'], historyMonths);
      if (months != null) read(accountsMonthsProvider.notifier).state = months;
    case '/accounts/net-worth':
      final months = _valid(q['months'], historyMonths);
      if (months != null) read(netWorthMonthsProvider.notifier).state = months;
    case '/accounts/savings':
      final months = _valid(q['months'], historyMonths);
      if (months != null) read(savingsMonthsProvider.notifier).state = months;
    default:
      final ranking = rankingRouteOf(path);
      if (ranking != null) {
        final kind = _valid(q['kind'], const ['expense', 'income']);
        final view = _valid(q['view'], const ['bars', 'treemap', 'sunburst']);
        if (kind != null) read(rankingKindParamProvider(ranking.options).notifier).state = kind;
        if (view != null) read(rankingViewParamProvider(ranking.options).notifier).state = view;
      } else if (accountId != null) {
        final tab = _valid(q['tab'], accountTabs);
        if (tab != null) read(accountTabProvider(accountId).notifier).state = tab;
      }
  }
}
