/// Money travels between the app and the server as decimal strings ("1234.56"), never as floats, so the digits the user typed reach
/// Firefly untouched. Port of libs/shared/src/utils/amount.ts.
library;

final _positive = RegExp(r'^\d+(\.\d+)?$');

/// `true` for a canonical decimal string strictly greater than zero.
bool isPositiveAmount(String? value) => value != null && value.isNotEmpty && _positive.hasMatch(value) && double.parse(value) > 0;

/// Drops the padding zeros Firefly stores amounts with ("12800.00000000" → "12800.00"), keeping at least two decimals and every digit
/// that carries value ("0.12345600" → "0.123456"). Anything that isn't a plain decimal is returned as is.
String trimAmountZeros(String value) {
  final m = RegExp(r'^(-?\d+)\.(\d+)$').firstMatch(value);
  if (m == null) return value;
  final fraction = m.group(2)!.replaceFirst(RegExp(r'0+$'), '').padRight(2, '0');
  return '${m.group(1)}.$fraction';
}
