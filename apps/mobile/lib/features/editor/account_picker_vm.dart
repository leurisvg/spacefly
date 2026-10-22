import '../../api/models.g.dart' hide Ref, AccountInput;
import '../../format/formatter.dart';
import '../../i18n/strings.g.dart';
import '../../shared/tx_type.dart';

/// A picked side of a transaction: an existing account by id, or a name that doesn't exist yet (Firefly creates it).
class AccountInput {
  const AccountInput.id(String this.id) : name = null;
  const AccountInput.name(String this.name) : id = null;

  final String? id;
  final String? name;

  bool get isCreated => name != null;

  /// What a picker control holds: the id, or the typed name.
  String get comboValue => id ?? name!;

  Map<String, String> toJson() => id != null ? {'id': id!} : {'name': name!};

  @override
  bool operator ==(Object other) => other is AccountInput && other.id == id && other.name == name;

  @override
  int get hashCode => Object.hash(id, name);

  @override
  String toString() => id != null ? 'AccountInput.id($id)' : 'AccountInput.name($name)';
}

const _sourceGroups = [AccountKind.ASSET, AccountKind.LIABILITY, AccountKind.REVENUE, AccountKind.CASH];
const _destinationGroups = [AccountKind.ASSET, AccountKind.LIABILITY, AccountKind.EXPENSE, AccountKind.CASH];

/// Kinds whose balance means something to the person paying from them.
const _withBalance = [AccountKind.ASSET, AccountKind.LIABILITY, AccountKind.CASH];

enum AccountSide { source, destination }

class AccountOption {
  const AccountOption({required this.value, required this.label, required this.group, required this.hint, required this.hintNegative, required this.invalid});

  final String value;
  final String label;
  final String group;

  /// The balance (as a source) or the currency.
  final String hint;
  final bool hintNegative;

  /// Can't be combined with the account on the other side.
  final bool invalid;
}

/// Is [slot] allowed on [side] next to the account of kind [other] on the other side?
bool slotFits(AccountSide side, AccountSlot? other, AccountSlot? slot) {
  if (other == null) return true;
  return (side == AccountSide.source ? inferTransactionType(slot, other) : inferTransactionType(other, slot)) != null;
}

String accountGroupLabel(Translations t, AccountKind kind) => switch (kind) {
      AccountKind.ASSET => t.forms.accountGroups.asset,
      AccountKind.LIABILITY => t.forms.accountGroups.liability,
      AccountKind.EXPENSE => t.forms.accountGroups.expense,
      AccountKind.REVENUE => t.forms.accountGroups.revenue,
      AccountKind.CASH => t.forms.accountGroups.cash,
    };

/// Account chooser for one side of a transaction: accounts grouped by the kinds that make sense for that side, options that can't be
/// combined with the other side's account marked as not valid, and (as a source) each account's balance.
/// Port of libs/client/src/features/editor/account-picker.vm.ts.
class AccountPicker {
  AccountPicker({required this.value, required this.accounts, required this.side, required this.other, required this.f, required this.t});

  final AccountInput? value;
  final List<EditorAccount> accounts;
  final AccountSide side;
  final AccountSlot? other;
  final Formatter f;
  final Translations t;

  ({String text, bool negative})? _balanceOf(EditorAccount a) =>
      side != AccountSide.source || !_withBalance.contains(a.kind) ? null : (text: f.money(a.balance, currency: a.currency), negative: a.balance < 0);

  /// The balance of the selected account, when it is shown.
  ({String text, bool negative})? get selectedBalance {
    final id = value?.id;
    final account = id == null ? null : accounts.where((a) => a.id == id).firstOrNull;
    return account == null ? null : _balanceOf(account);
  }

  List<AccountOption> get options {
    final groups = side == AccountSide.source ? _sourceGroups : _destinationGroups;
    return [
      for (final kind in groups)
        for (final a in accounts.where((a) => a.kind == kind))
          AccountOption(
            value: a.id,
            label: a.name,
            group: accountGroupLabel(t, kind),
            hint: _balanceOf(a)?.text ?? a.currency,
            hintNegative: _balanceOf(a)?.negative ?? false,
            invalid: !slotFits(side, other, slotOfKind(kind)),
          ),
    ];
  }

  /// Can a typed name that doesn't exist be offered as a new account on this side?
  bool get createInvalid => !slotFits(side, other, AccountSlot.NEW);

  String createLabel(String name) => side == AccountSide.destination ? t.forms.account.newExpense(name: name) : t.forms.account.newRevenue(name: name);

  /// The picker emitted a selection: an existing account id, a typed new name, or nothing.
  static AccountInput? select(String value, {bool created = false}) => value.isEmpty ? null : (created ? AccountInput.name(value) : AccountInput.id(value));
}
