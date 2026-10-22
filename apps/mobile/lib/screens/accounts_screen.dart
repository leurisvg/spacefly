import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/resources.dart';
import '../features/accounts/accounts_vm.dart';
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../theme/app_theme.dart';
import '../ui/charts.dart';
import '../ui/common.dart';
import '../ui/labels.dart';
import '../ui/period_bar.dart';

const accountHistoryMonths = ['6', '12', '24', '36'];

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

    return Scaffold(
      appBar: AppBar(title: Text(t.nav.sections.accounts), actions: const [PrivacyButton()], bottom: const PeriodBar()),
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
              for (final a in vm.rows) ...[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(child: Text(a.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15), maxLines: 1, overflow: TextOverflow.ellipsis)),
                            Text(f.money(a.balance), style: numStyle(context, size: 15, weight: FontWeight.w600)),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Row(
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
                const SizedBox(height: 8),
              ],
              const SizedBox(height: 4),
              SectionCard(
                title: t.accounts.balanceHistory,
                trailing: SegmentedButton<String>(
                  key: const Key('history-months'),
                  showSelectedIcon: false,
                  style: const ButtonStyle(visualDensity: VisualDensity.compact),
                  segments: [for (final m in accountHistoryMonths) ButtonSegment(value: m, label: Text('$m${t.accounts.monthsShort}'))],
                  selected: {vm.months},
                  onSelectionChanged: (v) => ref.read(accountsMonthsProvider.notifier).state = v.first,
                ),
                child: vm.lines.isEmpty
                    ? EmptyState(title: t.common.noData)
                    : Column(
                        children: [
                          LinesChart(months: data.months, lines: vm.lines, f: f, height: 220),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 14,
                            runSpacing: 4,
                            children: [
                              for (final l in vm.lines)
                                Row(mainAxisSize: MainAxisSize.min, children: [
                                  Container(width: 10, height: 10, decoration: BoxDecoration(color: l.color, borderRadius: BorderRadius.circular(3))),
                                  const SizedBox(width: 6),
                                  Text(l.name, style: Theme.of(context).textTheme.bodySmall),
                                ]),
                            ],
                          ),
                        ],
                      ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
