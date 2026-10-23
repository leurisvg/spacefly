import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/models.g.dart' show CounterpartyKind, RankedItem;
import '../features/accounts/counterparty_detail_vm.dart';
import '../format/formatter.dart' show DateStyle;
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../shared/dates.dart' show todayIso;
import '../state/filters_store.dart';
import '../theme/app_theme.dart';
import '../ui/calendar_grid.dart';
import '../ui/charts.dart';
import '../ui/charts/ranking_bars.dart';
import '../ui/chart_card.dart';
import '../ui/common.dart';
import '../ui/drill_sheet.dart';
import '../ui/kpi_card.dart';
import '../ui/report_page.dart';
import '../ui/tx_tile.dart';

/// One expense or revenue account over the selected period: totals, daily calendar, trend, breakdowns and every record.
class CounterpartyDetailScreen extends ConsumerWidget {
  const CounterpartyDetailScreen({super.key, required this.kind, required this.id});

  final CounterpartyKind kind;
  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final args = (kind: kind, id: id);
    final vm = ref.watch(counterpartyDetailViewModelProvider(args));
    final f = ref.watch(formatterProvider);
    final tokens = context.tokens;
    final scheme = Theme.of(context).colorScheme;
    final r = vm.r;
    final accent = vm.income ? tokens.moneyIncome : tokens.moneyExpense;
    final today = todayIso(ref.read(clockProvider)());
    final stats = vm.stats;
    final muted = TextStyle(fontSize: 11, color: scheme.onSurfaceVariant, letterSpacing: 0.6);

