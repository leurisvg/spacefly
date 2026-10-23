import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/accounts/savings_vm.dart';
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../theme/app_theme.dart';
import '../ui/common.dart';
import '../ui/kpi_card.dart';
import '../ui/months_picker.dart';
import '../ui/report_page.dart';
import '../ui/savings_multiples.dart';

/// Savings accounts: their balances over time, and the total of them all.
class SavingsScreen extends ConsumerWidget {
  const SavingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final vm = ref.watch(savingsViewModelProvider);
    final f = ref.watch(formatterProvider);
    final tokens = context.tokens;
    final scheme = Theme.of(context).colorScheme;
    final s = vm.data;

    return ReportPage(
      title: t.nav.savings,
      listKey: const Key('savings'),
      periodBar: false,
      failed: vm.res.hasError && s == null,
      onRetry: () => ref.invalidate(savingsReportProvider),
      children: [
        Text(t.savings.description, style: TextStyle(color: scheme.onSurfaceVariant)),
        const SizedBox(height: 8),
        Align(alignment: Alignment.centerLeft, child: MonthsPicker(value: vm.months, onChanged: vm.setMonths)),
        const SizedBox(height: 12),
        KpiGrid(
          children: [
            KpiCard(label: t.savings.total, f: f, accent: tokens.moneySavings, value: vm.total, previous: vm.first, spark: vm.totals, loading: vm.initialLoading),
            StatTile(label: t.savings.accounts, value: s == null ? '—' : s.accounts.length.toString(), accent: tokens.moneySavings),
          ],
        ),
        const SizedBox(height: 12),
        SectionCard(
          title: t.savings.perAccount,
          trailing: TextButton(key: const Key('manage-excluded'), onPressed: () => context.push('/settings/server'), child: Text(t.savings.manageExcluded)),
          child: s == null
              ? const SizedBox(height: 200)
              : s.accounts.isEmpty
                  ? EmptyState(title: t.common.noData)
                  : SavingsMultiples(series: s, f: f, colorOf: vm.colorOf),
        ),
      ],
    );
  }
}
