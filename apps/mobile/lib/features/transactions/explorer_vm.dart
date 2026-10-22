import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/api_client.dart';
import '../../api/models.g.dart';
import '../../api/resources.dart';
import '../../i18n/strings.g.dart';
import '../../state/filters_store.dart';
import '../../state/meta_store.dart';
import '../../state/preferences.dart';

enum SortKey { date, description, amount, category }

const explorerPageSize = 50;

/// Amount with the sign the ledger shows: expenses negative.
double signedAmount(TxRow t) => t.type == 'withdrawal' ? -t.amount : t.amount;

int _cmp(String a, String b) => a.toLowerCase().compareTo(b.toLowerCase());

/// Sorted copy of [rows]. Ties on date fall back to the id so the order is stable.
List<TxRow> sortTransactions(List<TxRow> rows, SortKey key, int dir) {
  final sorted = [...rows];
  sorted.sort((a, b) {
    switch (key) {
      case SortKey.amount:
        return signedAmount(a).compareTo(signedAmount(b)) * dir;
      case SortKey.description:
        return _cmp(a.description, b.description) * dir;
      case SortKey.category:
        return _cmp(a.category?.name ?? '', b.category?.name ?? '') * dir;
      case SortKey.date:
        final byDate = a.date.compareTo(b.date) * dir;
        return byDate != 0 ? byDate : a.id.compareTo(b.id) * dir;
    }
  });
  return sorted;
}

/// Direction a column starts in the first time it is chosen: newest / largest first, text A→Z.
int defaultSortDir(SortKey key) => key == SortKey.date || key == SortKey.amount ? -1 : 1;

/// Only single-part expenses, income and transfers are edited in SpaceFly.
bool isEditable(TxRow t) => t.splitCount == 1 && const ['withdrawal', 'deposit', 'transfer'].contains(t.type);

class ExplorerState {
  const ExplorerState({
    this.query = '',
    this.useFirefly = false,
    this.type = '',
    this.category = '',
    this.budget = '',
    this.account = '',
    this.tag = '',
    this.sortKey = SortKey.date,
    this.sortDir = -1,
    this.page = 1,
  });

  /// What was submitted in the search box.
  final String query;
  final bool useFirefly;
  final String type;
  final String category;
  final String budget;
  final String account;
  final String tag;
  final SortKey sortKey;
  final int sortDir;

  /// Firefly search: the server page. Period list: how many pages of [explorerPageSize] are shown.
  final int page;

  bool get searching => useFirefly && query.isNotEmpty;

  /// Filters beyond the period: how many are on.
  int get activeFilters => [type, category, budget, account, tag].where((v) => v.isNotEmpty).length + (useFirefly ? 1 : 0);

  ExplorerState copyWith({String? query, bool? useFirefly, String? type, String? category, String? budget, String? account, String? tag, SortKey? sortKey, int? sortDir, int? page}) =>
      ExplorerState(
        query: query ?? this.query,
        useFirefly: useFirefly ?? this.useFirefly,
        type: type ?? this.type,
        category: category ?? this.category,
        budget: budget ?? this.budget,
        account: account ?? this.account,
        tag: tag ?? this.tag,
        sortKey: sortKey ?? this.sortKey,
        sortDir: sortDir ?? this.sortDir,
        page: page ?? this.page,
      );
}

/// The inputs of the transaction explorer. Any change to a filter, the search or the period goes back to page 1.
/// Port of the state in libs/client/src/features/transactions/explorer.vm.ts.
final explorerProvider = NotifierProvider<ExplorerNotifier, ExplorerState>(ExplorerNotifier.new);

class ExplorerNotifier extends Notifier<ExplorerState> {
  @override
  ExplorerState build() {
    ref.listen(filterQueryProvider, (_, __) => state = state.copyWith(page: 1));
    return const ExplorerState();
  }

  void submitSearch(String text) => state = state.copyWith(query: text.trim(), page: 1);

  void clearSearch() => state = state.copyWith(query: '', page: 1);

  void setUseFirefly(bool value) => state = state.copyWith(useFirefly: value, page: 1);

  void setFilters({String? type, String? category, String? budget, String? account, String? tag}) =>
      state = state.copyWith(type: type, category: category, budget: budget, account: account, tag: tag, page: 1);

  void clearFilters() => state = ExplorerState(query: state.query, sortKey: state.sortKey, sortDir: state.sortDir);

