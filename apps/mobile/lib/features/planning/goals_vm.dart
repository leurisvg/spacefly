import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/models.g.dart';
import '../../api/resources.dart';
import '../../format/formatter.dart';
import '../../format/formatter_provider.dart';
import '../../i18n/strings.g.dart';
import '../../state/preferences.dart';

/// How far along a goal is, 0–100; nothing in privacy mode, where the bar would give the ratio away.
double goalProgress(double? pct, {required bool hidden}) => hidden ? 0 : ((pct ?? 0) * 100).clamp(0, 100).toDouble();

enum GoalTone { good, warning }

/// Whether a goal is on track: `null` when it has no target date to be on track for.
GoalTone? goalTone(PiggyBankRow p) => p.onTrack == null ? null : (p.onTrack! ? GoalTone.good : GoalTone.warning);

final goalsReportProvider = reportProvider<PiggyBanksReport>('reports/piggy-banks', PiggyBanksReport.fromJson, global: false);

/// Goals (piggy banks): what is set aside, the pace, and whether each is on track. Port of libs/client/src/features/planning/goals.vm.ts.
class GoalsViewModel {
  GoalsViewModel({required this.res, required this.f, required this.t});

  final AsyncValue<PiggyBanksReport> res;
  final Formatter f;
  final Translations t;

  PiggyBanksReport? get r => res.valueOrNull;

  bool get initialLoading => res.isLoading && r == null;

  List<PiggyBankRow> get items => r?.piggyBanks ?? const [];

  double progress(PiggyBankRow p) => goalProgress(p.pct, hidden: f.hidden);

  String get createRoute => '/edit/piggy';

  String editRoute(PiggyBankRow p) => '/edit/piggy/${Uri.encodeComponent(p.id)}';
}

final goalsViewModelProvider = Provider.autoDispose<GoalsViewModel>((ref) {
  ref.watch(preferencesProvider.select((p) => p.lang));
  return GoalsViewModel(res: ref.watch(goalsReportProvider), f: ref.watch(formatterProvider), t: t);
});
