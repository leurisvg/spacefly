import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/resources.dart';
import '../features/transactions/explorer_vm.dart';
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../theme/app_theme.dart';
import '../ui/common.dart';
import '../ui/labels.dart';
import '../ui/period_bar.dart';
import '../ui/tx_tile.dart';

String sortLabel(Translations t, SortKey key) => switch (key) {
      SortKey.date => t.common.date,
      SortKey.description => t.explorer.descriptionCol,
      SortKey.amount => t.common.amount,
      SortKey.category => t.common.category,
    };

/// The period's ledger: search, filters, sort, and a list that grows as you ask for more. Port of the explorer view-model.
class TransactionsScreen extends ConsumerStatefulWidget {
  const TransactionsScreen({super.key});

  @override
  ConsumerState<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends ConsumerState<TransactionsScreen> {
  final _search = TextEditingController();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _submit() => ref.read(explorerProvider.notifier).submitSearch(_search.text);

  void _clear() {
    _search.clear();
    ref.read(explorerProvider.notifier).clearSearch();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final view = ref.watch(explorerViewProvider);
    final f = ref.watch(formatterProvider);
    final state = view.state;
    final notifier = ref.read(explorerProvider.notifier);
    final scheme = Theme.of(context).colorScheme;
    final rows = view.shownRows;
    final totals = view.listData?.totals;

    return Scaffold(
      appBar: AppBar(
        title: Text(t.nav.sections.transactions),
        actions: [
          IconButton(
            key: const Key('filters'),
            icon: Badge(isLabelVisible: state.activeFilters > 0, label: Text('${state.activeFilters}'), child: const Icon(Icons.tune)),
            onPressed: () => showFiltersSheet(context),
          ),
          const PrivacyButton(),
        ],
        bottom: const PeriodBar(),
      ),
      body: RefreshIndicator(
        onRefresh: () => refreshAll(ref),
        child: ListView(
          key: const Key('transactions'),
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
          children: [
            TextField(
              key: const Key('search'),
              controller: _search,
              textInputAction: TextInputAction.search,
              onSubmitted: (_) => _submit(),
              decoration: InputDecoration(
                hintText: t.common.search,
                prefixIcon: const Icon(Icons.search),
                suffixIcon: state.query.isEmpty && _search.text.isEmpty ? null : IconButton(tooltip: t.explorer.clear, icon: const Icon(Icons.close), onPressed: _clear),
                isDense: true,
              ),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 8),
            if (!view.searching)
              SizedBox(
                height: 40,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    for (final key in SortKey.values)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          key: Key('sort-${key.name}'),
                          selected: state.sortKey == key,
                          showCheckmark: false,
                          label: Row(mainAxisSize: MainAxisSize.min, children: [
                            Text(sortLabel(t, key)),
                            if (state.sortKey == key) Icon(state.sortDir == 1 ? Icons.arrow_upward : Icons.arrow_downward, size: 14),
                          ]),
                          onSelected: (_) => notifier.sortBy(key),
                        ),
                      ),
                  ],
                ),
              ),
            if (view.searching)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Icon(Icons.manage_search, size: 18, color: scheme.primary),
                    const SizedBox(width: 6),
                    Expanded(child: Text(t.explorer.fireflySyntax, style: TextStyle(color: scheme.onSurfaceVariant))),
                    if (view.searchData != null) Text(t.explorer.results(n: view.searchData!.total.toInt()), style: numStyle(context, size: 12, color: scheme.onSurfaceVariant)),
                  ],
                ),
              )
            else if (totals != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(t.explorer.results(n: view.sorted.length), style: numStyle(context, size: 12, color: scheme.onSurfaceVariant)),
                    Text(f.money(totals.income, signed: true), style: numStyle(context, size: 12, weight: FontWeight.w600, color: f.hidden ? null : context.tokens.moneyIncome)),
                    Text(f.money(-totals.expense), style: numStyle(context, size: 12, weight: FontWeight.w600, color: f.hidden ? null : context.tokens.moneyExpense)),
                  ],
                ),
              ),
            if (view.error != null && rows.isEmpty)
              EmptyState(icon: Icons.cloud_off_outlined, title: t.errors.load, onRetry: () {
                ref.invalidate(explorerListProvider);
                ref.invalidate(explorerSearchProvider);
              })
            else if (view.loading && rows.isEmpty)
              const Padding(padding: EdgeInsets.symmetric(vertical: 48), child: Center(child: CircularProgressIndicator()))
            else if (rows.isEmpty)
              EmptyState(title: t.common.noResults)
            else ...[
              for (final tx in rows) ...[
                TxTile(tx: tx, f: f, onTap: () => context.push('/transactions/${tx.groupId}', extra: tx)),
                const Divider(),
              ],
              if (view.searching)
                _Pager(page: state.page, pages: view.totalPages, onPage: notifier.setPage)
              else if (view.hasMore)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: OutlinedButton(key: const Key('load-more'), onPressed: notifier.loadMore, child: Text(t.common.viewAll)),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class _Pager extends StatelessWidget {
  const _Pager({required this.page, required this.pages, required this.onPage});

  final int page;
  final int pages;
  final void Function(int page) onPage;

  @override
  Widget build(BuildContext context) => Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          IconButton(icon: const Icon(Icons.chevron_left), onPressed: page > 1 ? () => onPage(page - 1) : null),
          Text(context.t.explorer.page(page: page, pages: pages)),
          IconButton(icon: const Icon(Icons.chevron_right), onPressed: page < pages ? () => onPage(page + 1) : null),
        ],
      );
}

