import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/format/formatter.dart';

import 'support.dart';

void main() {
  setUpAll(initFormats);

  Formatter fmt({String lang = 'es', String currency = 'DOP', bool hidden = false}) => Formatter(languageCode: lang, currency: currency, hidden: hidden);

  test('formats money with currency symbol and minus sign', () {
    final f = fmt();
    expect(f.money(1234.5), 'RD\$1,234.50');
    expect(f.money(-1234.5), '−RD\$1,234.50');
    expect(f.money(12, currency: 'USD', signed: true), '+US\$12.00');
    expect(f.money(-7, currency: 'USD', abs: true), 'US\$7.00');
    expect(f.money(1234.5, decimals: 0), 'RD\$1,235');
  });

  test('shows a dash for missing values', () {
    final f = fmt();
    expect(f.money(null), '—');
    expect(f.money(double.nan), '—');
    expect(f.compact(null), '—');
    expect(f.pct(null), '—');
    expect(f.pct(double.infinity), '—');
    expect(f.date(null), '—');
  });

  test('uses the display currency when none is given', () {
    expect(fmt(currency: 'USD').money(5), 'US\$5.00');
  });

  test('falls back to the currency code for unknown currencies', () {
    final f = fmt();
    expect(f.symbol('CHF'), 'CHF');
    expect(f.symbol('EUR'), '€');
  });

  test('formats compact amounts', () {
    final f = fmt(lang: 'en');
    expect(f.compact(12900), 'RD\$12.9K');
    expect(f.compact(-1500000, currency: 'USD'), '−US\$1.5M');
    expect(f.compact(950, currency: false), '950');
  });

  test('formats plain 0–100 shares for tooltips and axes', () {
    final f = fmt(lang: 'en');
    expect(f.share(12.345, 1), '12.3%');
    expect(f.share(40), '40%');
  });

  test('formats percentages with a true minus sign', () {
    final f = fmt(lang: 'en');
    expect(f.pct(0.1234), '12.3%');
    expect(f.pct(-0.05, decimals: 0), '−5%');
    expect(f.pct(0.05, signed: true), '+5.0%');
    expect(f.pct(0, signed: true), '0.0%');
  });

  test('formats dates from their calendar fields, without day drift', () {
    final f = fmt(lang: 'en');
    expect(f.date('2026-09-01'), 'Sep 1');
    expect(f.date('2026-09-30T23:59:59-04:00', DateStyle.long), 'September 30, 2026');
    expect(f.date('2026-09', DateStyle.month), 'September 2026');
    expect(f.date('2026-09-15', DateStyle.full), 'Tuesday, September 15, 2026');
  });

  test('speaks the language it is given', () {
    final es = fmt(lang: 'es');
    expect(es.locale, 'es_DO');
    expect(es.date('2026-09-01', DateStyle.month), matches(RegExp('septiembre', caseSensitive: false)));
    final en = fmt(lang: 'en');
    expect(en.locale, 'en_US');
    expect(en.date('2026-09-01', DateStyle.month), 'September 2026');
  });

  test('Spanish keeps the web\'s number separators and spells compact suffixes out', () {
    final f = fmt();
    expect(f.money(1234.5), 'RD\$1,234.50');
    expect(f.pct(0.1234), '12.3\u00A0%');
    expect(f.compact(12900), 'RD\$12.9 mil');
    expect(f.compact(1500000, currency: 'USD'), 'US\$1.5 M');
    expect(f.compact(950, currency: false), '950');
  });

  test('builds month labels and weekday names', () {
    final f = fmt(lang: 'en');
    expect(f.monthLabel('2026-09'), 'Sep 26');
    expect(f.monthLabel('2026-09', withYear: false), 'Sep');
    final days = f.weekdayNames();
    expect(days, hasLength(7));
    expect(days.first, 'M');
    expect(fmt(lang: 'es').monthLabel('2026-09'), isNot(contains('.')));
  });

  group('privacy mode', () {
    final f = fmt(lang: 'en', hidden: true);

    test('shows every amount as 0', () {
      expect(f.money(1234.5), 'RD\$0.00');
      expect(f.money(-1234.5), 'RD\$0.00');
      expect(f.money(12, currency: 'USD', signed: true), 'US\$0.00');
      expect(f.compact(12900), 'RD\$0');
      expect(f.compact(-1500000, currency: 'USD'), 'US\$0');
      expect(f.amount(50.25), '0.00');
    });

    test('shows every data percentage as 0', () {
      expect(f.pct(0.25), '0.0%');
      expect(f.pct(-0.05, decimals: 0), '0%');
      expect(f.pct(0.05, signed: true), '0.0%');
      expect(f.share(12.345, 1), '0.0%');
      expect(f.share(40), '0%');
    });

    test('keeps percentages that are settings, not data', () {
      expect(f.pct(0.05, mask: false), '5.0%');
    });

    test('does not mask rates, dates or the missing-value dash', () {
      expect(f.number(61.0123, 4), '61.0123');
      expect(f.date('2026-09-01', DateStyle.long), 'September 1, 2026');
      expect(f.pct(null), '—');
      expect(f.money(null), '—');
    });

    test('shows the real amounts again when it is off', () {
      final shown = fmt(lang: 'en');
      expect(shown.money(1234.5), 'RD\$1,234.50');
      expect(shown.pct(0.25), '25.0%');
      expect(shown.share(12.345, 1), '12.3%');
    });
  });
}
