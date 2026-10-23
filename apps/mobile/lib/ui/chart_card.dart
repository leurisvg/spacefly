import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../i18n/strings.g.dart';
import '../platform/platform.dart';
import '../state/privacy_store.dart';
import '../ui_logic/text_table.dart';
import 'common.dart';

/// A [SectionCard] around a chart: when it has a [table], a button swaps the chart for that table and another shares it as CSV (the
/// web's "show as table" and download). [fileName] names the CSV and keeps the buttons' keys apart (`chart-toggle-<fileName>`,
/// `chart-share-<fileName>`, `chart-table-<fileName>`). Port of apps/web/src/app/shared/charts/chart-card.ts.
class ChartCard extends ConsumerStatefulWidget {
  const ChartCard({super.key, required this.title, required this.fileName, required this.child, this.subtitle, this.table, this.trailing, this.padding = const EdgeInsets.all(16)});

  final String title;
  final String fileName;
  final String? subtitle;
  final TextTable? table;

  /// Extra actions, before the table buttons.
  final Widget? trailing;
  final EdgeInsetsGeometry padding;
  final Widget child;

  @override
  ConsumerState<ChartCard> createState() => _ChartCardState();
}

class _ChartCardState extends ConsumerState<ChartCard> {
  bool _showTable = false;

  Future<void> _share(TextTable table) async {
    try {
      await ref.read(fileShareProvider).shareText(fileName: 'spacefly-${widget.fileName}.csv', text: table.toCsv());
    } catch (_) {
      if (mounted) ref.read(toastProvider).error(context.t.errors.generic);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final table = widget.table;
    final hidden = ref.watch(privacyProvider);
    final showing = _showTable && table != null;
    final name = widget.fileName;
    return SectionCard(
      title: widget.title,
      subtitle: widget.subtitle,
      padding: widget.padding,
      trailing: widget.trailing == null && table == null
          ? null
          : Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (widget.trailing != null) widget.trailing!,
                if (table != null) ...[
                  IconButton(
                    key: Key('chart-toggle-$name'),
                    visualDensity: VisualDensity.compact,
                    tooltip: showing ? t.chart.showChart : t.chart.showTable,
                    isSelected: showing,
                    icon: Icon(showing ? Icons.bar_chart : Icons.table_chart_outlined),
                    onPressed: () => setState(() => _showTable = !_showTable),
                  ),
                  // Amounts are masked on screen: they must not leave the app as a file.
                  IconButton(
                    key: Key('chart-share-$name'),
                    visualDensity: VisualDensity.compact,
                    tooltip: hidden ? t.explorer.exportHidden : t.chart.shareCsv,
                    icon: const Icon(Icons.ios_share),
                    onPressed: hidden ? null : () => _share(table),
                  ),
                ],
              ],
            ),
      child: showing ? ChartTableView(key: Key('chart-table-$name'), table: table) : widget.child,
    );
  }
}

/// The rows of a [TextTable]: scrolls sideways when it is wider than the card and up when it is long.
class ChartTableView extends StatelessWidget {
  const ChartTableView({super.key, required this.table});

  final TextTable table;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    Widget cell(int column, String value, {bool header = false}) {
      final numeric = table.isNumeric(column);
      final style = header
          ? text.labelSmall?.copyWith(color: scheme.onSurfaceVariant, letterSpacing: 0.6)
          : (numeric ? numStyle(context, size: 13) : text.bodySmall?.copyWith(fontSize: 13));
      return Padding(
        padding: EdgeInsets.fromLTRB(0, header ? 4 : 7, column == table.columns.length - 1 ? 0 : 16, header ? 8 : 7),
        child: Text(value, textAlign: numeric ? TextAlign.right : TextAlign.left, style: style),
      );
    }

    return ConstrainedBox(
      constraints: const BoxConstraints(maxHeight: 360),
      child: SingleChildScrollView(
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Table(
            defaultColumnWidth: const IntrinsicColumnWidth(),
            border: TableBorder(horizontalInside: BorderSide(color: scheme.outlineVariant.withValues(alpha: 0.6))),
            children: [
              TableRow(children: [for (var c = 0; c < table.columns.length; c++) cell(c, table.columns[c], header: true)]),
              for (final row in table.rows) TableRow(children: [for (var c = 0; c < row.length; c++) cell(c, row[c])]),
            ],
          ),
        ),
      ),
    );
  }
}
