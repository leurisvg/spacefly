/// Cell of a CSV line: quoted when it holds a separator, a quote or a line break.
String csvCell(Object? v) {
  final s = '${v ?? ''}';
  return RegExp(r'[",\n;]').hasMatch(s) ? '"${s.replaceAll('"', '""')}"' : s;
}

/// A table of rows of already-formatted text: the "show as table" form of a chart, and what is shared as CSV.
/// Port of `ChartTable` in libs/client/src/charts/chart-table.ts.
class TextTable {
  const TextTable({required this.columns, required this.rows, this.numeric});

  final List<String> columns;
  final List<List<String>> rows;

  /// Column indexes that hold numbers (right-aligned, tabular figures). Unset: every column but the first.
  final List<int>? numeric;

  bool isNumeric(int column) => numeric?.contains(column) ?? column > 0;

  /// CSV (with BOM, for spreadsheets) of what the table shows.
  String toCsv() => '﻿${[columns, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')}';
}