Future<void> showFiltersSheet(BuildContext context) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => const _FiltersSheet(),
    );

class _FiltersSheet extends ConsumerStatefulWidget {
  const _FiltersSheet();

  @override
  ConsumerState<_FiltersSheet> createState() => _FiltersSheetState();
}

class _FiltersSheetState extends ConsumerState<_FiltersSheet> {
  late String _type;
  late String _category;
  late String _budget;
  late String _account;
  late String _tag;
  late bool _firefly;

  @override
  void initState() {
    super.initState();
    final s = ref.read(explorerProvider);
    _type = s.type;
    _category = s.category;
    _budget = s.budget;
    _account = s.account;
    _tag = s.tag;
    _firefly = s.useFirefly;
  }

  Widget _dropdown(String label, String value, List<FilterOption> options, void Function(String) onChanged, {Key? key}) => Padding(
        padding: const EdgeInsets.only(top: 12),
        child: DropdownButtonFormField<String>(
          key: key,
          value: options.any((o) => o.value == value) ? value : '',
          isExpanded: true,
          decoration: InputDecoration(labelText: label),
          items: [
            DropdownMenuItem(value: '', child: Text(context.t.explorer.allTypes)),
            for (final o in options) DropdownMenuItem(value: o.value, child: Text(o.label, overflow: TextOverflow.ellipsis)),
          ],
          onChanged: (v) => setState(() => onChanged(v ?? '')),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final view = ref.watch(explorerViewProvider);
    final notifier = ref.read(explorerProvider.notifier);
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 0, 16, 16 + MediaQuery.of(context).viewInsets.bottom),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SegmentedButton<String>(
                key: const Key('filter-type'),
                showSelectedIcon: false,
                segments: [
                  ButtonSegment(value: '', label: Text(t.explorer.allTypes)),
                  ButtonSegment(value: 'withdrawal', label: Text(txTypeLabel(t, 'withdrawal'))),
                  ButtonSegment(value: 'deposit', label: Text(txTypeLabel(t, 'deposit'))),
                  ButtonSegment(value: 'transfer', label: Text(txTypeLabel(t, 'transfer'))),
                ],
                selected: {_type},
                onSelectionChanged: (v) => setState(() => _type = v.first),
              ),
              _dropdown(t.common.category, _category, view.categoryOptions, (v) => _category = v, key: const Key('filter-category')),
              _dropdown(t.common.budget, _budget, view.budgetOptions, (v) => _budget = v),
              _dropdown(t.common.account, _account, view.accountOptions, (v) => _account = v),
              _dropdown(t.common.tag, _tag, view.tagOptions, (v) => _tag = v),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(t.explorer.fireflySyntax),
                subtitle: Text(t.explorer.fireflySyntaxHint),
                value: _firefly,
                onChanged: (v) => setState(() => _firefly = v),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        notifier.clearFilters();
                        notifier.setUseFirefly(false);
                        Navigator.of(context).pop();
                      },
                      child: Text(t.explorer.clear),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      key: const Key('filters-apply'),
                      onPressed: () {
                        notifier.setFilters(type: _type, category: _category, budget: _budget, account: _account, tag: _tag);
                        notifier.setUseFirefly(_firefly);
                        Navigator.of(context).pop();
                      },
                      child: Text(t.period.apply),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
