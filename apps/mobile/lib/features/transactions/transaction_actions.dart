import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/write_api.dart';
import '../../i18n/strings.g.dart';
import '../../platform/platform.dart';

/// Deleting a stored transaction, after asking. Port of `remove` in tx-view.vm.ts and explorer.vm.ts.
class TransactionActions {
  TransactionActions(this._ref);

  final Ref _ref;

  /// Asks, deletes, tells the user and (when [thenGoBack]) leaves the screen. `true` when it was deleted; a declined question is not an error.
  Future<bool> remove({required String groupId, required String name, int splitCount = 1, bool thenGoBack = true}) async {
    final ok = await _ref.read(confirmProvider).confirm(Confirmation(
          title: t.editor.tx.deleteTitle,
          message: splitCount > 1 ? t.editor.tx.deleteMessageSplits(name: name) : t.editor.tx.deleteMessage(name: name),
          confirmLabel: t.forms.delete,
          destructive: true,
        ));
    if (!ok) return false;
    try {
      await _ref.read(writeApiProvider).deleteTransaction(groupId); // refreshes the lists on success
      _ref.read(toastProvider).success(t.editor.tx.deleted);
      if (thenGoBack) _ref.read(backNavigationProvider).back('/transactions');
      return true;
    } catch (_) {
      _ref.read(toastProvider).error(t.errors.generic);
      return false;
    }
  }
}

final transactionActionsProvider = Provider<TransactionActions>(TransactionActions.new);
