import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/resources.dart';
import '../api/models.g.dart' show TxRow;
import '../features/transactions/explorer_vm.dart';
import '../features/transactions/transaction_actions.dart';
import '../platform/platform.dart';
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../theme/app_theme.dart';
import '../ui/common.dart';
import '../ui/labels.dart';
import '../ui/period_bar.dart';
import '../ui/tx_tile.dart';

enum _RowAction { edit, editInFirefly, openInFirefly, delete }

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

  /// Any record is deleted by swiping it away (a record of several parts says so in the question). The question and the delete are
  /// the actions'; the row goes when the list is fetched again, so the swipe itself never removes it.
  Widget _swipeToDelete(TxRow tx, Widget child) {
    final scheme = Theme.of(context).colorScheme;
    return Dismissible(
      key: ValueKey('tx-${tx.id}'),
      direction: DismissDirection.endToStart,
      background: Container(alignment: Alignment.centerRight, padding: const EdgeInsets.only(right: 20), color: scheme.errorContainer, child: Icon(Icons.delete_outline, color: scheme.onErrorContainer)),
      confirmDismiss: (_) async {
        await ref.read(transactionActionsProvider).remove(groupId: tx.groupId, name: tx.description, splitCount: tx.splitCount.toInt(), thenGoBack: false);
        return false;
      },
      child: child,
    );
  }

  /// The row's menu (long press): edit (in SpaceFly, or in Firefly when it can't be edited here), open in Firefly, delete.
  Future<void> _rowMenu(ExplorerView view, TxRow tx) async {
    final t = context.t;
    final editable = isEditable(tx);
    final show = view.fireflyLink(tx);
    final edit = view.fireflyEditLink(tx);
    final action = await showModalBottomSheet<_RowAction>(
      context: context,
      showDragHandle: true,
      builder: (sheet) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(title: Text(t.editor.tx.actions, style: Theme.of(sheet).textTheme.titleSmall), subtitle: Text(tx.description, maxLines: 1, overflow: TextOverflow.ellipsis)),
            if (editable)
              ListTile(key: const Key('row-menu-edit'), leading: const Icon(Icons.edit_outlined), title: Text(t.editor.tx.edit), onTap: () => Navigator.pop(sheet, _RowAction.edit))
            else if (edit != null)
              ListTile(key: const Key('row-menu-edit-firefly'), leading: const Icon(Icons.edit_outlined), title: Text(t.editor.tx.editInFirefly), onTap: () => Navigator.pop(sheet, _RowAction.editInFirefly)),
            if (show != null) ListTile(key: const Key('row-menu-open-firefly'), leading: const Icon(Icons.open_in_new), title: Text(t.tx.openInFirefly), onTap: () => Navigator.pop(sheet, _RowAction.openInFirefly)),
            ListTile(
              key: const Key('row-menu-delete'),
              leading: Icon(Icons.delete_outline, color: Theme.of(sheet).colorScheme.error),
              title: Text(t.forms.delete, style: TextStyle(color: Theme.of(sheet).colorScheme.error)),
              onTap: () => Navigator.pop(sheet, _RowAction.delete),
            ),
          ],
        ),
      ),
    );
    if (action == null || !mounted) return;
    switch (action) {
      case _RowAction.edit:
        context.push('/transactions/${tx.groupId}/edit');
      case _RowAction.editInFirefly:
        await launchUrl(Uri.parse(edit!), mode: LaunchMode.externalApplication);
      case _RowAction.openInFirefly:
        await launchUrl(Uri.parse(show!), mode: LaunchMode.externalApplication);
      case _RowAction.delete:
        await ref.read(transactionActionsProvider).remove(groupId: tx.groupId, name: tx.description, splitCount: tx.splitCount.toInt(), thenGoBack: false);
    }
  }

  /// Hands the CSV of the list to the share sheet.
  Future<void> _export(ExplorerView view) async {
    final csv = view.csv;
    if (csv == null) return;
    try {
      await ref.read(fileShareProvider).shareText(fileName: csv.fileName, text: csv.text);
    } catch (_) {
      if (mounted) ref.read(toastProvider).error(context.t.errors.generic);
    }
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
            key: const Key('export-csv'),
            tooltip: view.hidden ? t.explorer.exportHidden : t.explorer.export,
            icon: const Icon(Icons.file_download_outlined),
            onPressed: view.csv == null ? null : () => _export(view),
          ),
          IconButton(
            key: const Key('filters'),
            icon: Badge(isLabelVisible: state.activeFilters > 0, label: Text('${state.activeFilters}'), child: const Icon(Icons.tune)),
            onPressed: () => showFiltersSheet(context),
          ),
          const PrivacyButton(),
        ],
        bottom: const PeriodBar(),
      ),
      floatingActionButton: FloatingActionButton(key: const Key('new-transaction'), tooltip: t.nav.newTransaction, onPressed: () => context.push('/transactions/new'), child: const Icon(Icons.add)),
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
                _swipeToDelete(
                  tx,
                  TxTile(tx: tx, f: f, onTap: () => context.push('/transactions/${tx.groupId}', extra: tx), onLongPress: () => _rowMenu(view, tx)),
                ),
                const Divider(),
              ],
              if (view.searching)
                _Pager(page: state.page, pages: view.totalPages, onPage: notifier.setPage)
              else if (view.hasMore)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: OutlinedButton(key: const Key('load-more'), onPressed: notifier.loadMore, child: Text(t.explorer.loadMore)),
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

  Widget _dropdown(String label, String all, String value, List<FilterOption> options, void Function(String) onChanged, {Key? key}) => Padding(
        padding: const EdgeInsets.only(top: 12),
        child: DropdownButtonFormField<String>(
          key: key,
          value: options.any((o) => o.value == value) ? value : '',
          isExpanded: true,
          decoration: InputDecoration(labelText: label),
          items: [
            DropdownMenuItem(value: '', child: Text(all)),
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
    // Firefly's own search ignores the filters, so they are hidden while it is on (like the web).
    final searching = _firefly && ref.watch(explorerProvider).query.isNotEmpty;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 0, 16, 16 + MediaQuery.of(context).viewInsets.bottom),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (!searching)
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
              if (!searching) ...[
                _dropdown(t.common.category, t.calendar.allCategories, _category, view.categoryOptions, (v) => _category = v, key: const Key('filter-category')),
                _dropdown(t.common.budget, t.explorer.allBudgets, _budget, view.budgetOptions, (v) => _budget = v),
                _dropdown(t.common.account, t.calendar.allAccounts, _account, view.accountOptions, (v) => _account = v),
                _dropdown(t.common.tag, t.calendar.allTags, _tag, view.tagOptions, (v) => _tag = v),
              ],
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
