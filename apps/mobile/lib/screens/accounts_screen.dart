import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/models.g.dart' show AccountSummary;
import '../api/resources.dart';
import '../features/accounts/accounts_vm.dart';
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../theme/app_theme.dart';
import '../ui/charts.dart';
import '../ui/chart_card.dart';
import '../ui/common.dart';
import '../ui/labels.dart';
import '../ui/months_picker.dart';
import '../ui/period_bar.dart';

/// Asset accounts: balances, the period's flow and the balance history.
class AccountsScreen extends ConsumerWidget {
  const AccountsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final vm = ref.watch(accountsViewModelProvider);
    final f = ref.watch(formatterProvider);
    final data = vm.data;
    final scheme = Theme.of(context).colorScheme;
    final tokens = context.tokens;

    Widget card(AccountSummary a, Widget trailing, {VoidCallback? onTap}) => Opacity(
        // an account kept out of the totals is shown dimmed, like on the web
        opacity: a.excluded ? 0.6 : 1,
        child: Card(
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 8, 6, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: Container(key: Key('account-dot-${a.id}'), width: 10, height: 10, decoration: BoxDecoration(color: vm.colors.color('account', a.id), borderRadius: BorderRadius.circular(3))),
                      ),
                      Expanded(child: Text(a.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15), maxLines: 1, overflow: TextOverflow.ellipsis)),
                      Text(f.money(a.balance), style: numStyle(context, size: 15, weight: FontWeight.w600)),
                      trailing,
                    ],
                  ),
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            [a.currency, if (a.role != null) accountRoleLabel(t, a.role), if (a.excluded) t.accounts.excluded].join(' · '),
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
                          ),
                        ),
                        if (a.currency != f.currency) Text(f.money(a.balanceOriginal, currency: a.currency), style: numStyle(context, size: 12, color: scheme.onSurfaceVariant)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text(f.money(a.income, signed: true), style: numStyle(context, size: 12, color: f.hidden ? null : tokens.moneyIncome)),
                      const SizedBox(width: 16),
                      Text(f.money(-a.expense), style: numStyle(context, size: 12, color: f.hidden ? null : tokens.moneyExpense)),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      );

    return Scaffold(
      appBar: AppBar(
        title: Text(t.nav.sections.accounts),
        actions: [IconButton(key: const Key('new-account'), tooltip: t.editor.entity.account.kNew, icon: const Icon(Icons.add), onPressed: () => context.push('/edit/account')), const PrivacyButton()],
        bottom: const PeriodBar(),
      ),
      body: RefreshIndicator(
        onRefresh: () => refreshAll(ref),
        child: ListView(
          key: const Key('accounts'),
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
          children: [
            if (vm.report.hasError && data == null)
              EmptyState(icon: Icons.cloud_off_outlined, title: t.errors.load, onRetry: () => ref.invalidate(accountsReportProvider))
            else if (data == null)
              const Padding(padding: EdgeInsets.symmetric(vertical: 48), child: Center(child: CircularProgressIndicator()))
            else ...[
              Padding(padding: const EdgeInsets.fromLTRB(4, 0, 4, 8), child: Text(t.accounts.description, style: TextStyle(color: scheme.onSurfaceVariant))),
              SectionCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t.accounts.total.toUpperCase(), style: Theme.of(context).textTheme.labelSmall?.copyWith(color: scheme.onSurfaceVariant, letterSpacing: 0.6)),
                    const SizedBox(height: 4),
                    Text(f.money(data.total), style: numStyle(context, size: 26, weight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Text(f.money(vm.income, signed: true), style: numStyle(context, size: 13, weight: FontWeight.w600, color: f.hidden ? null : tokens.moneyIncome)),
                        const SizedBox(width: 16),
                        Text(f.money(-(vm.expense ?? 0)), style: numStyle(context, size: 13, weight: FontWeight.w600, color: f.hidden ? null : tokens.moneyExpense)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  if (vm.reordering) ...[
                    TextButton.icon(key: const Key('reorder-reset'), onPressed: vm.reset, icon: const Icon(Icons.restart_alt, size: 18), label: Text(t.accounts.reorder.reset)),
                    const Spacer(),
                    FilledButton.tonalIcon(
                        key: const Key('reorder-done'),
                        style: FilledButton.styleFrom(minimumSize: const Size(0, 44)),
                        onPressed: () => vm.setReordering(false),
                        icon: const Icon(Icons.check, size: 18),
                        label: Text(t.accounts.reorder.done)),
                  ] else ...[
                    const Spacer(),
                    OutlinedButton.icon(key: const Key('reorder-start'), onPressed: () => vm.setReordering(true), icon: const Icon(Icons.swap_vert, size: 18), label: Text(t.accounts.reorder.start)),
                  ],
                ],
              ),
              if (vm.reordering)
                Padding(padding: const EdgeInsets.fromLTRB(4, 8, 4, 0), child: Text(t.accounts.reorder.hint, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant))),
              const SizedBox(height: 8),
              if (vm.reordering)
                ReorderableListView(
                  key: const Key('accounts-reorder'),
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  buildDefaultDragHandles: false,
                  onReorder: vm.reorder,
                  children: [
                    for (final (i, a) in vm.rows.indexed)
                      Padding(
                        key: ValueKey(a.id),
                        padding: const EdgeInsets.only(bottom: 8),
                        child: card(
                          a,
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                  key: Key('up-${a.id}'),
                                  tooltip: t.accounts.reorder.up(name: a.name),
                                  icon: const Icon(Icons.arrow_upward, size: 20),
                                  onPressed: i == 0 ? null : () => vm.move(a.id, -1)),
                              IconButton(
                                  key: Key('down-${a.id}'),
                                  tooltip: t.accounts.reorder.down(name: a.name),
                                  icon: const Icon(Icons.arrow_downward, size: 20),
                                  onPressed: i == vm.rows.length - 1 ? null : () => vm.move(a.id, 1)),
                              ReorderableDragStartListener(index: i, child: Padding(padding: const EdgeInsets.all(8), child: Icon(Icons.drag_handle, color: scheme.onSurfaceVariant))),
                            ],
                          ),
                        ),
                      ),
                  ],
                )
              else
                for (final a in vm.rows) ...[
                  card(
                      a,
                      IconButton(
                          key: Key('edit-${a.id}'), tooltip: '${t.editor.tx.edit}: ${a.name}', icon: const Icon(Icons.edit_outlined, size: 20), onPressed: () => context.push('/edit/account/${a.id}')),
                      onTap: () => context.push('/accounts/${a.id}')),
                  const SizedBox(height: 8),
                ],
              const SizedBox(height: 4),
              ChartCard(
                title: t.accounts.balanceHistory,
                fileName: 'account-balances',
                table: vm.table,
                trailing: MonthsPicker(value: vm.months, onChanged: (m) => ref.read(accountsMonthsProvider.notifier).state = m),
                child: vm.lines.isEmpty
                    ? EmptyState(title: t.common.noData)
                    : LinesChart(months: data.months, lines: vm.lines, f: f, height: 220),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
