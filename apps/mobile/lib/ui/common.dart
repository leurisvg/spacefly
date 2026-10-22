import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../i18n/strings.g.dart';
import '../state/privacy_store.dart';
import '../theme/app_theme.dart';
import '../ui_logic/budget_status.dart';
import '../ui_logic/delta.dart';

/// Digits of the same width, so amounts line up in a column.
const numFeatures = [FontFeature.tabularFigures()];

TextStyle numStyle(BuildContext context, {double? size, FontWeight? weight, Color? color}) =>
    TextStyle(fontFeatures: numFeatures, fontSize: size, fontWeight: weight, color: color);

/// The color a [Tone] stands for in the active theme.
Color toneColor(BuildContext context, Tone tone) {
  final tokens = context.tokens;
  switch (tone) {
    case Tone.positive:
      return tokens.moneyIncome;
    case Tone.negative:
      return tokens.moneyExpense;
    case Tone.neutral:
      return tokens.chartInk2;
  }
}

Color meterColor(BuildContext context, MeterStatus status) {
  final tokens = context.tokens;
  switch (status) {
    case MeterStatus.good:
      return tokens.moneyIncome;
    case MeterStatus.warning:
      return tokens.moneyDeficit;
    case MeterStatus.critical:
      return tokens.moneyExpense;
  }
}

/// A titled card: the section container of every screen.
class SectionCard extends StatelessWidget {
  const SectionCard({super.key, this.title, this.subtitle, this.trailing, required this.child, this.padding = const EdgeInsets.all(16)});

  final String? title;
  final String? subtitle;
  final Widget? trailing;
  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    return Card(
      child: Padding(
        padding: padding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (title != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(title!, style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                          if (subtitle != null) Text(subtitle!, style: text.bodySmall?.copyWith(color: muted)),
                        ],
                      ),
                    ),
                    if (trailing != null) trailing!,
                  ],
                ),
              ),
            child,
          ],
        ),
      ),
    );
  }
}

/// An icon, a message and, for failures, a retry button.
class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.title, this.icon = Icons.inbox_outlined, this.onRetry});

  final String title;
  final IconData icon;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 16),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 40, color: scheme.outline),
            const SizedBox(height: 12),
            Text(title, textAlign: TextAlign.center, style: TextStyle(color: scheme.onSurfaceVariant)),
            if (onRetry != null) ...[
              const SizedBox(height: 12),
              OutlinedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: Text(context.t.topbar.refresh)),
            ],
          ],
        ),
      ),
    );
  }
}

/// A grey bar that stands in for a value that has not arrived yet.
class Skeleton extends StatelessWidget {
  const Skeleton({super.key, this.width, this.height = 20});

  final double? width;
  final double height;

  @override
  Widget build(BuildContext context) => Container(
        width: width,
        height: height,
        decoration: BoxDecoration(color: Theme.of(context).colorScheme.outlineVariant.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(6)),
      );
}

/// Eye button that hides every amount (privacy mode).
class PrivacyButton extends ConsumerWidget {
  const PrivacyButton({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hidden = ref.watch(privacyProvider);
    final t = context.t;
    return IconButton(
      key: const Key('privacy'),
      tooltip: hidden ? t.topbar.showAmounts : t.topbar.hideAmounts,
      icon: Icon(hidden ? Icons.visibility_off_outlined : Icons.visibility_outlined),
      onPressed: () => ref.read(privacyProvider.notifier).toggle(),
    );
  }
}

/// A thin progress bar colored by how close to its limit a budget is.
class Meter extends StatelessWidget {
  const Meter({super.key, required this.model, this.marker});

  final MeterModel model;

  /// Where the period should be by now (0–1): a tick over the bar, as the web's expected pace.
  final double? marker;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final bar = ClipRRect(
      borderRadius: BorderRadius.circular(4),
      child: LinearProgressIndicator(value: model.fill / 100, minHeight: 8, backgroundColor: scheme.outlineVariant, color: meterColor(context, model.status)),
    );
    final at = marker;
    if (at == null) return bar;
    return LayoutBuilder(
      builder: (context, box) => Stack(
        clipBehavior: Clip.none,
        children: [
          bar,
          Positioned(left: (box.maxWidth * at.clamp(0.0, 1.0)) - 1, top: -2, bottom: -2, width: 2, child: ColoredBox(key: const Key('meter-marker'), color: scheme.onSurface)),
        ],
      ),
    );
  }
}
