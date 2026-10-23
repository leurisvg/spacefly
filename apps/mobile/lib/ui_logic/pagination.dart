/// Records shown at a time in the per-account lists. Port of libs/client/src/ui-logic/pagination.ts.
const pageSize = 50;

/// How many pages [count] records make (at least one, so an empty list still says "1 of 1").
int totalPages(int count, {int size = pageSize}) => count <= 0 ? 1 : (count + size - 1) ~/ size;

/// The records of a 1-based page.
List<T> pageSlice<T>(List<T> rows, int page, {int size = pageSize}) {
  final from = (page - 1) * size;
  if (from < 0 || from >= rows.length) return const [];
  return rows.sublist(from, (page * size).clamp(0, rows.length));
}
