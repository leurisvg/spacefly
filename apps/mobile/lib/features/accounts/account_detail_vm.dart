import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/api_client.dart';
import '../../api/models.g.dart';
import '../../api/resources.dart';
import '../../format/formatter.dart';
import '../../format/formatter_provider.dart';
import '../../i18n/strings.g.dart';
import '../../state/filters_store.dart';
import '../../state/preferences.dart';
import '../../state/tx_detail.dart';
import '../../ui/labels.dart';
import '../../ui_logic/pagination.dart';
import '../../ui_logic/text_table.dart';

const accountTabs = ['all', 'withdrawal', 'deposit', 'transfer'];

/// The record tab asked for, or "all". Port of `resolveAccountTab` in libs/client/src/features/accounts/account-detail.vm.ts.
String resolveAccountTab(String? param) => accountTabs.contains(param) ? param! : 'all';

/// How many records each tab holds.
Map<String, int> tabCounts(List<AccountTxRow> rows) => {
      'all': rows.length,
      'withdrawal': rows.where((x) => x.type == 'withdrawal').length,
      'deposit': rows.where((x) => x.type == 'deposit').length,
      'transfer': rows.where((x) => x.type == 'transfer').length,
    };

/// The records of a tab.
List<AccountTxRow> rowsForTab(List<AccountTxRow> rows, String tab) => tab == 'all'
    ? [...rows]
    : [
        for (final x in rows)
          if (x.type == tab) x
      ];

/// A day of the extremes: its date and the balance, in the display currency and in the account's own.
typedef AccountExtreme = ({String date, double balance, double balanceOriginal});

/// The biggest expense or income record, with its amount in the account's own currency.
typedef BiggestRecord = ({AccountTxRow tx, double amountOriginal});

class AccountStats {
  const AccountStats({required this.lowest, required this.highest, required this.avgDailyExpense, required this.avgDailyExpenseOriginal, required this.biggestExpense, required this.biggestIncome});
  final AccountExtreme? lowest;
  final AccountExtreme? highest;
  final double avgDailyExpense;
  final double avgDailyExpenseOriginal;
  final BiggestRecord? biggestExpense;
  final BiggestRecord? biggestIncome;
}

/// Lowest and highest balance of the period, the daily average spent, and the biggest expense and income record.
AccountStats accountStats(AccountDetailReport d) {
  final known = [
    for (final x in d.days)
      if (x.balance != null) x
  ];
  AccountExtreme? extreme(bool Function(double a, double b) pick) {
    AccountExtreme? best;
    for (final x in known) {
      if (best == null || pick(x.balance!, best.balance)) best = (date: x.date, balance: x.balance!, balanceOriginal: x.balanceOriginal ?? 0);
    }
    return best;
  }

  BiggestRecord? biggest(String type) {
    BiggestRecord? best;
    for (final x in d.rows.where((x) => x.type == type)) {
      if (best == null || x.amount > best.tx.amount) best = (tx: x, amountOriginal: x.flowOriginal.abs());
    }
    return best;
  }

  final days = known.isEmpty ? 1 : known.length;
  return AccountStats(
    lowest: extreme((a, b) => a < b),
    highest: extreme((a, b) => a > b),
    avgDailyExpense: d.totals.expense / days,
    avgDailyExpenseOriginal: d.totalsOriginal.expense / days,
    biggestExpense: biggest('withdrawal'),
    biggestIncome: biggest('deposit'),
  );
}

/// One calendar per month of the period. A foreign account is drawn in its own currency: bars, labels and tooltip.
List<({String month, List<CalendarDay> days})> accountCalendarMonths(List<AccountDay> days, {required bool foreign}) {
  final byMonth = <String, List<CalendarDay>>{};
  for (final d in days) {
    byMonth.putIfAbsent(d.date.substring(0, 7), () => []).add(
          foreign
              ? CalendarDay(balance: d.balanceOriginal, count: d.count, date: d.date, expense: d.expenseOriginal, income: d.incomeOriginal)
              : CalendarDay(balance: d.balance, count: d.count, date: d.date, expense: d.expense, income: d.income),
        );
  }
  return [for (final e in byMonth.entries) (month: e.key, days: e.value)];
}

/// The value that fills a calendar cell: the largest flow of a day, so every month is on the same scale.
double accountCalendarScale(List<AccountDay> days, {required bool foreign}) {
  var max = 1.0;
  for (final d in days) {
    final v = foreign ? (d.incomeOriginal > d.expenseOriginal ? d.incomeOriginal : d.expenseOriginal) : (d.income > d.expense ? d.income : d.expense);
    if (v > max) max = v;
  }
  return max;
}

/// The other side of the record: where the money came from or went to.
String counterpartyOf(AccountTxRow tx) => (tx.flow > 0 ? tx.source : tx.destination).name;

