import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/models.g.dart' hide Ref;
import '../features/transactions/transaction_actions.dart';
import '../features/transactions/tx_view_vm.dart';
import '../format/formatter.dart';
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../platform/platform.dart';
import '../state/meta_store.dart';
import '../theme/app_theme.dart';
import '../ui/common.dart';
import '../ui/labels.dart';
import '../ui/not_editable_actions.dart';
import '../ui/tx_tile.dart';

/// One transaction. [row] is the list row it was opened from (shown when the full record can't be loaded or edited here).
class TxDetailScreen extends ConsumerWidget {
  const TxDetailScreen({super.key, required this.id, this.row});

  final String id;
  final TxRow? row;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final result = ref.watch(txViewProvider(id));
    final f = ref.watch(formatterProvider);
    final meta = ref.watch(metaProvider).valueOrNull;
    final url = fireflyUrl(meta, '/transactions/show/$id');

    return Scaffold(
      appBar: AppBar(
        title: Text(t.nav.explorer),
        actions: [
          if (result.valueOrNull?.state == TxViewState.ready) ...[
            IconButton(key: const Key('edit'), tooltip: t.editor.tx.edit, icon: const Icon(Icons.edit_outlined), onPressed: () => context.push('/transactions/$id/edit')),
            IconButton(
              key: const Key('delete'),
              tooltip: t.forms.delete,
              icon: const Icon(Icons.delete_outline),
              onPressed: () => ref.read(transactionActionsProvider).remove(groupId: id, name: result.value!.tx!.description),
            ),
          ],
          if (url != null) IconButton(key: const Key('open-firefly'), tooltip: t.tx.openInFirefly, icon: const Icon(Icons.open_in_new), onPressed: () => launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication)),
        ],
      ),
      body: result.when(
        skipLoadingOnReload: true,
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => EmptyState(icon: Icons.cloud_off_outlined, title: t.editor.tx.loadError, onRetry: () => ref.invalidate(txViewProvider(id))),
        data: (r) => switch (r.state) {
          TxViewState.ready => _Ready(tx: r.tx!, f: f),
          TxViewState.notEditable => ListView(padding: const EdgeInsets.all(16), children: [
              SectionCard(
                title: t.editor.tx.notEditable.title,
                child: Text(r.reason == 'type' ? t.editor.tx.notEditable.type : t.editor.tx.notEditable.splits),
              ),
              if (row != null) ...[const SizedBox(height: 12), SectionCard(child: TxTile(tx: row!, f: f))],
              const SizedBox(height: 16),
              NotEditableActions(
                groupId: id,
                name: row?.description ?? t.nav.explorer,
                reason: r.reason,
                fireflyEditUrl: fireflyUrl(meta, '/transactions/edit/$id'),
                onBack: () => ref.read(backNavigationProvider).back('/transactions'),
              ),
            ]),
          TxViewState.missing => EmptyState(icon: Icons.search_off, title: t.editor.tx.missing),
          TxViewState.error => EmptyState(icon: Icons.cloud_off_outlined, title: t.editor.tx.loadError, onRetry: () => ref.invalidate(txViewProvider(id))),
        },
      ),
    );
  }
}

class _Ready extends ConsumerWidget {
  const _Ready({required this.tx, required this.f});

  final TxEditPayload tx;
  final Formatter f;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final scheme = Theme.of(context).colorScheme;
    final tokens = context.tokens;
    final lookups = ref.watch(lookupsProvider).valueOrNull;
    final amount = double.tryParse(tx.amount) ?? 0;
    final signed = tx.type == TxKind.WITHDRAWAL ? -amount : amount;
    final tone = tx.type == TxKind.WITHDRAWAL ? tokens.moneyExpense : (tx.type == TxKind.DEPOSIT ? tokens.moneyIncome : tokens.chartInk2);
    final typeName = switch (tx.type) { TxKind.WITHDRAWAL => 'withdrawal', TxKind.DEPOSIT => 'deposit', TxKind.TRANSFER => 'transfer' };
    final budget = lookups?.budgets.where((b) => b.id == tx.budgetId).firstOrNull?.name;

    Widget line(String label, String value) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(width: 110, child: Text(label, style: TextStyle(color: scheme.onSurfaceVariant))),
              Expanded(child: Text(value)),
            ],
          ),
        );

    return ListView(
      key: const Key('tx-detail'),
      padding: const EdgeInsets.all(16),
      children: [
        SectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(txTypeLabel(t, typeName).toUpperCase(), style: Theme.of(context).textTheme.labelSmall?.copyWith(color: scheme.onSurfaceVariant, letterSpacing: 0.6)),
              const SizedBox(height: 4),
              Text(tx.description, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              Text(
                tx.type == TxKind.TRANSFER ? f.money(amount, currency: tx.currency) : f.money(signed, currency: tx.currency, signed: true),
                style: numStyle(context, size: 28, weight: FontWeight.w600, color: f.hidden ? scheme.onSurface : tone),
              ),
              if (tx.foreignAmount != null && tx.foreignCurrency != null) ...[
                const SizedBox(height: 4),
                Text(f.money(double.tryParse(tx.foreignAmount!) ?? 0, currency: tx.foreignCurrency), style: numStyle(context, size: 14, color: scheme.onSurfaceVariant)),
              ],
            ],
          ),
        ),
        const SizedBox(height: 12),
        SectionCard(
          child: Column(
            children: [
              line(t.common.date, '${f.date(tx.date, DateStyle.long)}${tx.time == null ? '' : ' · ${tx.time}'}'),
              const Divider(),
              line(t.editor.tx.from, tx.source.name),
              line(t.editor.tx.to, tx.destination.name),
              if ((tx.category ?? '').isNotEmpty) ...[const Divider(), line(t.common.category, tx.category!)],
              if (budget != null) line(t.common.budget, budget),
              if (tx.tags.isNotEmpty) line(t.common.tag, tx.tags.map((x) => '#$x').join('  ')),
              if ((tx.notes ?? '').isNotEmpty) ...[const Divider(), line(t.editor.tx.notes, tx.notes!)],
            ],
          ),
        ),
      ],
    );
  }
}
