import 'package:flutter_riverpod/flutter_riverpod.dart';

/// One member of a grouped slice (e.g. a category folded into "Others") with its amount.
class BreakdownRow {
  const BreakdownRow({required this.id, required this.name, required this.value});
  final String? id;
  final String name;
  final double value;
}

/// A date range the screen can switch between (e.g. "Last 12 months" / "Selected period").
class TxRange {
  const TxRange({required this.label, required this.start, required this.end});
  final String label;
  final String start;
  final String end;
}

class TxDetailRequest {
  const TxDetailRequest({required this.title, required this.filter, this.subtitle, this.breakdown, this.ranges});

  final String title;
  final String? subtitle;

  /// `/api/transactions` filter (`type`, `category`, `categories`, `budget`, `tag`, `bill`, `account`, `counterparty`, `q`, `start`, `end`).
  /// `start`/`end` default to the global period.
  final Map<String, String> filter;

  /// When the request covers a group of categories: what it is made of, with amounts.
  final List<BreakdownRow>? breakdown;

  /// When set, the screen offers these ranges as a switch; the filter's own start/end picks the active one.
  final List<TxRange>? ranges;

  TxDetailRequest withFilter(Map<String, String> extra) => TxDetailRequest(
        title: title,
        subtitle: subtitle,
        filter: {...filter, ...extra},
        breakdown: breakdown,
        ranges: ranges,
      );
}

/// The transactions behind any chart element or row: set a request, then open the drill-down screen.
/// Port of libs/client/src/state/tx-detail.service.ts.
final txDetailProvider = NotifierProvider<TxDetailNotifier, TxDetailRequest?>(TxDetailNotifier.new);

class TxDetailNotifier extends Notifier<TxDetailRequest?> {
  @override
  TxDetailRequest? build() => null;

  void open(String title, Map<String, String> filter, {String? subtitle, List<TxRange>? ranges}) {
    state = TxDetailRequest(title: title, filter: filter, subtitle: subtitle, ranges: ranges);
  }

  /// Re-queries the open request over another range.
  void setRange(TxRange range) {
    final r = state;
    if (r != null) state = r.withFilter({'start': range.start, 'end': range.end});
  }

  /// Transactions of a group of categories (a folded "Others" slice) plus a breakdown of its members.
  void openCategories(String title, List<BreakdownRow> rows, {Map<String, String> filter = const {}}) {
    state = TxDetailRequest(title: title, filter: {...filter, 'categories': rows.map((r) => r.id ?? 'none').join(',')}, breakdown: rows);
  }

  void close() => state = null;
}
