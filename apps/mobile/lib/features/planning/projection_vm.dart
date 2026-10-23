import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/models.g.dart';
import '../../api/resources.dart';
import '../../format/formatter.dart';
import '../../format/formatter_provider.dart';
import '../../i18n/strings.g.dart';
import '../../state/preferences.dart';
import '../dashboard/dashboard_vm.dart' show TextTable;

/// How far ahead the projection can look (days).
const projectionDays = ['30', '60', '90', '180'];

/// The horizon asked for, or 90.
String resolveProjectionDays(String? param) => projectionDays.contains(param) ? param! : '90';

/// What happens on a day of the projection.
List<ProjectionEvent> eventsOn(List<ProjectionEvent> events, String date) => [for (final e in events) if (e.date == date) e];

final projectionDaysProvider = StateProvider.autoDispose<String>((ref) => '90');

final projectionReportProvider = reportProvider<ProjectionReport>('reports/projection', ProjectionReport.fromJson, global: false, extra: (ref) => {'days': resolveProjectionDays(ref.watch(projectionDaysProvider))});

/// Cash-flow projection: today's balance carried forward with the subscriptions and recurring transactions that are due.
/// Port of libs/client/src/features/planning/projection.vm.ts.
class ProjectionViewModel {
  ProjectionViewModel({required this.res, required this.days, required this.f, required this.t, required this.setDaysTo});

  final AsyncValue<ProjectionReport> res;
  final String days;
  final Formatter f;
  final Translations t;
  final void Function(String days) setDaysTo;

  ProjectionReport? get r => res.valueOrNull;

  bool get initialLoading => res.isLoading && r == null;

  String get lowestLabel {
    final l = r?.lowest;
    return l == null ? '' : t.projection.lowest(amount: f.money(l.balance), date: f.date(l.date, DateStyle.long));
  }

  TextTable? get table => r == null
      ? null
      : TextTable(
          columns: [t.common.date, t.projection.inflow, t.projection.outflow, t.calendar.balance],
          rows: [for (final d in r!.days) if (d.inflow != 0 || d.outflow != 0) [f.date(d.date, DateStyle.day), f.money(d.inflow), f.money(d.outflow), f.money(d.balance)]],
        );

  void setDays(String next) => setDaysTo(next);
}

final projectionViewModelProvider = Provider.autoDispose<ProjectionViewModel>((ref) {
  ref.watch(preferencesProvider.select((p) => p.lang));
  final days = ref.read(projectionDaysProvider.notifier);
  return ProjectionViewModel(res: ref.watch(projectionReportProvider), days: resolveProjectionDays(ref.watch(projectionDaysProvider)), f: ref.watch(formatterProvider), t: t, setDaysTo: (d) => days.state = d);
});
