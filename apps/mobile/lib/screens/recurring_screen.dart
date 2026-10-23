import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/planning/recurring_vm.dart';
import '../format/formatter.dart' show DateStyle;
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../theme/app_theme.dart';
import '../ui/common.dart';
import '../ui/report_page.dart';

/// Firefly's recurring transactions: what repeats, how, and its next dates.
class RecurringScreen extends ConsumerWidget {
  const RecurringScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final vm = ref.watch(recurrencesViewModelProvider);
    final f = ref.watch(formatterProvider);
    final tokens = context.tokens;
    final scheme = Theme.of(context).colorScheme;
    final r = vm.r;

    Widget chip(String label) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(border: Border.all(color: scheme.outlineVariant), borderRadius: BorderRadius.circular(20)),
          child: Text(label, style: const TextStyle(fontSize: 11)),
        );

    return ReportPage(
      title: t.nav.recurring,
      listKey: const Key('recurring'),
      periodBar: false,
      failed: vm.res.hasError && r == null,
      onRetry: () => ref.invalidate(recurrencesReportProvider),
      children: [
        Text(t.recurring.description, style: TextStyle(color: scheme.onSurfaceVariant)),
        const SizedBox(height: 12),
        if (r == null) const SizedBox(height: 200),
        if (r != null && r.recurrences.isEmpty) EmptyState(title: t.recurring.none),
        for (final x in vm.items) ...[
          Opacity(
            opacity: x.active ? 1 : 0.5,
            child: Card(
              key: Key('recurrence-${x.id}'),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(x.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
                              Text('${x.source} → ${x.destination}', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
                            ],
                          ),
                        ),
                        Text(
                          f.money(recurrenceAmount(x), signed: x.type != 'transfer'),
                          style: numStyle(context, size: 14, weight: FontWeight.w600, color: f.hidden ? null : switch (recurrenceTone(x.type)) { RecurrenceTone.income => tokens.moneyIncome, RecurrenceTone.expense => tokens.moneyExpense, RecurrenceTone.none => null }),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Wrap(spacing: 6, runSpacing: 6, children: [chip(vm.typeLabel(x)), chip(x.repetition), if (x.category != null) chip(x.category!), if (!x.active) chip(t.recurring.inactive)]),
                    const SizedBox(height: 10),
                    Text(t.recurring.next.toUpperCase(), style: TextStyle(fontSize: 11, letterSpacing: 0.6, color: scheme.onSurfaceVariant)),
                    const SizedBox(height: 4),
                    if (x.nextOccurrences.isEmpty)
                      Text('—', style: TextStyle(color: scheme.onSurfaceVariant))
                    else
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          for (final d in x.nextOccurrences)
                            Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2), decoration: BoxDecoration(color: scheme.surfaceContainerHighest, borderRadius: BorderRadius.circular(6)), child: Text(f.date(d, DateStyle.short), style: const TextStyle(fontSize: 12))),
                        ],
                      ),
                    if (x.repeatUntil != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(t.recurring.until(date: f.date(x.repeatUntil!, DateStyle.long)), style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant))),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],
      ],
    );
  }
}