  /// Toggles the direction of the current column, or switches column starting in its default direction.
  void sortBy(SortKey key) {
    if (state.sortKey == key) {
      state = state.copyWith(sortDir: -state.sortDir);
    } else {
      state = state.copyWith(sortKey: key, sortDir: defaultSortDir(key));
    }
  }

  void setPage(int page) => state = state.copyWith(page: page < 1 ? 1 : page);

  void loadMore() => setPage(state.page + 1);
}

/// The period's ledger with the filters; `null` while Firefly's own search is in use.
final explorerListProvider = FutureProvider.autoDispose<TxListResponse?>((ref) async {
  final e = ref.watch(explorerProvider);
  if (e.searching) return null;
  final params = <String, Object>{...ref.watch(filterQueryProvider)};
  final extra = {'type': e.type, 'category': e.category, 'budget': e.budget, 'account': e.account, 'tag': e.tag, 'q': e.query};
  for (final entry in extra.entries) {
    if (entry.value.isNotEmpty) params[entry.key] = entry.value;
  }
  final response = await ref.watch(dioProvider).get<Object?>('/api/transactions', queryParameters: params);
  return unwrapReport(response.data, TxListResponse.fromJson);
});

/// Firefly's own search (`/v1/search/transactions`, full Firefly query syntax); `null` when not searching.
final explorerSearchProvider = FutureProvider.autoDispose<SearchResponse?>((ref) async {
  final e = ref.watch(explorerProvider);
  if (!e.searching) return null;
  final params = {'query': e.query, 'page': e.page, 'limit': explorerPageSize, 'currency': ref.watch(currencyProvider), '_r': ref.watch(filtersProvider).refreshTick};
  final response = await ref.watch(dioProvider).get<Object?>('/api/search', queryParameters: params);
  return unwrapReport(response.data, SearchResponse.fromJson);
});

class FilterOption {
  const FilterOption(this.value, this.label);
  final String value;
  final String label;
}

class ExplorerView {
  ExplorerView({required this.state, required this.list, required this.search, required this.lookups, required this.t});

  final ExplorerState state;
  final AsyncValue<TxListResponse?> list;
  final AsyncValue<SearchResponse?> search;
  final Lookups? lookups;
  final Translations t;

  bool get searching => state.searching;

  bool get loading => list.isLoading || search.isLoading;

  Object? get error => searching ? search.error : list.error;

  TxListResponse? get listData => list.valueOrNull;

  SearchResponse? get searchData => search.valueOrNull;

  /// Everything the period's list holds (or the current search page), in the chosen order.
  List<TxRow> get sorted => searching ? (searchData?.rows ?? const []) : sortTransactions(listData?.rows ?? const [], state.sortKey, state.sortDir);

  int get totalPages => searching ? (searchData?.totalPages.toInt() ?? 1) : (sorted.length / explorerPageSize).ceil().clamp(1, 1 << 30);

  /// What the screen shows: the search page, or the first `page × 50` of the list.
  List<TxRow> get shownRows => searching ? sorted : sorted.take(state.page * explorerPageSize).toList();

  bool get hasMore => searching ? state.page < totalPages : sorted.length > state.page * explorerPageSize;

  List<FilterOption> get categoryOptions => [FilterOption('none', t.common.uncategorized), for (final c in lookups?.categories ?? const <LookupItem>[]) FilterOption(c.id, c.name)];
  List<FilterOption> get budgetOptions => [FilterOption('none', t.common.noBudget), for (final b in lookups?.budgets ?? const <LookupItem>[]) FilterOption(b.id, b.name)];
  List<FilterOption> get accountOptions => [for (final a in lookups?.accounts ?? const <LookupItem>[]) FilterOption(a.id, a.name)];
  List<FilterOption> get tagOptions => [for (final x in lookups?.tags ?? const <LookupItem>[]) FilterOption(x.name, x.name)];
}

final explorerViewProvider = Provider.autoDispose<ExplorerView>((ref) {
  ref.watch(preferencesProvider.select((p) => p.lang));
  return ExplorerView(
    state: ref.watch(explorerProvider),
    list: ref.watch(explorerListProvider),
    search: ref.watch(explorerSearchProvider),
    lookups: ref.watch(lookupsProvider).valueOrNull,
    t: t,
  );
});
