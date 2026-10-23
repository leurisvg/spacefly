import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/planning/goals_vm.dart';
import '../format/formatter.dart' show DateStyle;
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../theme/app_theme.dart';
import '../ui/common.dart';
import '../ui/kpi_card.dart';
import '../ui/report_page.dart';

/// Goals (piggy banks): progress, pace and the date the goal is reached at that pace.
class GoalsScreen extends ConsumerWidget {
  const GoalsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final vm = ref.watch(goalsViewModelProvider);
    final f = ref.watch(formatterProvider);
    final tokens = context.tokens;
    final scheme = Theme.of(context).colorScheme;
    final r = vm.r;

    Widget stat(String label, String value) => Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
              FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: Text(value, style: numStyle(context, size: 13))),
            ],
          ),
        );

    return ReportPage(
      title: t.nav.goals,
      listKey: const Key('goals'),
      periodBar: false,
      actions: [IconButton(key: const Key('goal-new'), tooltip: t.editor.entity.piggy.kNew, icon: const Icon(Icons.add), onPressed: () => context.push(vm.createRoute)), const PrivacyButton()],
      failed: vm.res.hasError && r == null,
      onRetry: () => ref.invalidate(goalsReportProvider),
      children: [
        Text(t.goals.description, style: TextStyle(color: scheme.onSurfaceVariant)),
        const SizedBox(height: 12),
        KpiGrid(
          children: [
            KpiCard(label: t.goals.saved, f: f, accent: tokens.moneySavings, value: r?.totalSaved, loading: vm.initialLoading),
            KpiCard(label: t.goals.target, f: f, accent: tokens.moneyNet, value: r?.totalTarget, loading: vm.initialLoading),
          ],
        ),
        const SizedBox(height: 12),
        if (r != null && r.piggyBanks.isEmpty) EmptyState(title: t.goals.none),
        for (final p in vm.items) ...[
          Card(
            key: Key('goal-${p.id}'),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 4, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
                            Text('${p.group == null ? '' : '${p.group} · '}${p.accounts.join(', ')}', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
                          ],
                        ),
                      ),
                      if (p.pct != null) Text(f.pct(p.pct, decimals: 0), style: numStyle(context, size: 14, weight: FontWeight.w600)),
                      IconButton(key: Key('goal-edit-${p.id}'), tooltip: '${t.editor.tx.edit}: ${p.name}', icon: const Icon(Icons.edit_outlined, size: 20), onPressed: () => context.push(vm.editRoute(p))),
                    ],
                  ),
                  Padding(
                    padding: const EdgeInsets.only(right: 12, top: 4, bottom: 10),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(key: Key('goal-progress-${p.id}'), value: vm.progress(p) / 100, minHeight: 8, backgroundColor: tokens.moneyNet.withValues(alpha: 0.2), color: tokens.moneyNet),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(right: 12),
                    child: Column(
                      children: [
                        Row(children: [stat(t.goals.current, f.money(p.current)), stat(t.goals.goal, p.target == null ? '—' : f.money(p.target))]),
                        const SizedBox(height: 8),
                        Row(children: [stat(t.goals.pace, '${f.money(p.monthlyPace)}/${t.goals.month}'), stat(t.goals.left, p.leftToSave == null ? '—' : f.money(p.leftToSave))]),
                      ],
                    ),
                  ),
                  const Divider(height: 20),
                  Padding(
                    padding: const EdgeInsets.only(right: 12),
                    child: Wrap(
                      spacing: 16,
                      runSpacing: 4,
                      children: [
                        Text('${t.goals.targetDate}: ${p.targetDate == null ? '—' : f.date(p.targetDate!, DateStyle.long)}', style: const TextStyle(fontSize: 12)),
                        Text('${t.goals.estimated}: ${p.estimatedDate == null ? t.goals.noPace : f.date(p.estimatedDate!, DateStyle.long)}', style: const TextStyle(fontSize: 12)),
                        if (goalTone(p) != null)
                          Row(mainAxisSize: MainAxisSize.min, children: [
                            Icon(goalTone(p) == GoalTone.good ? Icons.check_circle_outline : Icons.warning_amber_rounded, size: 16, color: goalTone(p) == GoalTone.good ? tokens.moneyIncome : tokens.moneyDeficit),
                            const SizedBox(width: 4),
                            Text(goalTone(p) == GoalTone.good ? t.goals.onTrack : t.goals.behind, style: TextStyle(fontSize: 12, color: goalTone(p) == GoalTone.good ? tokens.moneyIncome : tokens.moneyDeficit)),
                          ]),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],
      ],
    );
  }
}