    Widget stat(String label, Widget value) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label.toUpperCase(), style: muted), const SizedBox(height: 2), value]);

    Widget ranks(String title, String fileName, List<RankedItem> items, Color color) => ChartCard(
          title: title,
          fileName: fileName,
          table: vm.rankTable(items),
          child: RankingBars(
            rows: [for (final x in items) RankBar(name: vm.rankName(x), value: x.value, label: f.compact(x.value))],
            color: color,
            onRow: (_) {},
          ),
        );

    return ReportPage(
      title: r?.account.name ?? '…',
      listKey: Key('counterparty-detail-$id'),
      actions: [
        if (r != null)
          IconButton(
              key: const Key('counterparty-edit'),
              tooltip: t.editor.tx.edit,
              icon: const Icon(Icons.edit_outlined),
              onPressed: () => context.push('/edit/account/${Uri.encodeComponent(r.account.id)}')),
        const PrivacyButton()
      ],
      failed: false,
      children: [
        if (vm.res.hasError && r == null)
          EmptyState(icon: Icons.search_off, title: t.accounts.detail.notFound, subtitle: t.accounts.counterparty.notFoundHint)
        else ...[
          if (vm.subtitle != null) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(vm.subtitle!, style: TextStyle(color: scheme.onSurfaceVariant))),
          KpiGrid(
            children: [
              KpiCard(
                  label: t.common.total,
                  f: f,
                  accent: accent,
                  value: r?.totals.value,
                  previous: (r?.totals.previous ?? 0) == 0 ? null : r!.totals.previous,
                  upIsGood: vm.income,
                  loading: vm.initialLoading),
              StatTile(label: t.ranking.transactions, value: r == null ? '—' : f.compact(r.totals.count, currency: false), accent: accent),
              StatTile(label: t.ranking.avgTicket, value: r == null ? '—' : f.money(r.totals.avg), accent: accent),
              KpiCard(label: t.accounts.counterparty.share, f: f, accent: accent, value: vm.share, format: KpiFormat.pct, loading: vm.initialLoading),
            ],
          ),
          if (r != null && stats != null) ...[
            const SizedBox(height: 12),
            SectionCard(
              title: t.accounts.detail.stats,
              child: Wrap(
                spacing: 24,
                runSpacing: 12,
                children: [
                  stat(t.accounts.counterparty.monthlyAverage, Text(f.money(stats.monthlyAverage), style: numStyle(context, size: 14))),
                  stat(t.accounts.counterparty.total12, Text(f.money(stats.total12), style: numStyle(context, size: 14))),
                  if (stats.biggest != null)
                    stat(
                        t.accounts.counterparty.biggest,
                        Text('${f.money(stats.biggest!.amount)}  ${stats.biggest!.description}',
                            maxLines: 1, overflow: TextOverflow.ellipsis, style: numStyle(context, size: 14, color: f.hidden ? null : accent))),
                  if (r.rows.isNotEmpty) stat(t.accounts.counterparty.lastTransaction, Text(f.date(r.rows.first.date, DateStyle.long), style: numStyle(context, size: 14))),
                ],
              ),
            ),
          ],
          const SizedBox(height: 12),
          ChartCard(
            title: vm.income ? t.accounts.counterparty.calendar.income : t.accounts.counterparty.calendar.expense,
            fileName: 'counterparty-calendar',
            table: vm.dayTable,
            subtitle: t.calendar.clickDay,
            padding: const EdgeInsets.fromLTRB(10, 16, 10, 12),
            child: r == null
                ? const SizedBox(height: 240)
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (final m in vm.calendarMonths) ...[
                        Padding(padding: const EdgeInsets.fromLTRB(4, 0, 0, 6), child: Text(f.date(m.month, DateStyle.month), style: const TextStyle(fontWeight: FontWeight.w600))),
                        CalendarGrid(
                          key: Key('calendar-${m.month}'),
                          days: m.days,
                          f: f,
                          today: today,
                          scale: vm.calendarScale,
                          onDay: (date) {
                            vm.openDay(date);
                            showDrillSheet(context);
                          },
                        ),
                        const SizedBox(height: 16),
                      ],
                    ],
                  ),
          ),
          const SizedBox(height: 12),
          ChartCard(
            title: t.accounts.counterparty.monthly,
            fileName: 'counterparty-monthly',
            table: vm.monthlyTable,
            child: r == null
                ? const SizedBox(height: 200)
                : CategoryBarsChart(
                    labels: [for (final m in r.months) f.monthLabel(m.month, withYear: false)], values: [for (final m in r.months) m.value], color: accent, f: f, seriesName: vm.seriesName),
          ),
          const SizedBox(height: 12),
          ChartCard(
            title: vm.income ? t.accounts.counterparty.weekday.income : t.accounts.counterparty.weekday.expense,
            fileName: 'counterparty-weekday',
            table: vm.weekdayTable,
            child: r == null ? const SizedBox(height: 200) : CategoryBarsChart(labels: vm.weekdayLabels, values: r.byWeekday, color: accent, f: f, seriesName: vm.seriesName),
          ),
          if (r != null && r.topCategories.isNotEmpty) ...[const SizedBox(height: 12), ranks(t.accounts.counterparty.byCategory, 'counterparty-categories', r.topCategories, accent)],
          if (r != null && r.topAccounts.isNotEmpty) ...[const SizedBox(height: 12), ranks(vm.income ? t.accounts.counterparty.receivedIn : t.accounts.counterparty.paidFrom, 'counterparty-accounts', r.topAccounts, accent)],
          const SizedBox(height: 12),
          SectionCard(
            title: t.accounts.detail.records,
            padding: const EdgeInsets.fromLTRB(12, 16, 12, 8),
            child: Column(
              children: [
                if (vm.pageRows.isEmpty) EmptyState(title: vm.initialLoading ? '' : t.tx.none),
                for (final tx in vm.pageRows)
                  Row(
                    key: Key('record-${tx.id}'),
                    children: [
                      Expanded(child: TxTile(tx: tx, f: f, onTap: () => context.push('/transactions/${tx.groupId}', extra: tx))),
                      if (vm.editable(tx))
                        IconButton(
                            key: Key('record-edit-${tx.id}'),
                            visualDensity: VisualDensity.compact,
                            tooltip: t.editor.tx.edit,
                            icon: const Icon(Icons.edit_outlined, size: 18),
                            onPressed: () => context.push('/transactions/${tx.groupId}/edit')),
                    ],
                  ),
                _Pager(page: vm.page, pages: vm.pages, onPage: vm.setPage),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

/// "Page 2 of 5" with arrows.
class _Pager extends StatelessWidget {
  const _Pager({required this.page, required this.pages, required this.onPage});

  final int page;
  final int pages;
  final void Function(int page) onPage;

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    return Row(
      children: [
        Expanded(child: Text(t.explorer.page(page: page, pages: pages), style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant))),
        IconButton(key: const Key('page-previous'), tooltip: t.period.previous, icon: const Icon(Icons.chevron_left), onPressed: page <= 1 ? null : () => onPage(page - 1)),
        IconButton(key: const Key('page-next'), tooltip: t.period.next, icon: const Icon(Icons.chevron_right), onPressed: page >= pages ? null : () => onPage(page + 1)),
      ],
    );
  }
}
