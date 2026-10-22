import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../format/formatter.dart';
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../shared/dates.dart';
import '../shared/period_presets.dart';
import '../state/filters_store.dart';
import '../state/meta_store.dart';

String presetLabel(Translations t, String key) => switch (key) {
      'thisMonth' => t.period.presets.thisMonth,
      'lastMonth' => t.period.presets.lastMonth,
      'last30' => t.period.presets.last30,
      'last6m' => t.period.presets.last6m,
      'thisQuarter' => t.period.presets.thisQuarter,
      'thisYear' => t.period.presets.thisYear,
      'lastYear' => t.period.presets.lastYear,
      'ytd' => t.period.presets.ytd,
      _ => key,
    };

/// ◀ period ▶ under the app bar: the global period. Tapping the label opens the presets, a custom range and the display currency.
/// Use as `AppBar(bottom: const PeriodBar())`.
class PeriodBar extends ConsumerWidget implements PreferredSizeWidget {
  const PeriodBar({super.key});

  @override
  Size get preferredSize => const Size.fromHeight(52);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final filters = ref.watch(filtersProvider);
    final f = ref.watch(formatterProvider);
    final notifier = ref.read(filtersProvider.notifier);
    final label = periodLabel(
      filters.preset,
      filters.period,
      date: (iso, style) => f.date(iso, switch (style) { 'month' => DateStyle.month, 'long' => DateStyle.long, _ => DateStyle.short }),
      quarterShort: t.period.quarterShort,
      ytdShort: t.period.ytdShort,
    );
    return SizedBox(
      height: 52,
      child: Row(
        children: [
          IconButton(key: const Key('period-previous'), tooltip: t.period.previous, icon: const Icon(Icons.chevron_left), onPressed: () => notifier.shift(-1)),
          Expanded(
            child: TextButton.icon(
              key: const Key('period-label'),
              onPressed: () => showPeriodSheet(context),
              icon: const Icon(Icons.calendar_month_outlined, size: 18),
              label: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis),
            ),
          ),
          IconButton(key: const Key('period-next'), tooltip: t.period.next, icon: const Icon(Icons.chevron_right), onPressed: () => notifier.shift(1)),
        ],
      ),
    );
  }
}

Future<void> showPeriodSheet(BuildContext context) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => const _PeriodSheet(),
    );

class _PeriodSheet extends ConsumerWidget {
  const _PeriodSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.t;
    final filters = ref.watch(filtersProvider);
    final notifier = ref.read(filtersProvider.notifier);
    final currencies = ref.watch(currenciesProvider);
    final currency = ref.watch(currencyProvider);
    final today = todayIso(ref.read(clockProvider)());
    final f = ref.watch(formatterProvider);

    Future<void> pickRange() async {
      final picked = await showDateRangePicker(
        context: context,
        firstDate: DateTime(2000),
        lastDate: DateTime(DateTime.now().year + 2, 12, 31),
        initialDateRange: DateTimeRange(start: parseIso(filters.period.start), end: parseIso(filters.period.end)),
        helpText: t.period.custom,
        saveText: t.period.apply,
      );
      if (picked == null) return;
      notifier.setCustom(Period(toIso(picked.start), toIso(picked.end)));
      if (context.mounted) Navigator.of(context).pop();
    }

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.only(bottom: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final option in periodPresetOptions)
              ListTile(
                key: Key('preset-${option.key}'),
                title: Text(presetLabel(t, option.key)),
                subtitle: Text('${f.date(option.period(today).start)} – ${f.date(option.period(today).end, DateStyle.long)}'),
                trailing: isPresetSelected(option, filters.preset, filters.period, today) ? Icon(Icons.check, color: Theme.of(context).colorScheme.primary) : null,
                onTap: () {
                  notifier.setPreset(option.preset, anchor: option.anchor(today));
                  Navigator.of(context).pop();
                },
              ),
            ListTile(
              key: const Key('preset-custom'),
              title: Text(t.period.custom),
              leading: const Icon(Icons.date_range_outlined),
              trailing: filters.preset == PeriodPreset.custom ? Icon(Icons.check, color: Theme.of(context).colorScheme.primary) : null,
              onTap: pickRange,
            ),
            const Divider(),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                children: [
                  Expanded(child: Text(t.currency.label)),
                  SegmentedButton<String>(
                    key: const Key('currency'),
                    showSelectedIcon: false,
                    segments: [for (final c in currencies) ButtonSegment(value: c.code, label: Text(c.code))],
                    selected: {currency},
                    onSelectionChanged: (v) => notifier.setCurrency(v.first),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
