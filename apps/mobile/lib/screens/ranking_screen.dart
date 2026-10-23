import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/models.g.dart' show RankingItem;
import '../features/analysis/ranking_vm.dart';
import '../features/editor/entity_form_vm.dart' show EntityKind;
import '../format/formatter.dart' show Formatter;
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../ui/charts.dart';
import '../ui/charts/ranking_bars.dart';
import '../ui/charts/sunburst.dart';
import '../ui/charts/treemap.dart';
import '../ui/common.dart';
import '../ui/drill_sheet.dart';
import '../ui/report_page.dart';
import '../ui_logic/delta.dart';

/// Categories · Tags · Merchants · Income sources: ranking, distribution (bars, treemap or budget sunburst) and trend.
class RankingScreen extends ConsumerWidget {
  const RankingScreen({super.key, required this.route});

  final RankingRoute route;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final o = route.options;
    final vm = ref.watch(rankingViewModelProvider(o));
    final f = ref.watch(formatterProvider);
    final scheme = Theme.of(context).colorScheme;
    final r = vm.r;
    final items = vm.items;

    final (title, description) = switch (route) {
      RankingRoute.categories => (t.nav.categories, t.ranking.descriptions.categories),
      RankingRoute.tags => (t.nav.tags, t.ranking.descriptions.tags),
      RankingRoute.merchants => (t.nav.merchants, t.ranking.descriptions.merchants),
      RankingRoute.incomeSources => (t.nav.incomeSources, t.ranking.descriptions.incomeSources),
    };

    void drill() => showDrillSheet(context);

    Widget distribution() {
      if (items.isEmpty) return vm.initialLoading ? const SizedBox(height: 220) : EmptyState(title: t.common.noData);
      switch (vm.view) {
        case RankingView.treemap:
          return Treemap(
            items: [for (final s in vm.treemapSlices) TreemapItem(name: s.name, value: s.value, label: f.compact(s.value), color: s.color)],
            semanticsLabel: t.ranking.views.treemap,
            onItem: (i) {
              if (vm.openAt(i)) drill();
            },
          );
        case RankingView.sunburst:
          final groups = vm.sunburstGroups;
          return groups == null ? const SizedBox(height: 300) : _SunburstView(groups: groups, f: f, caption: t.ranking.views.sunburst);
        case RankingView.bars:
          return RankingBars(
            rows: [for (final it in vm.barItems) RankBar(name: vm.itemName(it), value: it.value, label: f.compact(it.value))],
            color: vm.accent,
            onRow: (i) {
              if (vm.openAt(i)) drill();
            },
          );
      }
    }

