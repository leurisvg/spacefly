/// Reads what a person types as a time: `9`, `930`, `9:30`, `0930`, `21.05`. Returns `HH:mm` (24 hours) or `null` when it isn't a time.
/// Port of libs/client/src/ui-logic/time.ts.
String? parseTime(String input) {
  final m = RegExp(r'^(\d{1,2})(?:[:.]?(\d{2}))?$').firstMatch(input.trim());
  if (m == null) return null;
  final hours = int.parse(m.group(1)!);
  final minutes = int.parse(m.group(2) ?? '0');
  if (hours > 23 || minutes > 59) return null;
  return '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}';
}

String _pad(int n) => n.toString().padLeft(2, '0');

/// `HH:mm` of [now] (injectable for tests).
String nowTime([DateTime? now]) {
  final d = now ?? DateTime.now();
  return '${_pad(d.hour)}:${_pad(d.minute)}';
}

/// `YYYY-MM-DD` as the local date a native date picker takes; [fallback] (an ISO date) when it is not one.
DateTime isoToLocalDate(String iso, String fallback) {
  final valid = RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(iso) ? iso : fallback;
  final p = valid.split('-').map(int.parse).toList();
  return DateTime(p[0], p[1], p[2]);
}

/// The local date a native date picker reports, as `YYYY-MM-DD`.
String localDateToIso(DateTime date) => '${date.year.toString().padLeft(4, '0')}-${_pad(date.month)}-${_pad(date.day)}';

/// The time a native time picker reports, as `HH:mm`.
String timeOfDayToText(int hour, int minute) => '${_pad(hour)}:${_pad(minute)}';
