import 'package:flutter/material.dart';

import '../api/models.g.dart' hide Ref;
import '../features/transactions/explorer_vm.dart' show signedAmount;
import '../format/formatter.dart';
import '../i18n/strings.g.dart';
import '../theme/app_theme.dart';
import 'common.dart';

/// One transaction as a list row: date, description, accounts, category and amount. Port of the rows of
/// apps/web/src/app/shared/components/transaction-list.ts.
class TxTile extends StatelessWidget {
  const TxTile({super.key, required this.tx, required this.f, this.onTap, this.showCategory = true});

  final TxRow tx;
  final Formatter f;
  final VoidCallback? onTap;
  final bool showCategory;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final t = context.t;
    final isTransfer = tx.type == 'transfer';
    final tone = isTransfer ? tokens.chartInk2 : (tx.type == 'withdrawal' ? tokens.moneyExpense : tokens.moneyIncome);
    // A transfer is drawn in its own currency; the rest in the display currency, signed.
    final amount = isTransfer ? f.money(tx.originalAmount, currency: tx.originalCurrency) : f.money(signedAmount(tx), signed: true);
    final muted = text.bodySmall?.copyWith(color: scheme.onSurfaceVariant);
    final chips = <String>[
      if (showCategory) (tx.category?.name.isNotEmpty ?? false) ? tx.category!.name : t.common.uncategorized,
      if (tx.budget != null) tx.budget!.name,
      for (final tag in tx.tags) '#$tag',
    ];
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(width: 52, child: Text(f.date(tx.date), style: muted?.copyWith(fontFeatures: numFeatures))),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(tx.description, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.bodyMedium?.copyWith(fontWeight: FontWeight.w500)),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      if (isTransfer) Padding(padding: const EdgeInsets.only(right: 4), child: Icon(Icons.swap_horiz, size: 14, color: scheme.onSurfaceVariant)),
                      Expanded(child: Text('${tx.source.name} → ${tx.destination.name}', maxLines: 1, overflow: TextOverflow.ellipsis, style: muted)),
                    ],
                  ),
                  if (chips.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 2), child: Text(chips.join(' · '), maxLines: 1, overflow: TextOverflow.ellipsis, style: muted?.copyWith(fontSize: 11))),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Text(amount, style: numStyle(context, size: 14, weight: FontWeight.w600, color: f.hidden ? scheme.onSurface : tone)),
          ],
        ),
      ),
    );
  }
}
