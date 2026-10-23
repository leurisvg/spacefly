import 'package:flutter/material.dart';

import '../i18n/strings.g.dart';

/// History length the balance charts offer (months). Port of `HISTORY_MONTHS` in libs/client/src/features/accounts/history-months.ts.
const historyMonths = ['6', '12', '24', '36'];

/// 6 / 12 / 24 / 36 months selector for balance charts.
class MonthsPicker extends StatelessWidget {
  const MonthsPicker({super.key, required this.value, required this.onChanged});

  final String value;
  final void Function(String months) onChanged;

  @override
  Widget build(BuildContext context) => SegmentedButton<String>(
        key: const Key('history-months'),
        showSelectedIcon: false,
        style: const ButtonStyle(visualDensity: VisualDensity.compact),
        segments: [for (final m in historyMonths) ButtonSegment(value: m, label: Text('$m${context.t.accounts.monthsShort}'))],
        selected: {value},
        onSelectionChanged: (v) => onChanged(v.first),
      );
}
