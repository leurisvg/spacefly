import 'package:flutter/material.dart';

import '../api/models.g.dart';
import '../format/formatter.dart';
import '../i18n/strings.g.dart';
import '../theme/app_theme.dart';
import '../ui_logic/calendar_cells.dart';

/// The email's "Daily Cash Flow" calendar: per day an income bar (left) and an expense bar (right) growing from the bottom, the value
/// inside the bar when it fits or just above it, the day number in the middle and dots for scheduled bills and recurrences.
/// Port of apps/web/src/app/shared/components/calendar-grid.ts. Tapping a day calls [onDay] with its date.
class CalendarGrid extends StatelessWidget {
  const CalendarGrid({super.key, required this.days, required this.f, required this.today, required this.onDay, this.scheduled = const [], this.scale, this.currency});

  final List<CalendarDay> days;
  final List<ScheduledItem> scheduled;
  final Formatter f;
  final String today;
  final void Function(String date) onDay;

  /// Value that fills a cell; defaults to the largest day shown.
  final double? scale;

  /// Currency of the day amounts when it isn't the display currency.
  final String? currency;

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final tokens = context.tokens;
    final scheme = Theme.of(context).colorScheme;
    final cells = buildCalendarCells(f, days, scheduled, scale: scale, today: today, currency: currency);
    final blanks = calendarBlanks(days);
    final warning = tokens.moneyDeficit;

    Widget cell(CalendarCell c) {
      Widget value(double v, double h, bool inside, Color color, Alignment side) => Align(
            alignment: Alignment(side.x, 1),
            child: FractionallySizedBox(
              widthFactor: 0.5,
              heightFactor: 1,
              child: LayoutBuilder(
                builder: (context, box) {
                  final bottom = inside ? box.maxHeight * h / 100 - 11 : box.maxHeight * h / 100 + 2;
                  return Stack(children: [
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: bottom < 0 ? 0 : bottom,
                      child: Text(shortAmount(v, hidden: f.hidden), textAlign: TextAlign.center, maxLines: 1, style: TextStyle(fontSize: 8, height: 1, fontWeight: FontWeight.w700, color: inside ? tokens.chartOnFill : color)),
                    ),
                  ]);
                },
              ),
            ),
          );

      return Semantics(
        label: c.tip,
        button: true,
        // Holding a day shows what the web shows on hover: its income, expenses, balance and what is scheduled.
        child: Tooltip(
          message: c.tip,
          triggerMode: TooltipTriggerMode.longPress,
          excludeFromSemantics: true,
          child: InkWell(
            key: Key('day-${c.day.date}'),
            onTap: () => onDay(c.day.date),
            borderRadius: BorderRadius.circular(6),
            child: Opacity(
              opacity: c.future && c.scheduled.isEmpty ? 0.6 : 1,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: tokens.chartSurface,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: c.today ? scheme.primary : tokens.chartGrid, width: c.today ? 1.5 : 1),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(5),
                  child: Stack(
                    children: [
                      Positioned.fill(
                        child: Row(children: [
                          Expanded(child: ColoredBox(color: tokens.moneyIncome.withValues(alpha: 0.1))),
                          Expanded(child: ColoredBox(color: tokens.moneyExpense.withValues(alpha: 0.1))),
                        ]),
                      ),
                      if (c.incH > 0)
                        Align(alignment: Alignment.bottomLeft, child: FractionallySizedBox(widthFactor: 0.5, heightFactor: (c.incH / 100).clamp(0, 1), child: ColoredBox(color: tokens.moneyIncome.withValues(alpha: 0.85)))),
                      if (c.expH > 0)
                        Align(alignment: Alignment.bottomRight, child: FractionallySizedBox(widthFactor: 0.5, heightFactor: (c.expH / 100).clamp(0, 1), child: ColoredBox(color: tokens.moneyExpense.withValues(alpha: 0.85)))),
                      if (c.day.income > 0) Positioned.fill(child: value(c.day.income, c.incH, c.incInside, tokens.moneyIncome, Alignment.centerLeft)),
                      if (c.day.expense > 0) Positioned.fill(child: value(c.day.expense, c.expH, c.expInside, tokens.moneyExpense, Alignment.centerRight)),
                      Center(child: Text('${c.num}', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: scheme.onSurface, shadows: const [Shadow(blurRadius: 2, color: Color(0x66000000))]))),
                      if (c.scheduled.isNotEmpty)
                        Positioned(
                          top: 3,
                          right: 3,
                          child: Row(mainAxisSize: MainAxisSize.min, children: [
                            for (final s in c.scheduled.take(3))
                              Container(margin: const EdgeInsets.only(left: 2), width: 5, height: 5, decoration: BoxDecoration(shape: BoxShape.circle, color: s.kind == Kind.BILL ? warning : scheme.primary)),
                          ]),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }

    Widget legendItem(Color color, String label, {bool dot = false}) => Row(mainAxisSize: MainAxisSize.min, children: [
          Container(width: dot ? 8 : 10, height: dot ? 8 : 10, decoration: BoxDecoration(color: color, shape: dot ? BoxShape.circle : BoxShape.rectangle, borderRadius: dot ? null : BorderRadius.circular(2))),
          const SizedBox(width: 5),
          Text(label, style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
        ]);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          for (final w in f.weekdayNames()) Expanded(child: Padding(padding: const EdgeInsets.only(bottom: 4), child: Text(w, textAlign: TextAlign.center, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: scheme.onSurfaceVariant)))),
        ]),
        GridView.count(
          crossAxisCount: 7,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 4,
          crossAxisSpacing: 4,
          childAspectRatio: 0.9,
          children: [
            for (var i = 0; i < blanks; i++) const SizedBox.shrink(),
            for (final c in cells) cell(c),
          ],
        ),
        const SizedBox(height: 10),
        Wrap(
          alignment: WrapAlignment.end,
          spacing: 14,
          runSpacing: 4,
          children: [
            legendItem(tokens.moneyIncome, t.common.income),
            legendItem(tokens.moneyExpense, t.common.expenses),
            if (scheduled.isNotEmpty) ...[legendItem(warning, t.calendar.bill, dot: true), legendItem(scheme.primary, t.calendar.recurrence, dot: true)],
          ],
        ),
      ],
    );
  }
}
