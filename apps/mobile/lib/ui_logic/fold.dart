/// Accents are stripped with an explicit table (as in libs/client/src/ui-logic/fold.ts), so "cafe" finds "Café" on every platform.
const _letters = <String, String>{
  'a': 'àáâãäåāăą',
  'c': 'çćč',
  'd': 'ďđ',
  'e': 'èéêëēėęě',
  'g': 'ğ',
  'i': 'ìíîïīįı',
  'l': 'ł',
  'n': 'ñńň',
  'o': 'òóôõöøōő',
  'r': 'ŕř',
  's': 'śšş',
  't': 'ť',
  'u': 'ùúûüūůűų',
  'y': 'ýÿ',
  'z': 'źżž',
};

final Map<String, String> _base = {
  for (final e in _letters.entries)
    for (final c in e.value.runes) String.fromCharCode(c): e.key,
};

/// Lower-case and strip accents so "cafe" finds "Café".
String fold(String s) {
  final out = StringBuffer();
  for (final c in s.toLowerCase().runes) {
    final ch = String.fromCharCode(c);
    out.write(_base[ch] ?? ch);
  }
  // combining marks left over from decomposed text ("e" + U+0301)
  return out.toString().replaceAll(RegExp('[̀-ͯ]'), '');
}
