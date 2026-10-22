import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../i18n/strings.g.dart';

class MoreEntry {
  const MoreEntry(this.route, this.icon, this.label);
  final String route;
  final IconData icon;
  final String Function(Translations t) label;
}

class MoreSection {
  const MoreSection(this.title, this.entries);
  final String Function(Translations t) title;
  final List<MoreEntry> entries;
}

/// Everything the other tabs do not hold, grouped like the web's sidebar. An entry appears when its screen exists.
final moreSections = <MoreSection>[
  MoreSection((t) => t.nav.sections.reports, [
    MoreEntry('/reports/monthly', Icons.summarize_outlined, (t) => t.nav.monthly),
    MoreEntry('/reports/annual', Icons.bar_chart_outlined, (t) => t.nav.annual),
    MoreEntry('/reports/calendar', Icons.calendar_month_outlined, (t) => t.nav.calendar),
    MoreEntry('/reports/compare', Icons.compare_arrows, (t) => t.nav.compare),
  ]),
];

class MoreTab extends StatelessWidget {
  const MoreTab({super.key});

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: Text(t.nav.more)),
      body: ListView(
        key: const Key('more'),
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
        children: [
          for (final section in moreSections) ...[
            Padding(padding: const EdgeInsets.fromLTRB(4, 12, 4, 8), child: Text(section.title(t), style: Theme.of(context).textTheme.titleSmall?.copyWith(color: scheme.onSurfaceVariant))),
            Card(
              child: Column(
                children: [
                  for (final e in section.entries)
                    ListTile(
                      key: Key('more-${e.route}'),
                      leading: Icon(e.icon),
                      title: Text(e.label(t)),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push(e.route),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
