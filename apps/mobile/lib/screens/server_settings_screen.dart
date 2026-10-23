import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/settings/settings_vm.dart';
import '../format/formatter.dart';
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../ui/common.dart';
import '../ui/labels.dart';
import '../ui/threshold_slider.dart';

/// The settings kept on the server: excluded accounts, balance history window, Sankey threshold, and the exchange rates in use.
/// Port of the settings view-model (libs/client/src/features/settings/settings.vm.ts).
class ServerSettingsScreen extends ConsumerStatefulWidget {
  const ServerSettingsScreen({super.key});

  @override
  ConsumerState<ServerSettingsScreen> createState() => _ServerSettingsScreenState();
}

class _ServerSettingsScreenState extends ConsumerState<ServerSettingsScreen> {
  final _months = TextEditingController();
  bool _monthsLoaded = false;

  @override
  void dispose() {
    _months.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final res = ref.watch(settingsResponseProvider);
    final state = ref.watch(settingsProvider);
    final notifier = ref.read(settingsProvider.notifier);
    final f = ref.watch(formatterProvider);
    final scheme = Theme.of(context).colorScheme;
    final draft = state.draft;

    if (draft != null && !_monthsLoaded) {
      _months.text = draft.balanceMonths.toInt().toString();
      _monthsLoaded = true;
    }

    return Scaffold(
      appBar: AppBar(title: Text(t.settings.preferences)),
      body: res.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => EmptyState(icon: Icons.cloud_off_outlined, title: t.errors.load, onRetry: () => ref.invalidate(settingsResponseProvider)),
        data: (data) => ListView(
          key: const Key('server-settings'),
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          children: [
            Text(t.settings.description, style: TextStyle(color: scheme.onSurfaceVariant)),
            const SizedBox(height: 16),
            if (draft != null) ...[
              SectionCard(
                title: t.settings.excluded,
                subtitle: t.settings.excludedHint,
                padding: const EdgeInsets.fromLTRB(16, 16, 8, 8),
                child: Column(
                  children: [
                    for (final a in data.accounts)
                      SwitchListTile(
                        key: Key('excluded-${a.id}'),
                        contentPadding: EdgeInsets.zero,
                        title: Text(a.name),
                        subtitle: Text([a.currency, if (a.role != null) accountRoleLabel(t, a.role)].join(' · ')),
                        value: draft.excludedAccounts.contains(a.id),
                        onChanged: (v) => notifier.toggleExcluded(a.id, v),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              SectionCard(
                title: t.settings.preferences,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextField(
                      key: const Key('balance-months'),
                      controller: _months,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(labelText: t.settings.balanceMonths, helperText: '2–60'),
                      // the window is 2–60 months; anything else keeps the last valid value
                      onChanged: (v) {
                        final months = int.tryParse(v);
                        if (months != null && isValidBalanceMonths(months)) notifier.patch(balanceMonths: months.toDouble());
                      },
                    ),
                    const SizedBox(height: 20),
                    Text(t.settings.sankeyThreshold, style: Theme.of(context).textTheme.bodyMedium),
                    ThresholdSlider(f: f, value: draft.sankeyThreshold, onChanged: (v) => notifier.patch(sankeyThreshold: v)),
                    const SizedBox(height: 20),
                    FilledButton(key: const Key('settings-save'), onPressed: state.saving ? null : notifier.save, child: Text(t.settings.save)),
                  ],
                ),
              ),
            ],
            if (data.rates.isNotEmpty) ...[
              const SizedBox(height: 12),
              SectionCard(
                title: t.settings.rates,
                subtitle: t.settings.ratesHint,
                child: Column(
                  children: [
                    for (final r in data.rates)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(f.date(r.month, DateStyle.month)),
                                  Text('1 ${r.base} → ${r.quote} · ${r.source.name == 'FIREFLY' ? t.settings.sources.firefly : t.settings.sources.fallback} · ${f.date(r.date)}', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
                                ],
                              ),
                            ),
                            Text(f.number(r.rate, 4), style: numStyle(context, size: 14)),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
