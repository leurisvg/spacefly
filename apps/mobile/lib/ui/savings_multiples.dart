import 'package:flutter/material.dart';

import '../api/models.g.dart' show SavingsSeries;
import '../features/accounts/accounts_vm.dart' show BalanceLine;
import '../format/formatter.dart';
import 'charts.dart';
import 'common.dart';

/// One small chart per savings account, each on its own scale, with the account's color and its last balance. Port of
/// apps/web/src/app/shared/charts/savings-multiples.ts (the email's 6-month savings grid).
class SavingsMultiples extends StatelessWidget {
  const SavingsMultiples({super.key, required this.series, required this.f, required this.colorOf});

  final SavingsSeries series;
  final Formatter f;
  final Color Function(String accountId) colorOf;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      children: [
        for (final a in series.accounts)
          Padding(
            key: Key('saving-${a.id}'),
            padding: const EdgeInsets.only(bottom: 12),
            child: Container(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
              decoration: BoxDecoration(border: Border.all(color: scheme.outlineVariant), borderRadius: BorderRadius.circular(12)),
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(width: 10, height: 10, decoration: BoxDecoration(color: colorOf(a.id), borderRadius: BorderRadius.circular(3))),
                      const SizedBox(width: 8),
                      Expanded(child: Text(a.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w500))),
                      Text(f.money(a.balances.isEmpty ? 0 : a.balances.last), style: numStyle(context, size: 13, weight: FontWeight.w600)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  LinesChart(months: series.months, lines: [BalanceLine(id: a.id, name: a.name, values: a.balances, color: colorOf(a.id))], f: f, area: true, height: 130, yFormat: (v) => f.compact(v, currency: false)),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
