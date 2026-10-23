import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../shared/dates.dart';
import '../storage/stores.dart';
import 'meta_store.dart';

const currencyKey = 'spacefly.currency';

/// "Today", replaceable in tests.
final clockProvider = Provider<DateTime Function()>((ref) => DateTime.now);

class FiltersState {
  const FiltersState({required this.preset, required this.period, this.preferredCurrency, this.refreshTick = 0});

  final PeriodPreset preset;
  final Period period;

  /// Currency the user prefers (persisted); `null` follows the server's primary currency.
  final String? preferredCurrency;

  /// Bumped by "Refresh" so every report refetches.
  final int refreshTick;

  FiltersState copyWith({PeriodPreset? preset, Period? period, String? preferredCurrency, int? refreshTick}) => FiltersState(
        preset: preset ?? this.preset,
        period: period ?? this.period,
        preferredCurrency: preferredCurrency ?? this.preferredCurrency,
        refreshTick: refreshTick ?? this.refreshTick,
      );
}

/// Global report filters: period and display currency. Port of libs/client/src/state/filters.store.ts, with the platform's
/// in-memory params source: the period lives only for the session, the currency is persisted.
final filtersProvider = NotifierProvider<FiltersNotifier, FiltersState>(FiltersNotifier.new);

class FiltersNotifier extends Notifier<FiltersState> {
  @override
  FiltersState build() {
    final saved = ref.read(keyValueStoreProvider).getString(currencyKey);
    return FiltersState(
      preset: PeriodPreset.month,
      period: presetPeriod(PeriodPreset.month, _today),
      preferredCurrency: saved != null && RegExp(r'^[A-Z]{3}$').hasMatch(saved) ? saved : null,
    );
  }

  String get _today => todayIso(ref.read(clockProvider)());

  /// `anchor` defaults to today.
  void setPreset(PeriodPreset preset, {String? anchor}) {
    state = state.copyWith(preset: preset, period: presetPeriod(preset, anchor ?? _today));
  }

  void setCustom(Period period) {
    state = state.copyWith(preset: PeriodPreset.custom, period: period);
  }

  void shift(int steps) {
    state = state.copyWith(period: shiftPeriod(state.preset, state.period, steps));
  }

  Future<void> setCurrency(String code) async {
    state = state.copyWith(preferredCurrency: code);
    await ref.read(keyValueStoreProvider).setString(currencyKey, code);
  }

  /// The shared filters a link carries: `p` (preset), `start` / `end` and `cur`, as the web reads them from the URL. What is not valid
  /// is ignored. A currency from a link is used for the session only; it does not replace the one the user saved.
  void applyParams(Map<String, String> params) {
    final cur = params['cur'];
    final preset = PeriodPreset.values.where((v) => v.name == params['p']).firstOrNull;
    final start = params['start'], end = params['end'];
    var next = state;
    if (cur != null && RegExp(r'^[A-Z]{3}$').hasMatch(cur)) next = next.copyWith(preferredCurrency: cur);
    if (isIsoDate(start) && isIsoDate(end) && start!.compareTo(end!) <= 0) {
      next = next.copyWith(preset: preset ?? PeriodPreset.custom, period: Period(start, end));
    } else if (preset != null && preset != PeriodPreset.custom) {
      next = next.copyWith(preset: preset, period: presetPeriod(preset, _today));
    }
    state = next;
  }

  void refresh() => state = state.copyWith(refreshTick: state.refreshTick + 1);

  FiltersState? _beforeScope;

  /// Whether a screen has put its own period in place of the user's (see [scopePreset]).
  bool get scoped => _beforeScope != null;

  /// A screen that opens on a period of its own (an account on its last 30 days): the user's period is kept aside and comes back with
  /// [release]. Changing the period meanwhile changes the screen's, not the one kept. Port of `scopePreset` in the web's filters store.
  void scopePreset(PeriodPreset preset, {String? anchor}) {
    _beforeScope ??= state;
    state = state.copyWith(preset: preset, period: presetPeriod(preset, anchor ?? _today));
  }

  void release() {
    final saved = _beforeScope;
    if (saved == null) return;
    _beforeScope = null;
    state = state.copyWith(preset: saved.preset, period: saved.period);
  }
}

/// The display currency: the user's choice, else the server's primary currency.
final currencyProvider = Provider<String>((ref) => ref.watch(filtersProvider.select((f) => f.preferredCurrency)) ?? ref.watch(primaryCurrencyProvider));

/// Query parameters shared by every report request.
final filterQueryProvider = Provider<Map<String, Object>>((ref) {
  final f = ref.watch(filtersProvider);
  return {'start': f.period.start, 'end': f.period.end, 'currency': ref.watch(currencyProvider), '_r': f.refreshTick};
});
