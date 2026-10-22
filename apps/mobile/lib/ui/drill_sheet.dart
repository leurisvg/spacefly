import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/transactions/tx_detail_vm.dart';
import '../format/formatter.dart' show DateStyle;
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../ui/common.dart';
import '../ui/labels.dart';
import '../ui/tx_tile.dart';

/// Opens the transactions behind a tapped chart element (`txDetailProvider`) in a bottom sheet, like the web's side panel.
Future<void> showDrillSheet(BuildContext context) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.85,
        minChildSize: 0.5,
        maxChildSize: 1,
        builder: (_, scroll) => DrillSheet(scroll: scroll),
      ),
    );

/// The content of the drill-down sheet: the open request's transactions, grouped by type and category.
/// Port of libs/client/src/features/transactions/tx-detail.vm.ts.
class DrillSheet extends ConsumerWidget {
  const DrillSheet({super.key, required this.scroll});

  final ScrollController scroll;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final vm = ref.watch(txDetailViewModelProvider);
    final f = ref.watch(formatterProvider);
    final req = vm.request;
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;

    return ListView(
      key: const Key('drill'),
      controller: scroll,
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 24),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 0, 4, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(req?.title ?? t.nav.explorer, maxLines: 2, overflow: TextOverflow.ellipsis, style: text.titleMedium),
              Text('${f.date(vm.range.start)} – ${f.date(vm.range.end, DateStyle.long)}', style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
            ],
          ),
        ),
        if (req == null)
          EmptyState(title: t.tx.none)
        else ...[
          if (req.ranges != null)
            Wrap(
              spacing: 8,
              children: [
                for (final r in req.ranges!) ChoiceChip(label: Text(r.label), selected: vm.isActiveRange(r), onSelected: (_) => vm.notifier.setRange(r)),
              ],
            ),
          if (req.breakdown != null) ...[
            SectionCard(
              title: t.tx.breakdown,
              child: Column(
                children: [
                  for (final row in req.breakdown!)
                    InkWell(
                      onTap: () => vm.drill(row),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Row(children: [
                          Expanded(child: Text(row.name)),
                          Text(f.money(row.value), style: numStyle(context, size: 12, color: scheme.onSurfaceVariant)),
                        ]),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],
          if (vm.list.isLoading && vm.data == null)
            const Padding(padding: EdgeInsets.symmetric(vertical: 48), child: Center(child: CircularProgressIndicator()))
          else if (vm.list.hasError && vm.data == null)
            EmptyState(icon: Icons.cloud_off_outlined, title: t.errors.load, onRetry: () => ref.invalidate(txDetailListProvider))
          else if (vm.groups.isEmpty)
            EmptyState(title: t.tx.none)
          else
            for (final g in vm.groups) ...[
              _GroupHeader(group: g),
              for (final tx in g.rows) TxTile(tx: tx, f: f, showCategory: false, onTap: () => context.push('/transactions/${tx.groupId}', extra: tx)),
              const SizedBox(height: 8),
            ],
        ],
      ],
    );
  }
}

class _GroupHeader extends ConsumerWidget {
  const _GroupHeader({required this.group});

  final TxGroup group;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final f = ref.watch(formatterProvider);
    final scheme = Theme.of(context).colorScheme;
    final name = (group.category?.isNotEmpty ?? false) ? group.category! : t.common.uncategorized;
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(color: scheme.surfaceContainer, borderRadius: BorderRadius.circular(10)),
      child: Row(
        children: [
          Expanded(child: Text('${txTypeLabel(t, group.type)} · $name (${group.rows.length})', style: const TextStyle(fontWeight: FontWeight.w600))),
          Text(f.money(group.total, signed: true), style: numStyle(context, size: 13, weight: FontWeight.w600)),
        ],
      ),
    );
  }
}
