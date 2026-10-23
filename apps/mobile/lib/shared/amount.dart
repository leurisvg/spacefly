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

int _count(String s, String ch) => ch.allMatches(s).length;

/// Parses what a person types into a canonical decimal string, or `null` when it isn't a number. Handles `1,234.56`, `1234,5` and
/// `1.234,56`. A lone separator followed by exactly three digits is ambiguous (`1,234`): [decimal] says which character the user's
/// locale uses as decimal mark. Port of `parseAmount` in libs/shared/src/utils/amount.ts.
String? parseAmount(String input, {String decimal = '.'}) {
  var s = input.trim().replaceAll(RegExp(r"[\s ']"), '');
  var sign = '';
  if (s.startsWith('-') || s.startsWith('+')) {
    if (s[0] == '-') sign = '-';
    s = s.substring(1);
  }
  if (!RegExp(r'^[\d.,]*\d[\d.,]*$').hasMatch(s)) return null;

  String? decimalMark, groupMark;
  final dots = _count(s, '.'), commas = _count(s, ',');
  if (dots > 0 && commas > 0) {
    decimalMark = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
    groupMark = decimalMark == '.' ? ',' : '.';
  } else if (dots > 0 || commas > 0) {
    final sep = dots > 0 ? '.' : ',';
    final after = s.length - s.lastIndexOf(sep) - 1;
    if (_count(s, sep) > 1 || (after == 3 && sep != decimal)) {
      groupMark = sep;
    } else {
      decimalMark = sep;
    }
  }

  var int = s, frac = '';
  if (decimalMark != null) {
    if (_count(s, decimalMark) != 1) return null;
    final parts = s.split(decimalMark);
    int = parts[0];
    frac = parts[1];
  }
  if (groupMark != null) {
    if (frac.contains(groupMark)) return null;
    final parts = int.split(groupMark);
    if (!RegExp(r'^\d{1,3}$').hasMatch(parts[0]) || parts.skip(1).any((p) => !RegExp(r'^\d{3}$').hasMatch(p))) return null;
    int = parts.join();
  }
  if (!RegExp(r'^\d*$').hasMatch(int) || !RegExp(r'^\d*$').hasMatch(frac) || (int.isEmpty && frac.isEmpty)) return null;
  int = int.replaceFirst(RegExp(r'^0+(?=\d)'), '');
  if (int.isEmpty) int = '0';
  final out = frac.isNotEmpty ? '$int.$frac' : int;
  return double.parse(out) == 0 ? out : sign + out;
}
