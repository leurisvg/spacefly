import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/models.g.dart' hide Period, PeriodPreset, Ref;
import '../../api/resources.dart';
import '../../format/formatter.dart';
import '../../format/formatter_provider.dart';
import '../../i18n/strings.g.dart';
import '../../shared/dates.dart';
import '../../state/filters_store.dart';
import '../../state/preferences.dart';
import '../../state/tx_detail.dart';
import '../dashboard/dashboard_vm.dart' show TextTable;

/// How many subscriptions the cost ranking draws.
const billsRanked = 12;

/// The tone of a subscription's status: paid is good, pending needs attention, the rest is quiet.
enum BillTone { good, warning, muted }

BillTone billStatusTone(Status status) => switch (status) {
      Status.PAID => BillTone.good,
      Status.PENDING => BillTone.warning,
      Status.NOT_EXPECTED => BillTone.muted,
    };

/// The active subscriptions that cost something per year, the most expensive first.
List<BillRow> rankedBills(List<BillRow> bills) => [for (final b in bills) if (b.active && b.yearlyEquivalent > 0) b]..sort((a, b) => b.yearlyEquivalent.compareTo(a.yearlyEquivalent));

/// The last 12 months up to [end]: the range a yearly estimate is checked against.
Period lastTwelveMonths(String end) => Period(addDays(addMonths(end, -12), 1), end);

final billsReportProvider = reportProvider<BillsReport>('reports/bills', BillsReport.fromJson);

/// Subscriptions: what they cost per month and year, which are paid this period, and the cost ranking.
/// Port of libs/client/src/features/planning/bills.vm.ts.
class BillsViewModel {
  BillsViewModel({required this.res, required this.f, required this.t, required this.detail, required this.period, required this.today});

  final AsyncValue<BillsReport> res;
  final Formatter f;
  final Translations t;
  final TxDetailNotifier detail;
  final Period period;
  final String today;

  BillsReport? get r => res.valueOrNull;

  bool get initialLoading => res.isLoading && r == null;

  List<BillRow> get active => rankedBills(r?.bills ?? const []);

  /// The subscriptions the ranking draws, the most expensive first.
  List<BillRow> get ranked => active.take(billsRanked).toList();

  TextTable get table => TextTable(columns: [t.bills.name, t.bills.monthlyEq, t.bills.yearly], rows: [for (final b in active) [b.name, f.money(b.monthlyEquivalent), f.money(b.yearlyEquivalent)]]);

  String frequency(BillRow b) => switch (b.repeatFreq) {
        'weekly' => t.bills.freq.weekly,
        'monthly' => t.bills.freq.monthly,
        'quarterly' => t.bills.freq.quarterly,
        'half-year' => t.bills.freq.halfYear,
        _ => t.bills.freq.yearly,
      };

  String statusLabel(BillRow b) => switch (b.status) {
        Status.PAID => t.bills.statuses.paid,
        Status.PENDING => t.bills.statuses.pending,
        Status.NOT_EXPECTED => t.bills.statuses.notExpected,
      };

  /// The transactions paid to a subscription in the period.
  void open(BillRow b) => detail.open(b.name, {'bill': b.id});

  /// The transactions of a subscription over the last 12 months, switchable to the selected period: a ranking bar is a yearly estimate.
  void openYear(BillRow b) {
    final year = lastTwelveMonths(today);
    detail.open(
      b.name,
      {'bill': b.id, 'start': year.start, 'end': year.end},
      ranges: [TxRange(label: t.bills.last12Months, start: year.start, end: year.end), TxRange(label: t.bills.selectedPeriod, start: period.start, end: period.end)],
    );
  }

  /// A bar of the ranking, top first as the phone draws them.
  bool openBar(int index) {
    final list = ranked;
    if (index < 0 || index >= list.length) return false;
    openYear(list[index]);
    return true;
  }

  String get createRoute => '/edit/bill';

  String editRoute(BillRow b) => '/edit/bill/${Uri.encodeComponent(b.id)}';
}

final billsViewModelProvider = Provider.autoDispose<BillsViewModel>((ref) {
  ref.watch(preferencesProvider.select((p) => p.lang));
  return BillsViewModel(
    res: ref.watch(billsReportProvider),
    f: ref.watch(formatterProvider),
    t: t,
    detail: ref.read(txDetailProvider.notifier),
    period: ref.watch(filtersProvider.select((s) => s.period)),
    today: todayIso(ref.read(clockProvider)()),
  );
});