enum TxTone { expense, income, none }

TxTone txTone(AccountTxRow tx) => tx.type == 'withdrawal' ? TxTone.expense : (tx.type == 'deposit' ? TxTone.income : TxTone.none);

/// Only single-part expenses, income and transfers are edited in SpaceFly.
bool isEditableAccountTx(AccountTxRow tx) => tx.splitCount == 1 && (tx.type == 'withdrawal' || tx.type == 'deposit' || tx.type == 'transfer');

/// True once the screen has put its own period in place (the last 30 days): the request waits for it.
final filtersScopedProvider = Provider<bool>((ref) {
  ref.watch(filtersProvider);
  return ref.read(filtersProvider.notifier).scoped;
});

final accountDetailReportProvider = FutureProvider.autoDispose.family<AccountDetailReport, String>((ref, id) async {
  if (!ref.watch(filtersScopedProvider)) throw const PausedRequest();
  final response = await ref.watch(dioProvider).get<Object?>('/api/reports/accounts/${Uri.encodeComponent(id)}', queryParameters: ref.watch(filterQueryProvider));
  return unwrapReport(response.data, AccountDetailReport.fromJson);
});

final accountTabProvider = StateProvider.family<String, String>((ref, id) => 'all');

/// The page of records being shown.
final accountPageProvider = StateProvider.autoDispose.family<int, String>((ref, id) => 1);

/// One asset account: balance and flows per day, monthly trend, rankings and every record with its running balance.
/// Port of libs/client/src/features/accounts/account-detail.vm.ts.
class AccountDetailViewModel {
  AccountDetailViewModel({
    required this.id,
    required this.res,
    required this.tabName,
    required this.pageNumber,
    required this.displayCurrency,
    required this.f,
    required this.t,
    required this.detail,
    required this.setTabTo,
    required this.setPage,
  });

  final String id;
  final AsyncValue<AccountDetailReport> res;
  final String tabName;
  final int pageNumber;
  final String displayCurrency;
  final Formatter f;
  final Translations t;
  final TxDetailNotifier detail;
  final void Function(String tab) setTabTo;
  final void Function(int page) setPage;

  AccountDetailReport? get r => res.valueOrNull;

  bool get initialLoading => res.isLoading && r == null;

  String get tab => resolveAccountTab(tabName);

  Map<String, int> get counts => tabCounts(r?.rows ?? const []);

  List<AccountTxRow> get rows => rowsForTab(r?.rows ?? const [], tab);

  double get rowsTotal => rows.fold<double>(0, (sum, x) => sum + x.flow);

  int get pages => totalPages(rows.length);

  /// The page being shown, kept inside the pages there are.
  int get page => pageNumber.clamp(1, pages);

  List<AccountTxRow> get pageRows => pageSlice(rows, page);

  String? get subtitle {
    final a = r?.account;
    if (a == null) return null;
    return [if (a.role != null) accountRoleLabel(t, a.role), a.currency, if (a.iban != null && a.iban!.isNotEmpty) a.iban!, if (a.excluded) t.accounts.excluded].join(' · ');
  }

  AccountStats? get stats => r == null ? null : accountStats(r!);

  /// The account keeps its money in a currency other than the one being displayed.
  bool get foreign => r != null && r!.account.currency != displayCurrency;

  /// Currency the charts are drawn in: the account's own, when it isn't the one being displayed.
  String? get own => foreign ? r!.account.currency : null;

  /// More days than a phone can label without a hint.
  bool get zoomHint => (r?.days.length ?? 0) > 60;

  /// The days with a known balance, in the currency the charts use.
  List<({String date, double balance})> get balanceDays => [
        for (final d in r?.days ?? const <AccountDay>[])
          if (d.balance != null) (date: d.date, balance: foreign ? (d.balanceOriginal ?? 0) : d.balance!),
      ];

  List<({String month, List<CalendarDay> days})> get calendarMonths => accountCalendarMonths(r?.days ?? const [], foreign: foreign);

  double get calendarScale => accountCalendarScale(r?.days ?? const [], foreign: foreign);

  /// Months for the income/expense chart, in the currency the charts use.
  List<({String month, double income, double expense, double net})> get monthRows => [
        for (final m in r?.months ?? const <AccountMonth>[])
          (
            month: m.month,
            income: foreign ? m.incomeOriginal : m.income,
            expense: foreign ? m.expenseOriginal : m.expense,
            net: foreign ? m.incomeOriginal - m.expenseOriginal : m.income - m.expense,
          ),
      ];

  /// Expenses per weekday (Monday first), in the currency the charts use.
  List<double> get weekdayValues => foreign ? (r?.byWeekdayOriginal ?? const []) : (r?.byWeekday ?? const []);

