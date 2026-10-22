import 'package:intl/intl.dart';

import '../api/models.g.dart' show CurrencyInfo;

enum DateStyle { short, long, month, monthShort, weekday, day, full }

const _symbols = {'DOP': 'RD\$', 'USD': 'US\$', 'EUR': '€'};

/// The currencies offered before `/api/meta` answers.
final fallbackCurrencies = <CurrencyInfo>[
  CurrencyInfo(code: 'DOP', name: 'Peso dominicano', symbol: 'RD\$', decimals: 2),
  CurrencyInfo(code: 'USD', name: 'US Dollar', symbol: 'US\$', decimals: 2),
];

/// Locale-aware number/date formatting (es-DO / en-US). Port of libs/client/src/format/format.service.ts.
/// Immutable: a new one is built when the language, the currency or privacy mode changes (see `formatterProvider`).
class Formatter {
  Formatter({required this.languageCode, required this.currency, List<CurrencyInfo>? currencies, this.hidden = false})
      : currencies = currencies ?? fallbackCurrencies;

  /// `es` or `en`.
  final String languageCode;

  /// The display currency, used when none is given.
  final String currency;
  final List<CurrencyInfo> currencies;

  /// True while privacy mode is on: amounts and data percentages then show 0.
  final bool hidden;

  /// Dates and names follow the language (`es_DO`, `en_US`).
  String get locale => languageCode == 'en' ? 'en_US' : 'es_DO';

  /// Numbers use the separators es-DO has on the web (`1,234.56`), which are the English ones; intl's own `es_DO` data differs.
  static const _numberLocale = 'en_US';

  final Map<String, NumberFormat> _numbers = {};
  final Map<String, DateFormat> _dates = {};

  String symbol([String? code]) {
    final c = code ?? currency;
    for (final info in currencies) {
      if (info.code == c) return info.symbol;
    }
    return _symbols[c] ?? c;
  }

  /// Replaces an amount or data percentage by 0 in privacy mode. Rates, dates and counts are not masked.
  double _mask(double value) => hidden ? 0 : value;

  NumberFormat _nf(String key, NumberFormat Function() build) => _numbers.putIfAbsent(key, build);

  String number(num value, [int decimals = 2]) => _nf('n$decimals', () => NumberFormat.decimalPatternDigits(locale: _numberLocale, decimalDigits: decimals)).format(value);

  /// A plain amount without currency symbol (foreign originals): masked in privacy mode, unlike [number].
  String amount(num value, [int decimals = 2]) => number(_mask(value.toDouble()), decimals);

  /// "RD$1,234.56" / "−RD$1,234.56" / "+US$12.00" (signed).
  String money(num? value, {String? currency, bool signed = false, int decimals = 2, bool abs = false}) {
    if (value == null || value.isNaN) return '—';
    final v = _mask(abs ? value.abs().toDouble() : value.toDouble());
    final sign = v < 0 ? '−' : (signed && v > 0 ? '+' : '');
    return '$sign${symbol(currency)}${number(v.abs(), decimals)}';
  }

  /// "RD$12.9K" style for axes, chips and tight spaces. `currency: false` formats the bare number.
  String compact(num? value, {Object? currency}) {
    if (value == null) return '—';
    final v = _mask(value.toDouble());
    final sign = v < 0 ? '−' : '';
    final n = _spanishCompact(_nf('compact', () => NumberFormat.compact(locale: _numberLocale)..maximumFractionDigits = 1).format(v.abs()));
    if (currency == false) return '$sign$n';
    return '$sign${symbol(currency is String ? currency : null)}$n';
  }

  /// Spanish spells the compact suffixes out: 12.9K → "12.9 mil", 1.5M → "1.5 M", 2B → "2 mil M" (thousand million).
  String _spanishCompact(String n) {
    if (languageCode == 'en') return n;
    const suffixes = {'K': ' mil', 'M': ' M', 'B': ' mil M', 'T': ' B'};
    final last = n.isEmpty ? '' : n[n.length - 1];
    return suffixes.containsKey(last) ? '${n.substring(0, n.length - 1)}${suffixes[last]}' : n;
  }

  /// Ratio → "12.3 %" (es) / "12.3%" (en). Masked in privacy mode; pass `mask: false` for values that are settings rather than data.
  String pct(num? ratio, {int decimals = 1, bool signed = false, bool mask = true}) {
    if (ratio == null || !ratio.isFinite) return '—';
    final shown = mask ? _mask(ratio.toDouble()) : ratio.toDouble();
    // es-DO writes a no-break space before the sign: "12.3 %".
    final sign = languageCode == 'en' ? '%' : '\u00A0%';
    var s = _nf('p$decimals', () => NumberFormat.decimalPatternDigits(locale: _numberLocale, decimalDigits: decimals)).format(shown.abs() * 100) + sign;
    // `signDisplay: exceptZero` hides the sign of a value that rounds to zero; plain `auto` keeps a minus.
    final nonZero = RegExp(r'[1-9]').hasMatch(s);
    if (shown < 0 && (!signed || nonZero)) {
      s = '−$s';
    } else if (signed && shown > 0 && nonZero) {
      s = '+$s';
    }
    return s;
  }

  /// A percentage already on the 0–100 scale in the plain "12.3%" form used by chart tooltips and axes.
  String share(num percent, [int? decimals]) {
    final v = _mask(percent.toDouble());
    if (decimals != null) return '${v.toStringAsFixed(decimals)}%';
    return '${v == v.roundToDouble() ? v.toInt() : v}%';
  }

  DateFormat _df(DateStyle style) => _dates.putIfAbsent(style.name, () {
        switch (style) {
          case DateStyle.short:
            return DateFormat.MMMd(locale);
          case DateStyle.long:
            return DateFormat.yMMMMd(locale);
          case DateStyle.full:
            return DateFormat.yMMMMEEEEd(locale);
          case DateStyle.month:
            return DateFormat.yMMMM(locale);
          case DateStyle.monthShort:
            return DateFormat.MMM(locale);
          case DateStyle.weekday:
            return DateFormat.E(locale);
          case DateStyle.day:
            return DateFormat.MMMEd(locale);
        }
      });

  /// `iso` is `YYYY-MM-DD` (a longer timestamp is cut) or `YYYY-MM`. Formatted from its calendar fields, so no day drift.
  String date(String? iso, [DateStyle style = DateStyle.short]) {
    if (iso == null || iso.isEmpty) return '—';
    final d = iso.length == 7 ? '$iso-01' : iso.substring(0, 10);
    final parts = d.split('-').map(int.parse).toList();
    return _df(style).format(DateTime.utc(parts[0], parts[1], parts[2]));
  }

  /// Abbreviated month label for chart axes: "sept 26".
  String monthLabel(String month, {bool withYear = true}) {
    final d = DateTime.utc(int.parse(month.substring(0, 4)), int.parse(month.substring(5, 7)));
    final f = _dates.putIfAbsent('m$withYear', () => withYear ? DateFormat('MMM yy', locale) : DateFormat.MMM(locale));
    return f.format(d).replaceAll('.', '');
  }

  /// Narrow weekday names, Monday first.
  List<String> weekdayNames() {
    final f = _dates.putIfAbsent('wd', () => DateFormat.EEEEE(locale));
    // 2024-01-01 was a Monday.
    return List.generate(7, (i) => f.format(DateTime.utc(2024, 1, 1 + i)));
  }
}
