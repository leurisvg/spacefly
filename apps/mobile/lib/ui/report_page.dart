import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/resources.dart';
import '../i18n/strings.g.dart';
import 'common.dart';
import 'period_bar.dart';

/// The frame of a report screen: app bar with the period bar, pull to refresh, and the sections in a list. A load that failed before
/// anything arrived shows [error] with a retry.
class ReportPage extends ConsumerWidget {
  const ReportPage({super.key, required this.title, required this.listKey, required this.children, this.failed = false, this.onRetry, this.periodBar = true, this.actions = const [PrivacyButton()]});

  final String title;
  final Key listKey;
  final List<Widget> children;

  /// True when the main request failed and there is nothing to show.
  final bool failed;
  final VoidCallback? onRetry;
  final bool periodBar;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    return Scaffold(
      appBar: AppBar(title: Text(title), actions: actions, bottom: periodBar ? const PeriodBar() : null),
      body: RefreshIndicator(
        onRefresh: () => refreshAll(ref),
        child: ListView(
          key: listKey,
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
          children: [
            if (failed) EmptyState(icon: Icons.cloud_off_outlined, title: t.errors.load, onRetry: onRetry),
            ...children,
          ],
        ),
      ),
    );
  }
}

/// Two columns of cards, for the KPIs of a report.
class KpiGrid extends StatelessWidget {
  const KpiGrid({super.key, required this.children, this.aspectRatio = 1.55});
  final List<Widget> children;
  final double aspectRatio;

  @override
  Widget build(BuildContext context) => GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 8,
        crossAxisSpacing: 8,
        childAspectRatio: aspectRatio,
        children: children,
      );
}

/// A small label over a value, in a card: the figures of a report that are not a KPI with a trend.
class StatTile extends StatelessWidget {
  const StatTile({super.key, required this.label, required this.value, this.caption, this.accent, this.valueColor});
  final String label;
  final String value;
  final String? caption;
  final Color? accent;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          if (accent != null) Positioned.fill(child: Align(alignment: Alignment.centerLeft, child: Container(width: 4, color: accent))),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 12, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(label.toUpperCase(), maxLines: 1, overflow: TextOverflow.ellipsis, style: text.labelSmall?.copyWith(color: scheme.onSurfaceVariant, letterSpacing: 0.6)),
                const SizedBox(height: 6),
                FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: Text(value, style: numStyle(context, size: 20, weight: FontWeight.w600, color: valueColor))),
                if (caption != null) ...[const SizedBox(height: 2), Text(caption!, style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant))],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