  List<String> get weekdayLabels => f.weekdayNames();

  /// "≈ RD$600.00" under a figure shown in the account's own currency; nothing when it is already in the display currency.
  String? approx(double? converted) => foreign && converted != null ? '≈ ${f.money(converted)}' : null;

  /// The balance a month closes with, in the currency the charts use.
  double balanceOf(AccountMonth m) => foreign ? m.balanceOriginal : m.balance;

  /// "US$10.00 (≈ RD$600.00)" for a foreign account, the plain amount otherwise.
  String moneyPair(double? original, double? converted, {bool signed = false}) {
    final currency = own;
    if (currency == null || original == null) return f.money(converted, signed: signed);
    return '${f.money(original, currency: currency, signed: signed)} (≈ ${f.money(converted, signed: signed)})';
  }

  /// A ranked item with the name the screen writes: "Uncategorized" for the unnamed one.
  String rankName(RankedItem x) => x.name.isEmpty ? t.common.uncategorized : x.name;

  /// A ranked item's value in the currency the charts use.
  double rankValue(RankedItem x) => foreign ? (x.valueOriginal ?? x.value) : x.value;

  TextTable? get balanceTable => r == null
      ? null
      : TextTable(columns: [
          t.common.date,
          t.accounts.balance
        ], rows: [
          for (final x in r!.days)
            if (x.balance != null) [f.date(x.date, DateStyle.day), moneyPair(x.balanceOriginal, x.balance)]
        ]);

  TextTable? get flowTable => r == null
      ? null
      : TextTable(
          columns: [t.common.date, t.common.income, t.common.expenses, t.accounts.detail.transferIn, t.accounts.detail.transferOut],
          rows: [
            for (final x in r!.days)
              if (x.count > 0)
                [
                  f.date(x.date, DateStyle.day),
                  moneyPair(x.incomeOriginal, x.income),
                  moneyPair(x.expenseOriginal, x.expense),
                  moneyPair(x.transferInOriginal, x.transferIn),
                  moneyPair(x.transferOutOriginal, x.transferOut)
                ],
          ],
        );

  TextTable? get monthlyTable => r == null
      ? null
      : TextTable(
          columns: [t.common.month, t.common.income, t.common.expenses, t.common.net, t.accounts.detail.closingBalance],
          rows: [
            for (final m in r!.months)
              [
                f.date(m.month, DateStyle.month),
                moneyPair(m.incomeOriginal, m.income),
                moneyPair(m.expenseOriginal, m.expense),
                moneyPair(m.incomeOriginal - m.expenseOriginal, m.income - m.expense, signed: true),
                moneyPair(m.balanceOriginal, m.balance)
              ],
          ],
        );

  TextTable? get weekdayTable => r == null
      ? null
      : TextTable(columns: [
          t.common.date,
          t.common.expenses
        ], rows: [
          for (final (i, v) in r!.byWeekday.indexed) [weekdayLabels[i], moneyPair(r!.byWeekdayOriginal[i], v)]
        ]);

  TextTable rankTable(List<RankedItem> items) => TextTable(columns: [
        t.common.account,
        t.tx.count,
        t.common.total
      ], rows: [
        for (final x in items) [rankName(x), x.count.toInt().toString(), moneyPair(x.valueOriginal, x.value)]
      ]);

  String counterparty(AccountTxRow tx) => counterpartyOf(tx);

  TxTone tone(AccountTxRow tx) => txTone(tx);

  bool editable(AccountTxRow tx) => isEditableAccountTx(tx);

  void setTab(String next) => setTabTo(next);

  void openDay(String date) => detail.open(f.date(date, DateStyle.full), {'start': date, 'end': date, 'account': id});
}

final accountDetailViewModelProvider = Provider.autoDispose.family<AccountDetailViewModel, String>((ref, id) {
  ref.watch(preferencesProvider.select((p) => p.lang));
  final tabs = ref.read(accountTabProvider(id).notifier);
  final page = ref.read(accountPageProvider(id).notifier);
  // Back to the first page when the tab, the account or the period changes.
  ref.listen(accountDetailReportProvider(id), (_, __) => page.state = 1);
  ref.listen(accountTabProvider(id), (_, __) => page.state = 1);
  return AccountDetailViewModel(
    id: id,
    res: ref.watch(accountDetailReportProvider(id)),
    tabName: ref.watch(accountTabProvider(id)),
    pageNumber: ref.watch(accountPageProvider(id)),
    displayCurrency: ref.watch(currencyProvider),
    f: ref.watch(formatterProvider),
    t: t,
    detail: ref.read(txDetailProvider.notifier),
    setTabTo: (tab) => tabs.state = tab,
    setPage: (p) => page.state = p,
  );
});
