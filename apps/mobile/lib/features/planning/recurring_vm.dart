import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/models.g.dart';
import '../../api/resources.dart';
import '../../format/formatter_provider.dart';
import '../../format/formatter.dart';
import '../../i18n/strings.g.dart';
import '../../state/preferences.dart';

/// What a recurrence moves, with the sign the ledger shows: income positive, expenses negative, transfers as they are.
double recurrenceAmount(RecurrenceRow r) => r.type == 'withdrawal' ? -r.amount : r.amount;

enum RecurrenceTone { income, expense, none }

RecurrenceTone recurrenceTone(String type) => type == 'deposit' ? RecurrenceTone.income : (type == 'withdrawal' ? RecurrenceTone.expense : RecurrenceTone.none);

final recurrencesReportProvider = reportProvider<RecurrencesReport>('reports/recurrences', RecurrencesReport.fromJson, global: false);

/// Firefly's recurring transactions: what repeats, how, and its next dates. Port of libs/client/src/features/planning/recurring.vm.ts.
class RecurrencesViewModel {
  RecurrencesViewModel({required this.res, required this.f, required this.t});

  final AsyncValue<RecurrencesReport> res;
  final Formatter f;
  final Translations t;

  RecurrencesReport? get r => res.valueOrNull;

  bool get initialLoading => res.isLoading && r == null;

  List<RecurrenceRow> get items => r?.recurrences ?? const [];

  String typeLabel(RecurrenceRow x) => switch (x.type) {
        'deposit' => t.txType.deposit,
        'withdrawal' => t.txType.withdrawal,
        _ => t.txType.transfer,
      };
}

final recurrencesViewModelProvider = Provider.autoDispose<RecurrencesViewModel>((ref) {
  ref.watch(preferencesProvider.select((p) => p.lang));
  return RecurrencesViewModel(res: ref.watch(recurrencesReportProvider), f: ref.watch(formatterProvider), t: t);
});
