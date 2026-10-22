import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/api_client.dart';
import '../../api/models.g.dart' hide Ref;
import '../../api/write_api.dart';
import '../../i18n/strings.g.dart';
import '../../platform/platform.dart';
import '../../shared/dates.dart';
import '../../state/filters_store.dart';

/// A rate typed by a person ("62,5", " 62.50 ") as the decimal string the server wants, or `null` when it isn't a number above zero.
String? normalizeRate(String input) {
  final text = input.trim().replaceFirst(',', '.');
  return RegExp(r'^\d+(\.\d+)?$').hasMatch(text) && double.parse(text) > 0 ? text : null;
}

/// A stored rate as editable text: up to six decimals, without padding zeros.
String rateText(double rate) {
  final fixed = double.parse(rate.toStringAsFixed(6));
  return fixed == fixed.roundToDouble() ? fixed.toInt().toString() : fixed.toString();
}

final exchangeRatesProvider = FutureProvider.autoDispose<ExchangeRatesResponse>((ref) async {
  final response = await ref.watch(dioProvider).get<Map<String, dynamic>>('/api/exchange-rates');
  return ExchangeRatesResponse.fromJson(response.data!);
});

class ExchangeRateForm {
  const ExchangeRateForm({this.picked, this.date = '', this.rate = '', this.saving = false, this.error});

  final String? picked;
  final String date;
  final String rate;
  final bool saving;
  final String? error;

  ExchangeRateForm copyWith({Object? picked = _keep, String? date, String? rate, bool? saving, Object? error = _keep}) => ExchangeRateForm(
        picked: identical(picked, _keep) ? this.picked : picked as String?,
        date: date ?? this.date,
        rate: rate ?? this.rate,
        saving: saving ?? this.saving,
        error: identical(error, _keep) ? this.error : error as String?,
      );
}

const _keep = Object();

/// The form that adds or replaces a rate (the state; [ExchangeRatesView] has what follows from it and the stored rates).
final exchangeRateFormProvider = NotifierProvider.autoDispose<ExchangeRateFormNotifier, ExchangeRateForm>(ExchangeRateFormNotifier.new);

class ExchangeRateFormNotifier extends AutoDisposeNotifier<ExchangeRateForm> {
  @override
  ExchangeRateForm build() => ExchangeRateForm(date: todayIso(ref.read(clockProvider)()));

  void pick(String code) => state = state.copyWith(picked: code);
  void setDate(String iso) => state = state.copyWith(date: iso);
  void setRate(String text) => state = state.copyWith(rate: text);

  /// Loads a stored rate into the form, to change its value.
  void edit(ExchangeRateRow row) => state = state.copyWith(picked: row.currency, date: row.date, rate: rateText(row.rate), error: null);

  String _failure(Object err) {
    if (err is WriteError) {
      final first = err.fields.values.expand((m) => m).firstOrNull;
      if (first != null) return first;
    }
    return t.errors.generic;
  }

  Future<void> save() async {
    // built here, not read from [exchangeRatesViewProvider]: that one depends on this notifier
    final view = ExchangeRatesView(rates: ref.read(exchangeRatesProvider), form: state);
    final value = normalizeRate(state.rate);
    if (!view.canSave || value == null) return;
    state = state.copyWith(saving: true, error: null);
    try {
      await ref.read(writeApiProvider).create('exchange-rates', {'currency': view.currency, 'date': state.date, 'rate': value});
      ref.read(toastProvider).success(t.settings.exchange.saved);
      state = state.copyWith(rate: '');
      ref.invalidate(exchangeRatesProvider);
    } catch (err) {
      state = state.copyWith(error: _failure(err));
    } finally {
      state = state.copyWith(saving: false);
    }
  }

  Future<void> remove(ExchangeRateRow row) async {
    final ok = await ref.read(confirmProvider).confirm(Confirmation(
          title: t.settings.exchange.deleteTitle,
          message: t.settings.exchange.deleteMessage(currency: row.currency, date: row.date),
          confirmLabel: t.forms.delete,
          destructive: true,
        ));
    if (!ok) return;
    try {
      await ref.read(writeApiProvider).remove('exchange-rates/${row.from}/${row.to}/${row.date}');
      ref.read(toastProvider).success(t.settings.exchange.deleted);
      ref.invalidate(exchangeRatesProvider);
    } catch (err) {
      ref.read(toastProvider).error(_failure(err));
    }
  }
}

/// Add, replace and delete the exchange rates stored in Firefly (the ones every converted amount uses).
/// Port of libs/client/src/features/settings/exchange-rates.vm.ts.
class ExchangeRatesView {
  ExchangeRatesView({required this.rates, required this.form});

  final AsyncValue<ExchangeRatesResponse> rates;
  final ExchangeRateForm form;

  ExchangeRatesResponse? get data => rates.valueOrNull;
  List<ExchangeRateRow> get rows => data?.rates ?? const [];
  List<String> get currencies => data?.currencies ?? const [];
  String get primary => data?.primary ?? '';
  String get currency => form.picked ?? currencies.firstOrNull ?? '';
  String? get rateValue => normalizeRate(form.rate);
  bool get canSave => currency.isNotEmpty && isIsoDate(form.date) && rateValue != null && !form.saving;

  /// The day already has a rate for this currency: saving replaces it.
  bool get replaces => rows.any((r) => r.currency == currency && r.date == form.date);
}

final exchangeRatesViewProvider = Provider.autoDispose<ExchangeRatesView>((ref) => ExchangeRatesView(rates: ref.watch(exchangeRatesProvider), form: ref.watch(exchangeRateFormProvider)));