    Widget row(int i, RankingItem it) {
      final delta = deltaModel(it.value, it.previous == 0 ? null : it.previous, upIsGood: vm.kind == RankingKind.income, hidden: f.hidden);
      return InkWell(
        key: Key('rank-row-$i'),
        onTap: () {
          vm.open(it);
          drill();
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(width: 10, height: 10, decoration: BoxDecoration(color: vm.colorOf(it), borderRadius: BorderRadius.circular(3))),
                  const SizedBox(width: 10),
                  Expanded(child: Text(vm.itemName(it), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w500))),
                  Text(f.money(it.value), style: numStyle(context, weight: FontWeight.w600)),
                  if (vm.editRoute(it) != null) IconButton(key: Key('rank-edit-$i'), visualDensity: VisualDensity.compact, tooltip: '${t.editor.tx.edit}: ${vm.itemName(it)}', icon: const Icon(Icons.edit_outlined, size: 18), onPressed: () => context.push(vm.editRoute(it)!)),
                ],
              ),
              const SizedBox(height: 2),
              Padding(
                padding: const EdgeInsets.only(left: 20),
                child: Wrap(
                  spacing: 12,
                  runSpacing: 2,
                  children: [
                    Text('${f.pct(it.share, decimals: 1)} · ${it.count.toInt()} ${t.ranking.transactions.toLowerCase()}', style: numStyle(context, size: 11, color: scheme.onSurfaceVariant)),
                    Text('${t.ranking.avgTicket} ${f.money(it.avg)}', style: numStyle(context, size: 11, color: scheme.onSurfaceVariant)),
                    if (it.previous != 0 && delta.ratio != null) Text('${t.ranking.previous} ${f.compact(it.previous)} · ${f.pct(delta.ratio)}', style: numStyle(context, size: 11, color: toneColor(context, delta.tone))),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    }

    final trend = vm.trend;

    return ReportPage(
      title: title,
      listKey: Key('ranking-${route.name}'),
      actions: [if (vm.createRoute != null) IconButton(key: const Key('ranking-new'), tooltip: _newLabel(t, vm), icon: const Icon(Icons.add), onPressed: () => context.push(vm.createRoute!)), const PrivacyButton()],
      failed: vm.res.hasError && r == null,
      onRetry: () => ref.invalidate(rankingReportProvider(o)),
      children: [
        Text(description, style: TextStyle(color: scheme.onSurfaceVariant)),
        if (!o.fixedKind) ...[
          const SizedBox(height: 8),
          SegmentedButton<RankingKind>(
            key: const Key('ranking-kind'),
            showSelectedIcon: false,
            segments: [ButtonSegment(value: RankingKind.expense, label: Text(t.common.expenses)), ButtonSegment(value: RankingKind.income, label: Text(t.common.income))],
            selected: {vm.kind},
            onSelectionChanged: (v) => vm.setKind(v.first),
          ),
        ],
        const SizedBox(height: 12),
        KpiGrid(
          children: [
            StatTile(label: t.common.total, value: r == null ? '—' : f.money(r.total), accent: vm.accent),
            StatTile(label: t.ranking.items, value: r == null ? '—' : f.compact(items.length.toDouble(), currency: false), accent: vm.accent),
            StatTile(label: t.ranking.transactions, value: vm.count == null ? '—' : f.compact(vm.count, currency: false), accent: vm.accent),
            StatTile(label: t.ranking.avgTicket, value: vm.avgTicket == null ? '—' : f.money(vm.avgTicket!), accent: vm.accent),
          ],
        ),
        const SizedBox(height: 12),
        SectionCard(
          title: t.ranking.distribution,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SegmentedButton<RankingView>(
                key: const Key('ranking-view'),
                showSelectedIcon: false,
                segments: [
                  ButtonSegment(value: RankingView.bars, label: Text(t.ranking.views.bars)),
                  ButtonSegment(value: RankingView.treemap, label: Text(t.ranking.views.treemap)),
                  if (vm.canSunburst) ButtonSegment(value: RankingView.sunburst, label: Text(t.ranking.views.sunburst)),
                ],
                selected: {vm.view},
                onSelectionChanged: (v) => vm.setView(v.first),
              ),
              const SizedBox(height: 12),
              distribution(),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SectionCard(
          title: t.ranking.trend,
          subtitle: t.ranking.trendHint,
          child: trend == null
              ? SizedBox(height: vm.initialLoading ? 200 : 60, child: vm.initialLoading ? null : EmptyState(title: t.common.noData))
              : Column(
                  children: [
                    LinesChart(months: r!.months, lines: trend, f: f),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 14,
                      runSpacing: 4,
                      children: [
                        for (final l in trend)
                          Row(mainAxisSize: MainAxisSize.min, children: [
                            Container(width: 10, height: 10, decoration: BoxDecoration(color: l.color, borderRadius: BorderRadius.circular(2))),
                            const SizedBox(width: 5),
                            Text(l.name, style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
                          ]),
                      ],
                    ),
                  ],
                ),
        ),
        const SizedBox(height: 12),
        SectionCard(
          title: t.ranking.name,
          child: items.isEmpty ? EmptyState(title: vm.initialLoading ? '' : t.common.noData) : Column(children: [for (final (i, it) in items.indexed) row(i, it)]),
        ),
      ],
    );
  }
}

String _newLabel(Translations t, RankingViewModel vm) => switch (vm.entityKind) {
      EntityKind.category => t.editor.entity.category.kNew,
      EntityKind.tag => t.editor.entity.tag.kNew,
      _ => t.editor.entity.account.kNew,
    };

/// The two-ring chart with what a tapped slice is written in its hole, and the budgets listed under it.
class _SunburstView extends StatefulWidget {
  const _SunburstView({required this.groups, required this.f, required this.caption});

  final List<SunburstGroup> groups;
  final Formatter f;
  final String caption;

  @override
  State<_SunburstView> createState() => _SunburstViewState();
}

class _SunburstViewState extends State<_SunburstView> {
  SunburstArc? _arc;

  @override
  Widget build(BuildContext context) {
    final f = widget.f;
    final scheme = Theme.of(context).colorScheme;
    final arc = _arc != null && _arc!.group < widget.groups.length ? _arc : null;
    final group = arc == null ? null : widget.groups[arc.group];
    final name = arc == null ? widget.caption : (arc.isGroup ? group!.name : '${group!.name} › ${group.children[arc.child].name}');
    final total = widget.groups.fold<double>(0, (a, g) => a + g.total);
    return Column(
      children: [
        Sunburst(groups: widget.groups, semanticsLabel: widget.caption, onArc: (a) => setState(() => _arc = a)),
        const SizedBox(height: 8),
        // What the tapped slice is (the web shows it in a tooltip); the whole chart until one is tapped.
        Row(
          key: const Key('sunburst-caption'),
          children: [
            Expanded(child: Text(name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600))),
            Text(f.money(arc?.value ?? total), style: numStyle(context, weight: FontWeight.w600)),
          ],
        ),
        const SizedBox(height: 8),
        for (final g in widget.groups)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                Container(width: 10, height: 10, decoration: BoxDecoration(color: g.color, borderRadius: BorderRadius.circular(3))),
                const SizedBox(width: 10),
                Expanded(child: Text(g.name, maxLines: 1, overflow: TextOverflow.ellipsis)),
                Text(f.money(g.total), style: numStyle(context, size: 12, color: scheme.onSurfaceVariant)),
              ],
            ),
          ),
      ],
    );
  }
}
