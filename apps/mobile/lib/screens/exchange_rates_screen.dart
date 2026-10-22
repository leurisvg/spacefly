import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/settings/exchange_rates_vm.dart';
import '../format/formatter.dart';
import '../format/formatter_provider.dart';
import '../i18n/strings.g.dart';
import '../shared/dates.dart';
import '../ui/common.dart';
import '../ui/form_widgets.dart';
import '../ui_logic/time.dart';

/// Add, replace and delete the exchange rates stored in Firefly (the ones every converted amount uses).
/// Port of libs/client/src/features/settings/exchange-rates.vm.ts.
class ExchangeRatesScreen extends ConsumerStatefulWidget {
  const ExchangeRatesScreen({super.key});

  @override
  ConsumerState<ExchangeRatesScreen> createState() => _ExchangeRatesScreenState();
}

class _ExchangeRatesScreenState extends ConsumerState<ExchangeRatesScreen> {
  final _rate = TextEditingController();

  @override
  void dispose() {
    _rate.dispose();
    super.dispose();
  }

  Future<void> _pickDate(String current) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isoToLocalDate(current, todayIso(DateTime.now())),
      firstDate: DateTime(2000),
      lastDate: DateTime(DateTime.now().year + 1, 12, 31),
      helpText: context.t.settings.exchange.date,
    );
    if (picked != null) ref.read(exchangeRateFormProvider.notifier).setDate(localDateToIso(picked));
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(exchangeRateFormProvider, (prev, next) {
      if (_rate.text != next.rate) _rate.value = TextEditingValue(text: next.rate, selection: TextSelection.collapsed(offset: next.rate.length));
    });
    final t = context.t;
    final view = ref.watch(exchangeRatesViewProvider);
    final form = view.form;
    final notifier = ref.read(exchangeRateFormProvider.notifier);
    final f = ref.watch(formatterProvider);
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: Text(t.settings.exchange.title)),
      body: view.rates.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => EmptyState(icon: Icons.cloud_off_outlined, title: t.errors.load, onRetry: () => ref.invalidate(exchangeRatesProvider)),
        data: (data) => ListView(
          key: const Key('exchange-rates'),
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          children: [
            Text(t.settings.exchange.hint, style: TextStyle(color: scheme.onSurfaceVariant)),
            const SizedBox(height: 16),
            SectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (view.currencies.isNotEmpty)
                    Wrap(
                      spacing: 8,
                      children: [
                        for (final c in view.currencies)
                          ChoiceChip(key: Key('currency-$c'), label: Text(c), selected: view.currency == c, onSelected: (_) => notifier.pick(c)),
                      ],
                    ),
                  const SizedBox(height: 16),
                  TapField(key: const Key('rate-date'), label: t.settings.exchange.date, icon: Icons.event_outlined, value: f.date(form.date, DateStyle.long), onTap: () => _pickDate(form.date), trailing: const SizedBox.shrink()),
                  const SizedBox(height: 16),
                  TextField(
                    key: const Key('rate'),
                    controller: _rate,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(labelText: t.settings.exchange.rate, helperText: view.currency.isEmpty ? null : t.settings.exchange.rateHint(currency: view.currency, primary: view.primary)),
                    onChanged: notifier.setRate,
                  ),
                  if (view.replaces) Padding(padding: const EdgeInsets.only(top: 8), child: Text(t.settings.exchange.replacing, style: TextStyle(color: scheme.tertiary))),
                  if (form.error != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(form.error!, key: const Key('rate-error'), style: TextStyle(color: scheme.error))),
                  const SizedBox(height: 16),
                  FilledButton(key: const Key('rate-save'), onPressed: view.canSave ? notifier.save : null, child: Text(view.replaces ? t.settings.exchange.replace : t.settings.exchange.add)),
                ],
              ),
            ),
            const SizedBox(height: 12),
            SectionCard(
              padding: const EdgeInsets.fromLTRB(16, 8, 4, 8),
              child: view.rows.isEmpty
                  ? Padding(padding: const EdgeInsets.symmetric(vertical: 16), child: Center(child: Text(t.settings.exchange.none, style: TextStyle(color: scheme.onSurfaceVariant))))
                  : Column(
                      children: [
                        for (final r in view.rows)
                          InkWell(
                            key: Key('rate-row-${r.currency}-${r.date}'),
                            onTap: () => notifier.edit(r),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(r.currency, style: const TextStyle(fontWeight: FontWeight.w600)),
                                        Text(f.date(r.date, DateStyle.long), style: Theme.of(context).textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
                                      ],
                                    ),
                                  ),
                                  Text(rateText(r.rate), style: numStyle(context, size: 14)),
                                  IconButton(key: Key('rate-delete-${r.currency}-${r.date}'), tooltip: t.forms.delete, icon: const Icon(Icons.delete_outline), onPressed: () => notifier.remove(r)),
                                ],
                              ),
                            ),
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
