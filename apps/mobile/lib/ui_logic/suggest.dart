import 'fold.dart';

class Suggestion {
  const Suggestion(this.value, this.label);
  final String value;
  final String label;
}

/// The options to offer under a text field while it is typed into: those that contain the text (ignoring case and accents), best
/// matches (prefix) first, at most [max]. Nothing is offered once the text already is one of them, so the list closes by itself after a
/// pick. Port of libs/client/src/ui-logic/suggest.ts.
List<Suggestion> suggestionsFor(List<Suggestion> options, String text, {int max = 6}) {
  final q = fold(text.trim());
  if (q.isNotEmpty && options.any((o) => fold(o.label) == q)) return const [];
  final found = q.isEmpty ? options : options.where((o) => fold(o.label).contains(q)).toList();
  int starts(Suggestion o) => q.isNotEmpty && fold(o.label).startsWith(q) ? 0 : 1;
  final indexed = [for (final (i, o) in found.indexed) (o, i)];
  indexed.sort((a, b) => starts(a.$1) - starts(b.$1) != 0 ? starts(a.$1) - starts(b.$1) : a.$2 - b.$2);
  return [for (final e in indexed.take(max)) e.$1];
}
